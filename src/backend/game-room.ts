import SocketIo, {Socket} from "socket.io";

import GameState, {RoomStatus} from "./gamestate";
import Viewer from "./viewer";
import { MessageSender, PacketInfo, Player, RoomSettings, TeardownCallback } from "./types";

const TEARDOWN_TIME: number = 60 * 60 * 1000;

export default class GameRoom {
  roomSettings: RoomSettings;
  viewers: Viewer[];
  players: Player[];
  gameState: GameState;
  handlingPacket: boolean;
  private packetQueue: PacketInfo[];
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
    this.gameState = new GameState(roomSettings);
    this.teardownCallback = teardownCallback;

    this.viewers = [];
    this.players = [];

    this.io.on('connection', (socket: Socket) => {
      const viewer = new Viewer(socket, this.enqueuePacket);
      this.enqueuePacket(viewer, 'connect', null);
    });

    this.handlers = {
      'connect': this.handleConnect.bind(this),
      'join': this.handleJoin.bind(this),
      'replace': this.handleReplace.bind(this),
      'gameAction': this.handleGameAction.bind(this),
      'message': this.handleMessage.bind(this),
      'disconnect': this.handleDisconnect.bind(this)
    }
    this.packetQueue = [];
    this.handlingPacket = false;
    this.enqueuePacket = this.enqueuePacket.bind(this);
    this.teardownTimer = setTimeout(
        () => {this.teardownCallback(this.roomSettings.roomCode)},
        TEARDOWN_TIME);
  }

  // Sends actions to a queue that can be handled one at a time so they don't
  // interfere with each other.
  enqueuePacket(viewer: Viewer, packetType: string, data?: unknown) {
    this.packetQueue.push({
      viewer: viewer,
      type: packetType,
      data: data
    });

    if (!this.handlingPacket) {
      this.handlingPacket = true;
      this.handlePacket();
    }
  }

  // Handle the first packet in the queue. If there are no more packets in the
  // queue, show that it is done. Otherwise, handle the next packet.
  handlePacket() {
    const packet = this.packetQueue[0];
    this.handlers[packet.type](packet.viewer, packet.data);

    clearTimeout(this.teardownTimer);
    this.teardownTimer = setTimeout(
        () => {this.teardownCallback(this.roomSettings.roomCode)},
        TEARDOWN_TIME
    );

    this.packetQueue.splice(0, 1);
    if (this.packetQueue.length > 0) {
      this.handlePacket();
    } else {
      this.handlingPacket = false;
    }
  }

  handleConnect(viewer: Viewer) {
    this.viewers.push(viewer);
    viewer.socket.emit('msg', {
      sender: "Game",
      text: "Connected to chat.",
      senderType: MessageSender.system
    });
    if (this.gameState.roomStatus === RoomStatus.midgame) {
      viewer.beginGame();
    }
    viewer.emitGameState(this.gameState.generateViewpoint());
  }

  // Add the player to the game, unless their join info is invalid.
  handleJoin(viewer: Viewer, joinInfo: JoinInfo) {
    if (this.gameState.isValidJoinInfo(joinInfo)) {
      viewer.joinGame(this.players.length);
      this.players.push(viewer);
      this.gameState.addPlayer(joinInfo);

      this.broadcastSystemMessage(
        viewer.socket,
        `Player '${joinInfo.name}' has joined the game.`
      );
      this.emitPlayersListToAll();
    } else {
      viewer.emitRoomInfo(this.roomInfo());
      viewer.socket.emit('playersList', this.gameState.playersList);
      viewer.emitGameState(this.gameState.generateViewpoint(viewer.pov));
    }
  }

  handleReplace(viewer: Viewer, replacedPov: number) {
    this.emitPlayersListToAll()
    if (this.gameState.roomStatus === RoomStatus.pregame &&
        !this.gameState.players[replacedPov].isConnected) {
      viewer.joinGame(replacedPov);
      this.players.splice(replacedPov, 0, viewer);
      this.gameState.players[replacedPov].isConnected = true;
      viewer.emitGameState(this.gameState.generateViewpoint(replacedPov));

      this.broadcastSystemMessage(
        viewer.socket,
        `Player '${this.gameState.players[replacedPov].name}' has been replaced.`
      );
    }
  }

  handleGameAction(viewer: Viewer, actionInfo: unknown): void {
    this.gameState.handleGameAction(viewer.pov, actionInfo);
    if (this.gameState.roomStatus === RoomStatus.postgame) {
      this.viewers.forEach((viewer) => viewer.endGame());
    }
    this.emitGameStateToAll();
  }

  handleMessage(viewer: Viewer, message: string): void {
    if (typeof(message) === "string" &&
        message.trim().length > 0 &&
        typeof(viewer.pov) === "number") {
      viewer.socket.broadcast.emit('message', {
        sender: this.gameState.players[viewer.pov].name,
        text: message.trim(),
        senderType: MessageSender.otherPlayer
      });
    }
  }

  resetGame() {
    this.players.forEach((player) => {player.resetGame()});
    this.gameState.resetGame();
    this.packetQueue = [];
    this.emitGameStateToAll();
  }

  // When a player disconnects, remove them from the list of viewers, fix the
  // viewer indices of all other viewers, and remove them from the game.
  handleDisconnect(viewer: Viewer) {
    let index = this.viewers.indexOf(viewer);
    this.viewers.splice(index, 1);

    if (typeof(viewer.pov) === "number") {
      this.removePlayer(viewer.pov);
    }
  }

  // If the game hasn't started, remove the player with the given POV from the
  // game.
  removePlayer(pov: number) {
    const name = this.gameState.players[pov].name;
    this.players.splice(pov, 1);
    if (this.gameState.roomStatus === RoomStatus.pregame) {
      this.gameState.players.splice(pov, 1);
      for (let i = pov; i < this.players.length; i++) {
        this.players[i].pov = i;
      }
      this.emitPlayersListToAll();
    } else {
      this.gameState.players[pov].isConnected = false;
      this.emitPlayersListToAll();
    }

    this.emitSystemMsg(`Player '${name}' has disconnected.`);
  }

  // Broadcast a system message to all sockets except the one passed in.
  broadcastSystemMessage(socket: Socket, msg: string) {
    socket.broadcast.emit("message", {
      sender: "Game",
      text: msg,
      senderType: MessageSender.system
    });
  }

  // Send a system message to all sockets.
  emitSystemMsg(msg: string) {
    this.io.emit("message", {
      sender: "Game",
      text: msg,
      senderType: MessageSender.system
    });
  }

  // Emit the current player list to all viewers.
  emitPlayersListToAll() {
    this.io.emit("playersList", this.gameState.playersList);
  }

  // Emit the current game state to all viewers.
  emitGameStateToAll() {
    this.viewers.forEach((viewer, i) => {
      viewer.emitGameState(this.gameState.generateViewpoint(i))
    });
  }

  roomInfo(): RoomInfo {
    return {
      roomName: this.roomSettings.roomName,
      roomCode: this.roomSettings.roomCode,
      players: this.players.length,
      roomStatus: this.gameState.roomStatus,
      gameplaySettings: this.roomSettings.gameplaySettings
    };
  }
}
