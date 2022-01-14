import { createServer } from "http";
import Express from "express";
import { Server } from "socket.io";

import { handler } from "./target/handler.js";
import RoomManager from "./dist/room-manager.js";

const app = Express();
app.use(Express.json());

const httpServer = createServer(app);
const io = new Server(httpServer);
export const roomManager = new RoomManager(io);

// Create a game room
app.post("/createRoom", (req, res) => {
  roomManager.createRoom(req, res);
});

// List active game rooms
app.get("/activeRooms", (req, res) => {
  roomManager.listActiveRooms(req, res);
});

// Defer to SvelteKit's handler
app.use(handler);

// Start the server for socket.io
const envPort = parseInt(process.env.PORT);
const port = (envPort >= 0) ? envPort : 3000;
httpServer.listen(port, () => {
  process.stdout.write(`Siphon Server running at http://localhost:${port}\n`);
});
