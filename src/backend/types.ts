import { Socket } from "socket.io";

export interface RoomSettings {
  roomName: string,
  roomCode: string,
  roomStatus: RoomStatus,
  gameplaySettings: GameplaySettings
}

export interface RoomInfo extends RoomSettings {
  numPlayers: number
}

export interface GameplaySettings {
  gameType: string
}

export interface ViewerPerspective {
  pov?: number
}

export interface PacketInfo {
  viewer: Viewer,
  type: string,
  data?: unknown
}

export interface JoinInfo {
  name: string
}

export interface Player extends JoinInfo {
  isConnected: boolean
}

export interface Viewer {
  socket: Socket,
  pov?: number
}

export interface Message {
  sender: string,
  text: string,
  senderType: MessageSender
}

export enum MessageSender {
  self,
  system,
  otherPlayer
}

export enum RoomStatus {
  pregame,
  midgame,
  postgame
}

export type TeardownCallback = (roomCode: string) => void;