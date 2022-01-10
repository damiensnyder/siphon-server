import GameRoom, {RoomInfo} from "./game-room";
import SocketIo from "socket.io";
import {NextHandler} from "./app";
import {Express} from "express";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export interface RoomSettings {
  roomName: string,
  roomCode: string,
  isPrivate: boolean,
  gameplaySettings: GameplaySettings
}

export interface GameplaySettings {

}

export default class RoomManager {
  activeRooms: Record<string, GameRoom>;
  io: SocketIo;

  constructor(io: SocketIo) {
    this.io = io;
    this.activeRooms = {};
  }

  // Called by a game room when it is ready to tear down. Allows the room code
  // to be reused.
  teardownCallback(roomCode: string) {
    delete this.activeRooms[roomCode];
  }

  // Create a game room and send the room code along with status 200.
  createRoom(req: Express.Request, res: Express.Response) {
    const roomSettings: RoomSettings = req.body.roomSettings;
    const roomCode = this.generateRoomCode();
    roomSettings.roomCode = roomCode;

    if (roomSettings.roomName.length === 0) {
      roomSettings.roomName = "Untitled Room";
    }

    this.activeRooms[roomCode] = new GameRoom(this.io,
        roomSettings,
        this.teardownCallback.bind(this));
    res.status = 200;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({roomCode: roomCode}));
  }
  
  addTestRoom(gameRoom: GameRoom) {
    this.activeRooms[gameRoom.roomSettings.roomCode] = gameRoom;
  }

  generateRoomCode(): string {
    const numChars: number = ALPHABET.length;
    const gameCodeLength: number = Math.ceil(
      Math.log(Object.keys(this.activeRooms).length + 2) / Math.log(26)
    ) + 3;

    let roomCode: string = "";
    while (roomCode === "") {
      for (let i = 0; i < gameCodeLength; i++) {
        roomCode += ALPHABET.charAt(Math.floor(Math.random() * numChars));
      }
      if (this.activeRooms.hasOwnProperty(roomCode)) {
        roomCode = "";
      }
    }
    return roomCode;
  }

  listActiveRooms(req: Express.Request, res: Express.Response) {
    let activeRooms: RoomInfo[] = [];

    for (const [, game] of Object.entries(this.activeRooms)) {
      if (!game.roomSettings.isPrivate) {
        activeRooms.push(game.roomInfo());
      }
    }

    res.status = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(activeRooms));
  }

  sendToRoom(req: Express.Request,
             res: Express.Response,
             nextHandler: NextHandler) {
    if (this.activeRooms.hasOwnProperty(req.params.roomCode)) {
      return nextHandler(req, res);
    } else {
      res.redirect('/');
    }
  }
}
