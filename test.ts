import {roomManager} from "./app";
import GameRoom from "./logic/game-room";

function createTestRoom(name, roomCode, gameplaySettings, numPlayers) {
  const gameRoom: GameRoom = new GameRoom(roomManager.io, {
    name: name,
    roomCode: roomCode,
    isPrivate: false
  }, () => {});

  for (let i = 1; i <= numPlayers; i++) {
    gameRoom.gs.addPlayer("Player " + i, "P" + i);
  }
  gameRoom.gs.commitAll();
  gameRoom.gs.players.forEach((player) => {
    player.connected = false;
  });

  roomManager.addTestRoom(gameRoom);
}

const startTime = (new Date()).getUTCSeconds();
const endTime = (new Date()).getUTCSeconds();
console.log(`Created test games in ${(endTime - startTime) / 1000}s`);
