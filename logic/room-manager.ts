import GameRoom, {RoomInfo} from "./game-room";
import SocketIo from "socket.io";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export interface RoomSettings {
  name: string,
  roomCode: string,
  isPrivate: boolean,
  gameplaySettings: GameplaySettings
}

export interface GameplaySettings {

}

export default class RoomManager {
  activeRooms: {
    [key: string]: GameRoom
  };
  io: SocketIo;

  constructor(io: SocketIo) {
    this.io = io;
    this.activeRooms = {};
  }

  // Called by a game room when it is ready to tear down. Allows the room code
  // to be reused.
  teardownCallback(gameRoom: GameRoom) {
    delete this.activeRooms[gameRoom.roomSettings.roomCode];
  }

  // Create a game room and send the room code along with status 200.
  createRoom(req, res) {
    const roomCode: string = this.generateRoomCode()
    const roomSettings: RoomSettings = req.body.settings;
    roomSettings.roomCode = roomCode;

    if (roomSettings.name.length === 0) {
      roomSettings.name = "Untitled Room";
    }

    this.activeRooms[roomCode] = new GameRoom(this.io,
        roomSettings,
        this.teardownCallback.bind(this));
    res.status = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({roomCode: roomCode}));
  }
  
  addTestRoom(gameRoom: GameRoom) {
    this.activeRooms[gameRoom.roomSettings.roomCode] = gameRoom;
  }

  generateRoomCode() {
   const numChars: number = ALPHABET.length;
   const gameCodeLength: number = Math.ceil(
     Math.log(Object.keys(this.activeRooms).length + 4) / Math.log(26)) + 1;

   let roomCode: string = "";
   while (roomCode == "" || this.activeRooms.hasOwnProperty(roomCode)) {
     roomCode = "";
     for (let i = 0; i < gameCodeLength; i++) {
       roomCode += ALPHABET.charAt(Math.floor(Math.random() * numChars));
     }
   }
   return roomCode;
  }

  listActiveRooms(req, res) {
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

  sendToRoom(req, res, nextHandler): void {
    if (this.activeRooms.hasOwnProperty(req.params.gameCode)) {
      return nextHandler(req, res);
    } else {
      res.redirect('/');
    }
  }
}
