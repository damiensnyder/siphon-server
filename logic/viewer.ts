import {Socket} from "socket.io";
import {Viewpoint} from "./gamestate";

type Callback = (Viewer, string, unknown?) => void;

export default class Viewer {
  pov: number;
  callback: Callback;
  socket: Socket;
  
  constructor(socket: Socket, callback: Callback) {
    this.socket = socket;
    this.callback = callback;

    this.socket.on('join',
        (playerJoinInfo) => this.callback(this, 'join', playerJoinInfo));
    this.socket.on('disconnect',
        () => this.callback(this, 'disconnect'));
  }

  joinGame(pov: number) {
    this.pov = pov;
    this.socket.on('ready',
        (readyInfo) => this.callback(this, 'ready', readyInfo));
    this.socket.on('msg',
        (messageInfo) => this.callback(this, 'msg', messageInfo));

    this.socket.removeAllListeners('join');
    this.socket.removeAllListeners('replace');
  }

  beginGame() {
    if (this.pov === undefined) {
      this.socket.on('replace',
          (targetPov) => this.callback(this, 'replace', targetPov));
    } else {
      this.socket.on('gameAction',
          (actionInfo) => this.callback(this, 'gameAction', actionInfo));
    }
  }

  endGame(): void {
    this.socket.removeAllListeners('replace');
    this.socket.removeAllListeners('gameAction');
  }

  resetGame(): void {
    if (this.pov !== undefined) {
      this.socket.on('ready',
          (readyInfo) => this.callback(this, 'ready', readyInfo));
    } else {
      this.socket.on('join',
          (partyInfo) => this.callback(this, 'join', partyInfo));
    }
  }

  emitGameState(viewpoint: Viewpoint): void {
    this.socket.emit('update', viewpoint);
  }
}
