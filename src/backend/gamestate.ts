import { JoinInfo, Player, RoomSettings, RoomStatus, ViewerPerspective } from "./types";

export default class GameState {
  removePlayer(pov: number) {
    throw new Error("Method not implemented.");
  }
  roomStatus: RoomStatus;
  players: Player[];
  playersList: Player[];
  roomSettings: RoomSettings;

  constructor(roomSettings: RoomSettings) {
    this.roomSettings = roomSettings;
    this.roomStatus = RoomStatus.pregame;
    this.players = [];
  }

  isValidJoinInfo(joinInfo: unknown): boolean {
    return true;
  }

  addPlayer(playerJoinInfo: JoinInfo) {
    this.players.push({
      name: playerJoinInfo.name,
      isConnected: true
    });
  }

  beginGame() {
    this.roomStatus = RoomStatus.midgame;
  }

  resetGame() {
    this.roomStatus = RoomStatus.pregame;
  }

  handleGameAction(pov: number, actionInfo: unknown) {

  }

  generateViewpoint(pov?: number): ViewerPerspective {
    return {
      pov: pov
    };
  }
}
