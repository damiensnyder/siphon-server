import Express from "express";
import BodyParser from "body-parser";

const expressApp: Express = new Express();
const bodyParser: BodyParser = new BodyParser();
expressApp.use(bodyParser.urlencoded({extended: true}));
expressApp.use(bodyParser.json());

const server = require('http').Server(expressApp);
const io = require('socket.io')(server);

const nextJs = require('next');
const nextApp = nextJs({dev: process.env.NODE_ENV != 'production'});
const nextHandler = nextApp.getRequestHandler();

const GameManager = new (require('./logic/room-manager').GameManager)(io);

nextApp.prepare().then(() => {
  expressApp.post('/create', (req, res) => {
    GameManager.createGame(req, res);
  });

  expressApp.get('/api/activeRooms', (req, res) => {
    GameManager.getActiveGames(req, res);
  });

  // Send people who join the game to the game room
  expressApp.get('/game/:roomCode', (req, res) => {
    GameManager.sendToGame(req, res, nextHandler);
  });

  expressApp.get('*', (req, res) => {
    return nextHandler(req, res);
  });

  // Start the server for socket.io
  const envPort = parseInt(process.env.PORT);
  const port = envPort >= 0 ? envPort : 3000;
  server.listen(port, (err) => {
    if (err) throw err;
    console.log("Listening on port " + port);
  })
});

module.exports = {
  gameManager: GameManager
};
