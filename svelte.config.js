import nodeAdapter from '@sveltejs/adapter-node';
import preprocess from 'svelte-preprocess';
import { Server } from 'socket.io';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: preprocess(),

	kit: {
		adapter: nodeAdapter({
			out: "target"
		}),
		vite: {
      envPrefix: "BACKEND_",
      plugins: [
        {
          name: "room-manager",
          configureServer(server) {
						import("./dist/room-manager.js").then(({ default: RoomManager }) => {
              const roomManager = new RoomManager(new Server(server.httpServer));
							// tell me you're alive....
							server.middlewares.use("/g", (_req, _res, next) => {
								console.log("fuckerton");
								next();
							});
							
							// Create a game room
							server.middlewares.use("/createRoom", (req, res, _next) => {
								console.log("a");
								roomManager.createRoom(req, res);
							});
							
							// List active game rooms
							server.middlewares.use("/activeRooms", (req, res, _next) => {
								console.log("b");
								roomManager.listActiveRooms(req, res);
							});
            }).catch(() => console.error("Failed to import room manager."));
          }
        }
      ]
    }
	}
};

export default config;
