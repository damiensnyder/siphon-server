// src/lib/types.ts
var RoomStatus;
(function(RoomStatus2) {
  RoomStatus2[RoomStatus2["pregame"] = 0] = "pregame";
  RoomStatus2[RoomStatus2["midgame"] = 1] = "midgame";
  RoomStatus2[RoomStatus2["postgame"] = 2] = "postgame";
})(RoomStatus || (RoomStatus = {}));

// src/lib/backend/game-room.ts
var TEARDOWN_TIME = 60 * 60 * 1e3;
var GameRoom = class {
  constructor(io, roomSettings, teardownCallback) {
    this.roomSettings = roomSettings;
    this.gamestate = {
      roomStatus: RoomStatus.pregame,
      players: []
    };
    this.viewers = [];
    this.connectionsStarted = 0;
    this.io = io.of(`/game/${roomSettings.roomCode}`);
    this.io.on("connection", (socket) => {
      const viewer = {
        socket,
        pov: this.connectionsStarted
      };
      this.connectionsStarted++;
      this.enqueuePacket.bind(this)(viewer, "connect");
      viewer.socket.emit("gamestate", this.generateViewpoint.bind(this)(viewer.pov));
    });
    this.packetQueue = [];
    this.handlingPacket = false;
    this.teardownCallback = teardownCallback;
    this.teardownTimer = setTimeout(() => this.teardownCallback(this.roomSettings.roomCode), TEARDOWN_TIME);
  }
  enqueuePacket(viewer, packetType, data) {
    this.packetQueue.push({
      viewer,
      type: packetType,
      data
    });
    if (!this.handlingPacket) {
      this.handlingPacket = true;
      this.handlePacket();
    }
  }
  handlePacket() {
    const { viewer, type, data } = this.packetQueue.splice(0, 1)[0];
    if (type === "connect") {
      this.viewers.push(viewer);
      viewer.socket.on("disconnect", () => {
        this.enqueuePacket.bind(this)(viewer, "disconnect");
      });
      viewer.socket.on("action", (data2) => {
        this.enqueuePacket.bind(this)(viewer, "action", data2);
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
    this.teardownTimer = setTimeout(() => this.teardownCallback(this.roomSettings.roomCode), TEARDOWN_TIME);
    if (this.packetQueue.length > 0) {
      this.handlePacket();
    } else {
      this.handlingPacket = false;
    }
  }
  emitGameStateToAll() {
    for (const viewer of this.viewers) {
      viewer.socket.emit("gamestate", this.generateViewpoint(viewer.pov));
    }
    ;
  }
  handleGameAction(_pov, _data) {
  }
  generateViewpoint(_pov) {
    return {
      roomStatus: this.gamestate.roomStatus,
      players: this.gamestate.players
    };
  }
  roomInfo() {
    return {
      numPlayers: this.gamestate.players.length,
      ...this.roomSettings
    };
  }
};

// src/lib/backend/room-manager.ts
var ALPHABET = "abcdefghijklmnopqrstuvwxyz";
var RoomManager = class {
  constructor(io) {
    this.io = io;
    this.activeRooms = {};
  }
  teardownCallback(roomCode) {
    delete this.activeRooms[roomCode];
  }
  createRoom(req, res) {
    const roomSettings = req.body.roomSettings;
    if (!roomSettings) {
      res.status(400).end();
      return;
    }
    const verifiedRoomSettings = roomSettings;
    const roomCode = this.generateRoomCode();
    verifiedRoomSettings.roomCode = roomCode;
    if (verifiedRoomSettings.roomName.length === 0) {
      verifiedRoomSettings.roomName = "Untitled Room";
    }
    try {
      this.activeRooms[roomCode] = new GameRoom(this.io, verifiedRoomSettings, this.teardownCallback.bind(this));
      res.status(200).json({ roomCode });
    } catch (err) {
      res.status(400).end();
    }
  }
  addTestRoom(gameRoom) {
    this.activeRooms[gameRoom.roomSettings.roomCode] = gameRoom;
  }
  generateRoomCode() {
    const numChars = ALPHABET.length;
    const gameCodeLength = Math.ceil(Math.log(Object.keys(this.activeRooms).length + 2) / Math.log(26)) + 3;
    let roomCode = "";
    while (roomCode === "") {
      for (let i = 0; i < gameCodeLength; i++) {
        roomCode += ALPHABET.charAt(Math.floor(Math.random() * numChars));
      }
      if (this.activeRooms.hasOwnProperty(roomCode)) {
        roomCode = "";
      }
    }
    return roomCode;
  }
  listActiveRooms(_req, res) {
    let activeRooms = [];
    for (const [, game] of Object.entries(this.activeRooms)) {
      if (!game.roomSettings.isPrivate) {
        activeRooms.push(game.roomInfo());
      }
    }
    res.status(200).end(JSON.stringify(activeRooms));
  }
};
export {
  RoomManager as default
};
