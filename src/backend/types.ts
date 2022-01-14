import { Socket } from "socket.io";

export interface RoomSettings {
  roomName: string,
  roomCode: string,
  roomStatus: RoomStatus,
  isPrivate: boolean,
  gameplaySettings: GameplaySettings
}

// Information describing a game room, shown on the listing of games
export interface RoomInfo extends RoomSettings {
  numPlayers: number
}

// Settings for the game that will be played in the room
export interface GameplaySettings {}

export interface Viewpoint {
  pov?: string,
  roomStatus: RoomStatus
  players: Player[]
}

export interface Gamestate extends Viewpoint {}

export interface PacketInfo {
  viewer: Viewer,
  type: string,
  data?: unknown
}

export interface JoinInfo {
  name: string
}

export interface Player extends JoinInfo {}

export interface Viewer {
  socket: Socket,
  pov: number
}

export enum RoomStatus {
  pregame,
  midgame,
  postgame
}

export type TeardownCallback = (roomCode: string) => void;