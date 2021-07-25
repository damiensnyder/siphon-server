import {Socket} from "socket.io";
import {PartialGameState} from "./gamestate";
import {RoomInfo} from "./game-room";

type Callback = (viewer: Viewer, actionType: string, data?: unknown) => void;

export default class Viewer {
  pov?: number;
  callback: Callback;
  socket: Socket;
  
  constructor(socket: Socket, callback: Callback) {
    this.socket = socket;
    this.callback = callback;

    this.socket.on("join", (joinInfo: unknown) =>
        this.callback(this, "join", joinInfo));
    this.socket.on("disconnect", () =>
        this.callback(this, "disconnect"));
  }

  joinGame(pov: number) {
    this.pov = pov;
    this.socket.on("ready", (readyInfo: unknown) =>
        this.callback(this, "ready", readyInfo));
    this.socket.on("message", (messageInfo: unknown) =>
        this.callback(this, "message", messageInfo));

    this.socket.removeAllListeners("join");
    this.socket.removeAllListeners("replace");
  }

  beginGame() {
    if (typeof(this.pov) !== "number") {
      this.socket.on("replace", (targetPov: unknown) =>
          this.callback(this, "replace", targetPov));
    } else {
      this.socket.on("gameAction", (actionInfo: unknown) =>
          this.callback(this, "gameAction", actionInfo));
    }
  }

  endGame() {
    this.socket.removeAllListeners("replace");
    this.socket.removeAllListeners("gameAction");
  }

  resetGame() {
    if (this.pov !== undefined) {
      this.socket.on("ready", (readyInfo: unknown) =>
          this.callback(this, "ready", readyInfo));
    } else {
      this.socket.on("join", (joinInfo: unknown) =>
          this.callback(this, "join", joinInfo));
    }
  }

  emitRoomInfo(roomInfo: RoomInfo) {
    this.socket.emit("roomInfo", roomInfo);
  }

  emitGameState(viewpoint: PartialGameState) {
    this.socket.emit("gameState", viewpoint);
  }
}
