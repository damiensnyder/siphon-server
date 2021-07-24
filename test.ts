import {roomManager} from "./app";
import GameRoom from "./logic/game-room";
import {GameplaySettings} from "./logic/room-manager";

function createTestRoom(roomName: string,
                        roomCode: string,
                        gameplaySettings: GameplaySettings,
                        numPlayers: number) {
  const gameRoom: GameRoom = new GameRoom(roomManager.io, {
    roomName: roomName,
    roomCode: roomCode,
    isPrivate: false,
    gameplaySettings: {}
  }, () => {});

  for (let i = 1; i <= numPlayers; i++) {
    gameRoom.gs.addPlayer({
      name: `Player ${i}`
    });
  }
  gameRoom.gs.players.forEach((player) => {
    player.isConnected = false;
  });

  roomManager.addTestRoom(gameRoom);
}

const startTime = (new Date()).getUTCSeconds();
const endTime = (new Date()).getUTCSeconds();
console.log(`Created test games in ${(endTime - startTime) / 1000}s`);
