import { JoinInfo, Player, RoomSettings, RoomStatus } from "./types";

interface Player {

}

export default class GameState {
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
      isConnected: false,
      isReady: false
    });
  }

  // Returns true if all players are ready, false otherwise.
  allPlayersAreReady(): boolean {
    for (let i = 0; i < this.players.length; i++) {
      if (!this.players[i].isReady) {
        return false;
      }
    }
    return true;
  }

  beginGame() {
    this.players.forEach((player) => {
      player.isReady = false;
    });
    this.roomStatus = RoomStatus.midgame;
  }

  resetGame() {
    this.roomStatus = RoomStatus.pregame;
  }

  handleGameAction(pov: number, actionInfo: unknown) {

  }

  generateViewpoint(pov?: number): PartialGameState {
    return {
      pov: pov
    };
  }
}
