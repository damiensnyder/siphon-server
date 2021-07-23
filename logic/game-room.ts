import SocketIo, {Socket} from "socket.io";

import {RoomSettings} from "./room-manager";
import GameState from "./gamestate";
import Viewer from "./viewer";

const TEARDOWN_TIME: number = 3600000;

interface PartyInfo {
  name: string,
  abbr: string
}

interface OfferInfo {
  target: number,
  amount: number,
  fromParty?: number
}

export interface JoinInfo {
  name: string,
  roomCode: string,
  players: number,
  hasStarted: boolean,
  hasEnded: boolean
}

export default class GameRoom {
  roomSettings: RoomSettings;
  viewers: Viewer[];
  players: Viewer[];
  gs: GameState;
  handlingAction: boolean;
  private actionQueue: any[];
  private readonly teardownCallback: (GameRoom) => void;
  private readonly io: SocketIo;
  private teardownTimer: NodeJS.Timeout;
  private readonly handlers: any;

  constructor(io: SocketIo,
              roomSettings: RoomSettings,
              teardownCallback: (GameRoom) => void) {
    this.io = io.of('/game/' + roomSettings.roomCode);
    this.roomSettings = roomSettings;
    this.gs = new GameState(roomSettings);
    this.teardownCallback = teardownCallback;

    this.viewers = [];
    this.players = [];

    this.io.on('connection', (socket: Socket) => {
      const viewer = new Viewer(socket, this.enqueueAction);
      this.enqueueAction(viewer, 'connect', null);
    });

    this.handlers = {
      'connect': this.handleConnect.bind(this),
      'join': this.handleJoin.bind(this),
      'replace': this.handleReplace.bind(this),
      'ready': this.handleReady.bind(this),
      'offer': this.handleOffer.bind(this),
      'msg': this.handleMsg.bind(this),
      'disconnect': this.handleDisconnect.bind(this)
    }
    this.actionQueue = [];
    this.handlingAction = false;
    this.enqueueAction = this.enqueueAction.bind(this);
    this.teardownTimer = setTimeout(() => {this.teardownCallback(this)},
        TEARDOWN_TIME);
  }

  // Sends actions to a queue that can be handled one at a time so they don't
  // interfere with each other.
  enqueueAction(viewer: Viewer, type: string, data: any): void {
    this.actionQueue.push({
      viewer: viewer,
      type: type,
      data: data
    });

    if (!this.handlingAction) {
      this.handlingAction = true;
      this.handleAction();
    }
  }

  // Handle the first action in the queue. If there are no more actions in the
  // queue, show that it is done. Otherwise, handle the next action.
  handleAction() {
    const action = this.actionQueue[0];
    this.handlers[action.type](action.viewer, action.data);

    clearTimeout(this.teardownTimer);
    this.teardownTimer = setTimeout(() => {this.teardownCallback(this)},
        TEARDOWN_TIME);

    this.actionQueue.splice(0, 1);
    if (this.actionQueue.length > 0) {
      this.handleAction();
    } else {
      this.handlingAction = false;
    }
  }

  handleConnect(viewer: Viewer) {
    this.viewers.push(viewer);
    viewer.socket.emit('msg', {
      sender: 'Game',
      text: "Connected to chat.",
      isSelf: false,
      isSystem: true
    });
    if (this.gs.hasStarted) {
      viewer.begin();
    }
    viewer.emitGameState(this.gs);
  }

  // Add the player to the game, unless their party name or abbreviation are
  // already taken.
  handleJoin(viewer: Viewer, partyInfo: PartyInfo) {
    let nameAndAbbrAreUnique = true;
    this.gs.parties.forEach((party) => {
      if (party.name == partyInfo.name || party.abbr == partyInfo.abbr) {
        nameAndAbbrAreUnique = false;
      }
    });
    if (nameAndAbbrAreUnique) {
      viewer.join(this.players.length);
      this.players.push(viewer);
      this.gs.addParty(partyInfo.name, partyInfo.abbr);

      this.broadcastSystemMsg(
        viewer.socket,
        `Player '${partyInfo.name}' (${partyInfo.abbr}) has joined the game.`
      );
      this.emitGameStateToAll();
    } else {
      viewer.emitGameState(this.gs);
    }
  }

  handleReplace(viewer: Viewer, replacedPov: number) {
    this.io.emit('newreplace', replacedPov);
    if (this.gs.hasStarted && !this.gs.parties[replacedPov].connected) {
      viewer.join(replacedPov);
      this.players.splice(replacedPov, 0, viewer);
      this.gs.parties[replacedPov].connected = true;
      viewer.emitGameState(this.gs);

      this.broadcastSystemMsg(
        viewer.socket,
        `Player '${this.gs.parties[replacedPov].name}' has been replaced.`
      );
    }
  }

  handleOffer(viewer: Viewer, offerInfo: OfferInfo): void {
    if (this.gs.offer(viewer.pov, offerInfo)) {
      offerInfo.fromParty = viewer.pov;
      this.players[offerInfo.target].socket.emit('newoffer', offerInfo);
    }
  }

  handleReady(viewer: Viewer, isReady: boolean): void {
    this.gs.parties[viewer.pov].ready = isReady;
    viewer.socket.broadcast.emit('newready', {
      party: viewer.pov,
      isReady: isReady
    });
    if (this.gs.allReady()) {
      if (this.gs.hasEnded) {
        this.rematch();
      } else if (!this.gs.hasStarted) {
        for (let i = 0; i < this.viewers.length; i++) {
          this.viewers[i].begin();
        }
        this.gs.commitAll();
      } else {
        this.executeAllActions();
        this.gs.commitAll();
      }
      this.emitGameStateToAll();
    }
  }

  handleMsg(viewer: Viewer, msg: string): void {
    if (typeof(msg) == 'string' &&
        msg.trim().length > 0 &&
        viewer.pov !== undefined) {
      viewer.socket.broadcast.emit('msg', {
        sender: this.gs.parties[viewer.pov].name,
        text: msg.trim(),
        isSelf: false,
        isSystem: false
      });
    }
  }

  executeAllActions(): void {
    if (this.gs.stage >= 2) {
      this.players.forEach((player, playerIndex) => {
        player.actionQueue.flipQueue.forEach((action) => {
          this.gs.flip(playerIndex, action);
        });
      });
    }

    if (this.gs.stage <= 2) {
      this.players.forEach((player, playerIndex) => {
        player.actionQueue.hitQueue.forEach((action) => {
          this.gs.hit(playerIndex, action);
        });
      });
    }

    if (this.gs.stage === 1) {
      // Execute all bribes and ads first, then smears, so player ordering
      // doesn't affect which smears get executed.
      this.players.forEach((player, playerIndex) => {
        player.actionQueue.bribeQueue.forEach((action) => {
          this.gs.bribe(playerIndex, action);
        });
        player.actionQueue.adQueue.forEach((action) => {
          this.gs.ad(playerIndex, action);
        });
      });
      this.gs.resetAdsBought(true);
      this.players.forEach((player, playerIndex) => {
        player.actionQueue.smearQueue.forEach((action) => {
          this.gs.smear(playerIndex, action);
        });
        this.gs.resetAdsBought(false);
      });
    } else if (this.gs.stage === 2) {
      this.players.forEach((player, playerIndex) => {
        player.actionQueue.voteQueue.forEach((action) => {
          this.gs.vote(playerIndex, action);
        });
      });
    } else {
      this.players.forEach((player, playerIndex) => {
        this.gs.choose(playerIndex, player.actionQueue.pmChoice);
      });
    }
  }

  rematch() {
    this.players.forEach((player) => {player.reset()});
    this.gs = new GameState(this.roomSettings);
    this.players = [];
    this.actionQueue = [];
    this.emitGameStateToAll();
  }

  // When a player disconnects, remove them from the list of viewers, fix the
  // viewer indices of all other viewers, and remove them from the game.
  handleDisconnect(viewer: Viewer): void {
    let index: number = this.viewers.indexOf(viewer);
    this.viewers.splice(index, 1);

    if (viewer.pov !== undefined) {
      this.gs.parties[viewer.pov].ready = false;
      this.removePlayer(viewer.pov);
    }
  }

  // If the game hasn't hasStarted, remove the player with the given POV from the
  // game.
  removePlayer(pov: number): void {
    const name: string = this.gs.parties[pov].name;
    this.players.splice(pov, 1);
    if (!this.gs.hasStarted) {
      this.gs.parties.splice(pov, 1);
      for (let i = pov; i < this.players.length; i++) {
        this.players[i].pov = i;
      }
      this.emitGameStateToAll();
    } else {
      this.gs.parties[pov].connected = false;
      this.io.emit('newdisconnect', pov);
    }

    this.emitSystemMsg(`Player '${name}' has disconnected.`);
  }

  // Broadcast a system message to all sockets except the one passed in.
  broadcastSystemMsg(socket, msg: string): void {
    socket.broadcast.emit('msg', {
      sender: 'Game',
      text: msg,
      isSelf: false,
      isSystem: true
    });
  }

  // Send a system message to all sockets.
  emitSystemMsg(msg: string): void {
    this.io.emit('msg', {
      sender: 'Game',
      text: msg,
      isSelf: false,
      isSystem: true
    });
  }

  // Emit the current game state to all viewers.
  emitGameStateToAll(): void {
    this.viewers.forEach((viewer) => {viewer.emitGameState(this.gs)});
  }

  joinInfo(): JoinInfo {
    return {
      name: this.roomSettings.name,
      roomCode: this.roomSettings.roomCode,
      players: this.players.length,
      hasStarted: this.gs.hasStarted,
      hasEnded: this.gs.hasEnded
    };
  }
}
