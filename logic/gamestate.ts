import {GameplaySettings} from "./room-manager";
import {PlayerJoinInfo} from "./game-room";

export enum StageOfGame {
  pregame,
  midgame,
  postgame
}

interface Player {
  name: string,
  isConnected: boolean,
  isReady: boolean
}

export interface Viewpoint {

}

export default class GameState {
  stageOfGame: StageOfGame;

  players: Player[];
  gameplaySettings: GameplaySettings;

  constructor(settings: GameplaySettings) {
    this.gameplaySettings = settings;
    this.stageOfGame = StageOfGame.pregame;
    this.players = [];
  }

  isValidPlayerJoinInfo(playerJoinInfo: unknown): boolean {
    return true;
  }

  addPlayer(playerJoinInfo: PlayerJoinInfo): void {
    this.players.push({
      name: playerJoinInfo.name,
      isReady: false,
      isConnected: true,
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
    this.stageOfGame = StageOfGame.midgame;
  }

  resetGame() {
    this.stageOfGame = StageOfGame.pregame;
  }

  handleGameAction(pov: number, actionInfo: unknown) {

  }

  generateViewpoint(pov: number): Viewpoint {
    return {};
  }
}
