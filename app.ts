import Express from "express";
import BodyParser from "body-parser";
import Http from "http";
import SocketIo from "socket.io";

import RoomManager from "./logic/room-manager";

const expressApp: Express.Application = new Express();
const bodyParser: BodyParser = new BodyParser();
expressApp.use(bodyParser.urlencoded({extended: true}));
expressApp.use(bodyParser.json());

const server: Http.Server = Http.createServer(expressApp);
const io = new SocketIo(server);

const nextJs = require('next');
const nextApp = nextJs({dev: process.env.NODE_ENV !== "production"});
const nextHandler = nextApp.getRequestHandler();

export const roomManager: RoomManager = new RoomManager(io);

nextApp.prepare().then(() => {
  expressApp.post('/create', (req, res) => {
    roomManager.createRoom(req, res);
  });

  expressApp.get('/api/activeRooms', (req, res) => {
    roomManager.listActiveRooms(req, res);
  });

  // Send people to the game room when they join
  expressApp.get('/game/:roomCode', (req, res) => {
    roomManager.sendToRoom(req, res, nextHandler);
  });

  expressApp.get('*', (req, res) => {
    return nextHandler(req, res);
  });

  // Start the server for socket.io
  const envPort = parseInt(process.env.PORT);
  const port = envPort >= 0 ? envPort : 3000;
  server.listen(port, () => {
    console.log(`Listening on port ${port}`);
  })
});
