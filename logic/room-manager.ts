import GameRoom, {JoinInfo} from "./game-room";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export interface RoomSettings {
  name: string,
  roomCode: string,
  isPrivate: boolean
}

export default class RoomManager {
  activeRooms: {
    [key: string]: GameRoom
  };
  socket: any;

  constructor(socket) {
    this.socket = socket;
    this.activeRooms = {};
  }

  // Called by a game room when it is ready to tear down. Allows the room code
  // to be reused.
  callback(game) {
    delete this.activeRooms[game.settings.roomCode];
  }

  // Create a game room and send the room code along with status 200.
  createRoom(req, res) {
    const roomCode: string = this.generateRoomCode()
    const roomSettings: RoomSettings = req.body.settings;
    roomSettings.roomCode = roomCode;

    if (roomSettings.name.length === 0) {
      roomSettings.name = "Untitled Room";
    }

    this.activeRooms[roomCode] = new GameRoom(this.socket,
        roomSettings,
        this.callback.bind(this));
    res.status = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({roomCode: roomCode}));
  }
  
  addTestRoom(gameRoom: GameRoom) {
    this.activeRooms[gameRoom.settings.roomCode] = gameRoom;
  }

  generateRoomCode() {
   const numChars: number = ALPHABET.length;
   const gameCodeLength: number = Math.ceil(
     Math.log(Object.keys(this.activeRooms).length + 4) / Math.log(26)) + 1;

   let gameCode: string = "";
   while (gameCode == "" || this.activeRooms.hasOwnProperty(gameCode)) {
     gameCode = "";
     for (let i = 0; i < gameCodeLength; i++) {
       gameCode += ALPHABET.charAt(Math.floor(Math.random() * numChars));
     }
   }
   return gameCode;
  }

  listActiveRooms(req, res) {
    let activeRooms: JoinInfo[] = [];

    for (const [, game] of Object.entries(this.activeRooms)) {
      if (!game.settings.isPrivate) {
        activeRooms.push(game.joinInfo());
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
