import Express from "express";
import * as Http from "http";
import SocketIo from "socket.io";

import RoomManager from "./room-manager";

const expressApp: Express.Application = Express();
expressApp.use(Express.urlencoded({ extended: true }));
expressApp.use(Express.json());

const httpServer: Http.Server = Http.createServer(expressApp);
const io: SocketIo = new SocketIo(httpServer);

export const roomManager: RoomManager = new RoomManager(io);

// Create a game room
expressApp.post("/createRoom",
    (req: Express.Request, res: Express.Response) => {
  roomManager.createRoom(req, res);
});

// List active game rooms
expressApp.get("/activeRooms",
    (req: Express.Request, res: Express.Response) => {
  roomManager.listActiveRooms(req, res);
});

// Send people to the corresponding game room when they join one
expressApp.get("/game/:roomCode",
    (req: Express.Request, res: Express.Response) => {
  return roomManager.sendToRoom(req, res, null);
});

// For all other paths, defer to SvelteKit's handler
expressApp.get("*",
    (req: Express.Request, res: Express.Response) => {
  return null;
});

// Start the server for socket.io
const envPort = parseInt(process.env.PORT);
const port = (envPort >= 0) ? envPort : 3000;
httpServer.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
