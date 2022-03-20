import type { Namespace, Server, Socket } from "socket.io";

import type { Gamestate, PacketInfo, RoomInfo, RoomSettings, TeardownCallback, Viewer, Viewpoint } from "../types";
import { RoomStatus } from "../types";

const TEARDOWN_TIME: number = 60 * 60 * 1000; // one hour

export default class GameRoom {
  roomSettings: RoomSettings;
  viewers: Viewer[];
  connectionsStarted: number;
  gamestate: Gamestate;
  handlingPacket: boolean;
  private packetQueue: PacketInfo[];
  private readonly teardownCallback: TeardownCallback;
  private readonly io: Namespace;
  private teardownTimer: NodeJS.Timeout;

  constructor(
    io: Server,
    roomSettings: RoomSettings,
    teardownCallback: TeardownCallback
  ) {
    this.roomSettings = roomSettings;
    this.gamestate = {
      roomStatus: RoomStatus.pregame,
      players: []
    };
    this.viewers = [];
    this.connectionsStarted = 0;

    this.io = io.of(`/game/${roomSettings.roomCode}`);
    this.io.on('connection', (socket: Socket) => {
      const viewer = {
        socket: socket,
        pov: this.connectionsStarted
      };
      this.connectionsStarted++;
      this.enqueuePacket.bind(this)(viewer, 'connect');
      viewer.socket.emit("gamestate", this.generateViewpoint.bind(this)(viewer.pov));
    });

    this.packetQueue = [];
    this.handlingPacket = false;
    this.teardownCallback = teardownCallback;
    this.teardownTimer = setTimeout(
      () => this.teardownCallback(this.roomSettings.roomCode),
      TEARDOWN_TIME
    );
  }

  // Sends actions to a queue, which is handled one at a time so the items
  // don't interfere with each other.
  enqueuePacket(viewer: Viewer, packetType: string, data?: unknown): void {
    this.packetQueue.push({
      viewer: viewer,
      type: packetType,
      data: data
    });

    if (!this.handlingPacket) {
      this.handlingPacket = true;
      this.handlePacket();
    }
  }

  // Handle the first packet in the queue. If there are no more packets in the
  // queue, show that the queue is empty. Otherwise, handle the next packet.
  handlePacket(): void {
    const { viewer, type, data } = this.packetQueue.splice(0, 1)[0];
    if (type === "connect") {
      this.viewers.push(viewer);
      viewer.socket.on("disconnect", () => {
        this.enqueuePacket.bind(this)(viewer, "disconnect");
      });
      viewer.socket.on("action", (data: unknown) => {
        this.enqueuePacket.bind(this)(viewer, "action", data);
      });
    } else if (type === "disconnect") {
      this.viewers = this.viewers.filter((v) => v !== viewer);
      this.handleGameAction(viewer.pov, {
        type: "disconnect"
      });
    } else {
      this.handleGameAction(viewer.pov, data);
    }

    clearTimeout(this.teardownTimer);
    this.teardownTimer = setTimeout(
        () => this.teardownCallback(this.roomSettings.roomCode),
        TEARDOWN_TIME
    );
    
    if (this.packetQueue.length > 0) {
      this.handlePacket();
    } else {
      this.handlingPacket = false;
    }
  }

  // Emit the current game state to all viewers.
  emitGameStateToAll(): void {
    for (const viewer of this.viewers) {
      viewer.socket.emit("gamestate", this.generateViewpoint(viewer.pov));
    };
  }

  // Meant to be overridden by the game action handler.
  handleGameAction(_pov: number, _data: unknown) {}

  // Meant to be overridden by the game data sender.
  generateViewpoint(_pov: number): Viewpoint {
    return {
      roomStatus: this.gamestate.roomStatus,
      players: this.gamestate.players
    };
  }

  roomInfo(): RoomInfo {
    return {
      numPlayers: this.gamestate.players.length,
      ...this.roomSettings
    };
  }
}