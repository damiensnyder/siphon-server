import GameRoom from "./game-room";
import type { RoomInfo, RoomSettings } from "../types";
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
  teardownCallback(roomCode: string): void {
    delete this.activeRooms[roomCode];
  }

  // Create a game room and send the room code along with status 200.
  createRoom(req: Express.Request, res: Express.Response): void {
    const roomSettings: unknown = req.body.roomSettings;
    if (!roomSettings) {
      res.status(400).end();
      return;
    }
    const verifiedRoomSettings: RoomSettings = roomSettings as RoomSettings;
    const roomCode = this.generateRoomCode();
    verifiedRoomSettings.roomCode = roomCode;

    if (verifiedRoomSettings.roomName.length === 0) {
      verifiedRoomSettings.roomName = "Untitled Room";
    }

    try {
      this.activeRooms[roomCode] = new GameRoom(
        this.io,
        verifiedRoomSettings,
        this.teardownCallback.bind(this)
      );

      res.status(200).json({ roomCode: roomCode });
    } catch (err) {
      res.status(400).end();
    }
  }
  
  addTestRoom(gameRoom: GameRoom): void {
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

  listActiveRooms(_req: Express.Request, res: Express.Response): void {
    const activeRooms: RoomInfo[] = [];

    for (const [, game] of Object.entries(this.activeRooms)) {
      if (!game.roomSettings.isPrivate) {
        activeRooms.push(game.roomInfo());
      }
    }

    res.status(200).end(JSON.stringify({ rooms: activeRooms }));
  }
}
