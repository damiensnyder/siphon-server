import GameRoom from "./game-room";
import type { RoomInfo, RoomSettings } from "./types";
import type { Server } from "socket.io";
import type Express from "express";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

export default class RoomManager {
  activeRooms: Record<string, GameRoom>;
  io: Server;

  constructor(io: Server) {
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
    res.setHeader("Content-Type", "application/json");
    res.status(200).end(JSON.stringify({roomCode: roomCode}));
  }
  
  addTestRoom(gameRoom: GameRoom) {
    this.activeRooms[gameRoom.roomSettings.roomCode] = gameRoom;
  }

  // Generate a random sequence of lowercase letters, without colliding with
  // room codes already in use and without being short enough to guess.
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

  listActiveRooms(_req: Express.Request, res: Express.Response) {
    let activeRooms: RoomInfo[] = [];

    for (const [, game] of Object.entries(this.activeRooms)) {
      if (!game.roomSettings.isPrivate) {
        activeRooms.push(game.roomInfo());
      }
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(200).end(JSON.stringify(activeRooms));
  }
}
