const _ = require('lodash');

const politicianNames = [
  "Olive Bass",
  "Amber Melendez",
  "Iyla Conrad",
  "Maleeha Hughes",
  "Pixie Mackenzie",
  "Hareem Worthington",
  "Eliott Kirby",
  "Davey Hogan",
  "Yahya Schaefer",
  "Annaliese Webber",
  "Milana Flowers",
  "Bonita Houston",
  "Hywel Swift",
  "Kynan Skinner",
  "Adela Britton",
  "Sebastien Morrow",
  "Irving Weaver",
  "Johnathon Tait",
  "Willow Rooney",
  "Sahra Huffman",
  "Marlon Howe",
  "Karter Richard",
  "Jimmy Floyd",
  "Eliza Akhtar",
  "Jai Leal",
  "Harriett Cervantes",
  "Sianna Reyes",
  "Rueben Finley",
  "Zion Kemp",
  "Sachin Hirst",
  "Zahid Vaughan",
  "Finn Cole",
  "Dominika Gonzalez",
  "Henley Colon",
  "Lainey Hollis",
  "Isla-Grace Madden",
  "Samera Stephenson",
  "Ayoub Stanley",
  "Esmay Ramirez",
  "Joy Wormald",
  "Veronika Calderon",
  "Jolyon Stafford",
  "Kaif Owens",
  "Skye Norton",
  "Shauna Greaves",
  "Charmaine Phan",
  "Sky Watt",
  "Heath Osborn",
  "Conrad Cortez",
  "Valentino Pena",
  "Tayla Carlson",
  "Beatriz Richardson",
  "Ashlyn English",
  "Arla Baker",
  "Yusha Bailey",
  "Anastasia Elliott",
  "Marjorie Williamson",
  "Tom Esparza",
  "Reid Buckley",
  "Shannon Morse"
];
const playerNames = ["idiot 1", "johson", "Bkjbkjbkj", "0"];
const provinceNames = ["Jermany 4", "Kanzas", "wilfred", "NO NO NO", "ian"];

class Game {
  constructor(io, gameCode) {
    this.io = io;
    this.gameCode = gameCode;

    this.politicians = politicianNames.map(name => new Politician(name));
    this.players = playerNames.map(
      name => new Player(name, null, this.handleAction, this.handleMsg)
    );
    this.provinces = provinceNames.map(name => new Province(name));

    this.numPlayers = this.players.length;

    // assign each player an equal amount of politicians
    for (var i = 0; i < politicianNames.length; i++) {
      this.players[i % numPlayers].politicians.push(this.politicians[i]);
      this.politicians[i].player = this.players[i % numPlayers];
    }

    // assign each player one random symp and their player index
    this.sympIndex = 0;
    shuffle(this.politicians);
    while (this.sympIndex < numPlayers) {
      this.giveSymp(this.sympIndex);
      this.players[this.sympIndex].index = this.sympIndex;
    }

    this.activeProvince = 0;
    this.activePlayer = 0;
    this.started = false;
    this.ended = false;
  }

  giveSymp(playerIndex) {
    this.players[playerIndex].symps.push(this.politicians[this.sympIndex]);
    this.politicians[this.sympIndex].sympTo = this.players[playerIndex];
    this.sympIndex++;
  }

  handleAction(action, playerName) {

  }

  handleMsg(msg, playerName) {

  }
}

class Politician {
  constructor(name) {
    this.name = name;

    this.isAvailable = null;
    this.position = null;

    this.player = null;
    this.province = null;
    this.sympTo = null;
  }
}

class Player {
  constructor(name, socket, actionHandler, msgHandler) {
    this.name = name;
    this.index = null;

    this.isTurn = false;

    this.politicians = [];
    this.symps = [];

    this.socket = socket;
    this.socket.on('action', (action) => actionHandler(action, this.name));
    this.socket.on('msg', (msg) => msgHandler(msg, this.name));
  }
}

class Province {
  constructor(name) {
    this.name = name;

    this.isStarted = false;
    this.isActive = false;
    this.stage = 0;

    this.governor = [];
    this.officials = [];
    this.candidates = [];
    this.dropouts = [];
  }
}

function generateGameState(gameObj, pov) {
  var game = _.cloneDeep(gameObj);

  game.self = game.players[pov];
  game.selfIndex = pov;

  // remove knowledge of other players' symps
  for (var i = 0; i < game.numPlayers; i++) {
    if (i !== pov) {
      delete game.players[i].symps;
    }
  }
  for (var i = 0; i < game.politicians.length; i++) {
    game.politicians[i].isSymp = game.politicians[i].sympTo === pov;
    delete game.politicians[i].sympTo;
  }
  shuffle(game.politicians);

  return game;
}

function shuffle(arr) {
  for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

module.exports = Game;
