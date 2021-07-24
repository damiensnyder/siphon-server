import SocketIo, {Socket} from "socket.io";

import {GameplaySettings, RoomSettings} from "./room-manager";
import GameState, {GameStatus} from "./gamestate";
import Viewer from "./viewer";

const TEARDOWN_TIME: number = 3600000;

export interface RoomInfo {
  name: string,
  roomCode: string,
  players: number,
  gameStatus: GameStatus,
  gameplaySettings: GameplaySettings
}

interface ActionInfo {
  viewer: Viewer,
  type: string,
  data?: unknown
}

export interface JoinInfo {
  name: string
}

type TeardownCallback = (gameRoom: GameRoom) => void

export default class GameRoom {
  roomSettings: RoomSettings;
  viewers: Viewer[];
  players: Viewer[];
  gs: GameState;
  handlingAction: boolean;
  private actionQueue: ActionInfo[];
  private readonly teardownCallback: TeardownCallback;
  private readonly io: SocketIo;
  private teardownTimer: NodeJS.Timeout;
  private readonly handlers: {
    [key: string]: (viewer: Viewer, data: unknown) => void
  };

  constructor(io: SocketIo,
              roomSettings: RoomSettings,
              teardownCallback: TeardownCallback) {
    this.io = io.of(`/game/${roomSettings.roomCode}`);
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
      'gameAction': this.handleGameAction.bind(this),
      'msg': this.handleMsg.bind(this),
      'disconnect': this.handleDisconnect.bind(this)
    }
    this.actionQueue = [];
    this.handlingAction = false;
    this.enqueueAction = this.enqueueAction.bind(this);
    this.teardownTimer = setTimeout(
        () => {this.teardownCallback(this)},
        TEARDOWN_TIME);
  }

  // Sends actions to a queue that can be handled one at a time so they don't
  // interfere with each other.
  enqueueAction(viewer: Viewer, actionType: string, data?: unknown) {
    this.actionQueue.push({
      viewer: viewer,
      type: actionType,
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
      sender: "Game",
      text: "Connected to chat.",
      isSelf: false,
      isSystem: true
    });
    if (this.gs.gameStatus === GameStatus.midgame) {
      viewer.beginGame();
    }
    viewer.emitGameState(this.gs.generateViewpoint());
  }

  // Add the player to the game, unless their join info is invalid.
  handleJoin(viewer: Viewer, joinInfo: JoinInfo) {
    if (this.gs.isValidJoinInfo(joinInfo)) {
      viewer.joinGame(this.players.length);
      this.players.push(viewer);
      this.gs.addPlayer(joinInfo);

      this.broadcastSystemMsg(
        viewer.socket,
        `Player '${joinInfo.name}' has joined the game.`
      );
      this.emitGameStateToAll();
    } else {
      viewer.emitGameState(this.gs.generateViewpoint(viewer.pov));
    }
  }

  handleReplace(viewer: Viewer, replacedPov: number) {
    this.io.emit('newreplace', replacedPov);
    if (this.gs.gameStatus === GameStatus.pregame &&
        !this.gs.players[replacedPov].isConnected) {
      viewer.joinGame(replacedPov);
      this.players.splice(replacedPov, 0, viewer);
      this.gs.players[replacedPov].isConnected = true;
      viewer.emitGameState(this.gs.generateViewpoint(replacedPov));

      this.broadcastSystemMsg(
        viewer.socket,
        `Player '${this.gs.players[replacedPov].name}' has been replaced.`
      );
    }
  }

  handleGameAction(viewer: Viewer, actionInfo: unknown): void {
    this.gs.handleGameAction(viewer.pov, actionInfo);
    if (this.gs.gameStatus === GameStatus.postgame) {
      this.viewers.forEach((viewer) => viewer.endGame());
    }
    this.emitGameStateToAll();
  }

  handleReady(viewer: Viewer, isReady: unknown): void {
    if (typeof(isReady) === "boolean") {
      this.gs.players[viewer.pov].isReady = isReady;
      viewer.socket.broadcast.emit('newready', {
        player: viewer.pov,
        isReady: isReady
      });
      if (this.gs.allPlayersAreReady()) {
        if (this.gs.gameStatus === GameStatus.pregame) {
          this.viewers.forEach((viewer) => viewer.beginGame());
          this.gs.beginGame();
          this.emitGameStateToAll();
        } else if (this.gs.gameStatus === GameStatus.postgame) {
          this.resetGame();
          this.emitGameStateToAll();
        }
      }
    }
  }

  handleMsg(viewer: Viewer, msg: string): void {
    if (typeof(msg) === "string" &&
        msg.trim().length > 0 &&
        viewer.pov !== undefined) {
      viewer.socket.broadcast.emit('msg', {
        sender: this.gs.players[viewer.pov].name,
        text: msg.trim(),
        isSelf: false,
        isSystem: false
      });
    }
  }

  resetGame() {
    this.players.forEach((player) => {player.resetGame()});
    this.gs.resetGame();
    this.actionQueue = [];
    this.emitGameStateToAll();
  }

  // When a player disconnects, remove them from the list of viewers, fix the
  // viewer indices of all other viewers, and remove them from the game.
  handleDisconnect(viewer: Viewer) {
    let index: number = this.viewers.indexOf(viewer);
    this.viewers.splice(index, 1);

    if (viewer.pov !== undefined) {
      this.gs.players[viewer.pov].isReady = false;
      this.removePlayer(viewer.pov);
    }
  }

  // If the game hasn't started, remove the player with the given POV from the
  // game.
  removePlayer(pov: number) {
    const name: string = this.gs.players[pov].name;
    this.players.splice(pov, 1);
    if (this.gs.gameStatus === GameStatus.pregame) {
      this.gs.players.splice(pov, 1);
      for (let i = pov; i < this.players.length; i++) {
        this.players[i].pov = i;
      }
      this.emitGameStateToAll();
    } else {
      this.gs.players[pov].isConnected = false;
      this.io.emit('newdisconnect', pov);
    }

    this.emitSystemMsg(`Player '${name}' has disconnected.`);
  }

  // Broadcast a system message to all sockets except the one passed in.
  broadcastSystemMsg(socket, msg: string) {
    socket.broadcast.emit('msg', {
      sender: "Game",
      text: msg,
      isSelf: false,
      isSystem: true
    });
  }

  // Send a system message to all sockets.
  emitSystemMsg(msg: string) {
    this.io.emit('msg', {
      sender: "Game",
      text: msg,
      isSelf: false,
      isSystem: true
    });
  }

  // Emit the current game state to all viewers.
  emitGameStateToAll() {
    this.viewers.forEach((viewer, i) => {
      viewer.emitGameState(this.gs.generateViewpoint(i))
    });
  }

  roomInfo(): RoomInfo {
    return {
      name: this.roomSettings.roomName,
      roomCode: this.roomSettings.roomCode,
      players: this.players.length,
      gameStatus: this.gs.gameStatus,
      gameplaySettings: this.gs.gameplaySettings
    };
  }
}
