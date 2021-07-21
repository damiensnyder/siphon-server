const Settings = require('./room-manager').Settings;
// @ts-ignore
const GameState = require('./gamestate').GameState;
// @ts-ignore
const Viewer = require('./viewer').Viewer;

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

// @ts-ignore
class GameRoom {
  settings: typeof Settings;
  viewers: typeof Viewer[];
  players: typeof Viewer[];
  gs: typeof GameState;
  handlingAction: boolean;
  private actionQueue: any[];
  private readonly gmCallback: any;
  private io: any;
  private teardownTimer: NodeJS.Timeout;
  private readonly handlers: any;

  constructor(io, settings, callback) {
    this.io = io.of('/game/' + settings.gameCode);
    this.settings = settings;
    this.gs = new GameState(settings);
    this.gmCallback = callback;

    this.viewers = [];
    this.players = [];

    this.io.on('connection', (socket) => {
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
    this.teardownTimer = setTimeout(() => {this.gmCallback(this)},
        TEARDOWN_TIME);
  }

  // Sends actions to a queue that can be handled one at a time so they don't
  // interfere with each other.
  enqueueAction(viewer: typeof Viewer, type: string, data: any): void {
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
  handleAction(): void {
    const action = this.actionQueue[0];
    this.handlers[action.type](action.viewer, action.data);

    clearTimeout(this.teardownTimer);
    this.teardownTimer = setTimeout(() => {this.gmCallback(this)},
        TEARDOWN_TIME);

    this.actionQueue.splice(0, 1);
    if (this.actionQueue.length > 0) {
      this.handleAction();
    } else {
      this.handlingAction = false;
    }
  }

  handleConnect(viewer: typeof Viewer): void {
    this.viewers.push(viewer);
    viewer.socket.emit('msg', {
      sender: 'Game',
      text: "Connected to chat.",
      isSelf: false,
      isSystem: true
    });
    if (this.gs.started) {
      viewer.begin();
    }
    viewer.emitGameState(this.gs);
  }

  // Add the player to the game, unless their party name or abbreviation are
  // already taken.
  handleJoin(viewer: typeof Viewer, partyInfo: PartyInfo): void {
    let nameAndAbbrAreUnique = true;
    this.gs.parties.forEach((party) => {
      if (party.name == partyInfo.name || party.abbr == partyInfo.abbr) {
        nameAndAbbrAreUnique = false;
      }
    });
    if (nameAndAbbrAreUnique) {
      viewer.join(this.players.length, partyInfo.name);
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

  handleReplace(viewer: typeof Viewer, target: number): void {
    this.io.emit('newreplace', target);
    if (this.gs.started && !this.gs.parties[target].connected) {
      viewer.join(target, this.gs.parties[target].name);
      this.players.splice(target, 0, viewer);
      this.gs.parties[target].connected = true;
      viewer.emitGameState(this.gs);

      this.broadcastSystemMsg(
        viewer.socket,
        `Player '${this.gs.parties[target].name}' has been replaced.`
      );
    }
  }

  handleOffer(viewer: typeof Viewer, offerInfo: OfferInfo): void {
    if (this.gs.offer(viewer.pov, offerInfo)) {
      offerInfo.fromParty = viewer.pov;
      this.players[offerInfo.target].socket.emit('newoffer', offerInfo);
    }
  }

  handleReady(viewer: typeof Viewer, isReady: boolean): void {
    this.gs.parties[viewer.pov].ready = isReady;
    viewer.socket.broadcast.emit('newready', {
      party: viewer.pov,
      isReady: isReady
    });
    if (this.gs.allReady()) {
      if (this.gs.ended) {
        this.rematch();
      } else if (!this.gs.started) {
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

  handleMsg(viewer: typeof Viewer, msg: string): void {
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

  rematch(): void {
    this.players.forEach((player) => {player.reset()});
    this.gs = new GameState(this.settings);
    this.players = [];
    this.actionQueue = [];
    this.emitGameStateToAll();
  }

  // When a player disconnects, remove them from the list of viewers, fix the
  // viewer indices of all other viewers, and remove them from the game.
  handleDisconnect(viewer: typeof Viewer): void {
    let index: number = this.viewers.indexOf(viewer);
    this.viewers.splice(index, 1);

    if (viewer.pov !== undefined) {
      this.gs.parties[viewer.pov].ready = false;
      this.removePlayer(viewer.pov);
    }
  }

  // If the game hasn't started, remove the player with the given POV from the
  // game.
  removePlayer(pov: number): void {
    const name: string = this.gs.parties[pov].name;
    this.players.splice(pov, 1);
    if (!this.gs.started) {
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

  joinInfo() {
    return {
      name: this.settings.name,
      roomCode: this.settings.roomCode,
      players: this.players.length,
      started: this.gs.started,
      ended: this.gs.ended
    };
  }
}

module.exports = GameRoom;
