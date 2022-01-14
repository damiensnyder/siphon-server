import Express from "express";
import * as Http from "http";
import SocketIo from "socket.io";
import Next from "next";
import { NextServer } from "next/dist/server/next";
import { UrlWithParsedQuery } from "url";

import RoomManager from "./room-manager";

const expressApp: Express.Application = Express();
expressApp.use(Express.urlencoded({ extended: true }));
expressApp.use(Express.json());

const httpServer: Http.Server = Http.createServer(expressApp);
const io: SocketIo = new SocketIo(httpServer);

export type NextHandler = (req: Http.IncomingMessage,
                           res: Http.ServerResponse,
                           parsedUrl?: UrlWithParsedQuery) => Promise<any>;

const nextApp: NextServer = Next({ dev: process.env.NODE_ENV !== "production" });
const nextHandler: NextHandler = nextApp.getRequestHandler();

export const roomManager: RoomManager = new RoomManager(io);

nextApp.prepare().then(() => {
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
    return roomManager.sendToRoom(req, res, nextHandler);
  });

  // For all other paths, defer to SvelteKit's handler
  expressApp.get("*",
      (req: Express.Request, res: Express.Response) => {
    return nextHandler(req, res);
  });

  // Start the server for socket.io
  const envPort = parseInt(process.env.PORT);
  const port = (envPort >= 0) ? envPort : 3000;
  httpServer.listen(port, () => {
    console.log(`Listening on port ${port}`);
  })
});
