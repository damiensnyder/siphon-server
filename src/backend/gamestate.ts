import {RoomSettings} from "./room-manager";
import {JoinInfo, PlayerInfo} from "./game-room";

export enum GameStatus {
  pregame,
  midgame,
  postgame
}

interface Player {
  name: string,
  isConnected: boolean,
  isReady: boolean
}

export interface PartialGameState {
  pov?: number
}

export default class GameState {
  gameStatus: GameStatus;
  players: Player[];
  playersList: PlayerInfo[];
  roomSettings: RoomSettings;

  constructor(roomSettings: RoomSettings) {
    this.roomSettings = roomSettings;
    this.gameStatus = GameStatus.pregame;
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
    this.gameStatus = GameStatus.midgame;
  }

  resetGame() {
    this.gameStatus = GameStatus.pregame;
  }

  handleGameAction(pov: number, actionInfo: unknown) {

  }

  generateViewpoint(pov?: number): PartialGameState {
    return {
      pov: pov
    };
  }
}
