import {Socket} from "socket.io";
import {PartialGameState} from "./gamestate";

type Callback = (viewer: Viewer, actionType: string, data?: unknown) => void;

export default class Viewer {
  pov?: number;
  callback: Callback;
  socket: Socket;
  
  constructor(socket: Socket, callback: Callback) {
    this.socket = socket;
    this.callback = callback;

    this.socket.on('join', (joinInfo: unknown) =>
        this.callback(this, 'join', joinInfo));
    this.socket.on('disconnect', () =>
        this.callback(this, 'disconnect'));
  }

  joinGame(pov: number) {
    this.pov = pov;
    this.socket.on('ready', (readyInfo: unknown) =>
        this.callback(this, 'ready', readyInfo));
    this.socket.on('msg', (messageInfo: unknown) =>
        this.callback(this, 'msg', messageInfo));

    this.socket.removeAllListeners('join');
    this.socket.removeAllListeners('replace');
  }

  beginGame() {
    if (this.pov === undefined) {
      this.socket.on('replace', (targetPov: unknown) =>
          this.callback(this, 'replace', targetPov));
    } else {
      this.socket.on('gameAction', (actionInfo: unknown) =>
          this.callback(this, 'gameAction', actionInfo));
    }
  }

  endGame(): void {
    this.socket.removeAllListeners('replace');
    this.socket.removeAllListeners('gameAction');
  }

  resetGame(): void {
    if (this.pov !== undefined) {
      this.socket.on('ready', (readyInfo: unknown) =>
          this.callback(this, 'ready', readyInfo));
    } else {
      this.socket.on('join', (joinInfo: unknown) =>
          this.callback(this, 'join', joinInfo));
    }
  }

  emitGameState(viewpoint: PartialGameState): void {
    this.socket.emit('update', viewpoint);
  }
}
