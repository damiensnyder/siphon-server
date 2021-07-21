// @ts-ignore
const App = require('./app');
// @ts-ignore
const GameRoom = require('./logic/game-room');

// Add the specified number of parties to the game, and set all of them to
// disconnected.
function addParties(gs, numParties: number): void {
  for (let i = 1; i <= numParties; i++) {
    gs.addParty("party " + i, "P" + i);
  }
  gs.commitAll();
  gs.parties.forEach((party) => {
    party.connected = false;
  });
}

function twoPartiesStart(): void {
  const game: typeof GameRoom = new GameRoom(App.gameManager.io, {
    name: "two parties start",
    roomCode: "2ps",
    nation: "Kenderland",
    private: false
  }, () => {});

  addParties(game.gs, 2);
  App.gameManager.addTestGame(game);
}

function twoPartiesEnd(): void {
  const game: typeof GameRoom = new GameRoom(App.gameManager.io, {
    name: "two parties end",
    roomCode: "2pe",
    nation: "Otria",
    private: false
  }, () => {});

  addParties(game.gs, 2);
  App.gameManager.addTestGame(game);
}

function twoPartiesVoting(): void {
  const game: typeof GameRoom = new GameRoom(App.gameManager.io, {
    name: "two parties voting",
    roomCode: "2pv",
    nation: "Kenderland",
    private: false
  }, () => {});

  addParties(game.gs, 2);
  game.gs.commitAll();
  game.gs.commitAll();
  game.gs.commitAll();
  App.gameManager.addTestGame(game);
}

function twoPartiesTwoDecline(): void {
  const game: typeof GameRoom = new GameRoom(App.gameManager.io, {
    name: "two parties two decline",
    roomCode: "2p2d",
    nation: "Kenderland",
    private: false
  }, () => {});

  addParties(game.gs, 2);
  game.gs.decline = 2;
  game.gs.parties.forEach((party) => {
    party.hitAvailable = true;
  });
  App.gameManager.addTestGame(game);
}

function threePartiesStart(): void {
  const game: typeof GameRoom = new GameRoom(App.gameManager.io, {
    name: "three parties start",
    roomCode: "3ps",
    nation: "Otria",
    private: false
  }, () => {});

  addParties(game.gs, 3);
  App.gameManager.addTestGame(game);
}

function fourPartiesStart(): void {
  const game = new GameRoom(App.gameManager.io, {
    name: "four parties start",
    roomCode: "4ps",
    nation: "Otria",
    private: false
  }, () => {});

  addParties(game.gs, 4);
  App.gameManager.addTestGame(game);
}

const startTime = (new Date()).getUTCSeconds();
twoPartiesStart();
twoPartiesVoting();
twoPartiesTwoDecline();
twoPartiesEnd();
threePartiesStart();
fourPartiesStart();
const endTime = (new Date()).getUTCSeconds();
console.log(`Created test games in ${(endTime - startTime) / 1000}s`);
