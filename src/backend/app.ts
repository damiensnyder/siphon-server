import * as Http from "http";
import Express from "express";
import { Server } from "socket.io";
import { handler } from "../../target/handler";

import RoomManager from "./room-manager";

const expressApp: Express.Application = Express();
expressApp.use(Express.urlencoded({ extended: true }));
expressApp.use(Express.json());

const httpServer: Http.Server = Http.createServer(expressApp);
const io: Server = new Server(httpServer);

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

// For all other paths, defer to SvelteKit's handler
expressApp.use(handler);

// Start the server for socket.io
const envPort = parseInt(process.env.PORT);
const port = (envPort >= 0) ? envPort : 3000;
httpServer.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
