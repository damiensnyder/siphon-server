const GameState = require('./gamestate.js');
const Viewer = require('./viewer.js');

class GameManager {
  constructor(io, gameCode) {
    this.io = io;
    this.gs = new GameState();

    this.viewers = [];
    this.players = [];

    this.io.on('connection', (socket) => {
      const viewer = new Viewer(socket,
                                this.viewers.length,
                                this.enqueueAction);
      this.enqueueAction(viewer, 'connect', null);
    });

    this.handlers = {
      'connect': this.handleConnect,
      'join': this.handleJoin,
      'replace': this.handleReplace,
      'ready': this.handleReady,
      'msg': this.handleMsg,
      'pass': this.handlePass,
      'pay': this.handlePay,
      'buy': this.handleBuy,
      'flip': this.handleFlip,
      'run': this.handleRun,
      'fund': this.handleFund,
      'vote': this.handleVote,
      'disconnect': this.handleDisconnect
    }
    for (var type in this.handlers) {
      if (this.handlers.hasOwnProperty(type)) {
          this.handlers[type] = this.handlers[type].bind(this);
      }
    }

    this.actionQueue = [];
    this.handlingAction = false;

    this.enqueueAction = this.enqueueAction.bind(this);
  }

  // Sends actions to a queue that can be handled one at a time so they don't
  // interfere with each other.
  enqueueAction(viewer, type, data) {
    this.actionQueue.push({
      viewer: viewer,
      type: type,
      data: data
    });

    if (!this.handlingAction) {
      this.handlingAction = true;
      this.handleAction();
    }
  }

  // Handle the first action in the queue. If there are no more actions in the
  // queue, show that it is done. Otherwise, handle the next action.
  handleAction() {
    const action = this.actionQueue[0];
    this.handlers[action.type](action.viewer, action.data);

    this.actionQueue.splice(0, 1);
    if (this.actionQueue.length > 0) {
      this.handleAction();
    } else {
      this.handlingAction = false;
    }
  }

  handleConnect(viewer, data) {
    this.viewers.push(viewer);
    viewer.socket.emit('msg', {
      sender: 'Game',
      text: "Connected to chat.",
      isSelf: false,
      isSystem: true
    });
    viewer.emitGameState(this.gs);
  }

  handleJoin(viewer, data) {
    viewer.join(this.players.length, data.name);
    this.players.push(viewer);
    this.gs.addParty(data.name, data.abbr);

    this.broadcastSystemMsg(
      viewer.socket,
      `Player '${data.name}' (${data.abbr}) has joined the game.`
    );
    this.emitGameStateToAll();
  }

  handleReplace(viewer, data) {
    viewer.join(data.target, this.gs.parties[data.target].name);
    viewer.begin();
    this.players.splice(data.target, 0, viewer);
    this.gs.parties[data.target].connected = true;

    this.broadcastSystemMsg(
      viewer.socket,
      `Player '${viewer.name}' has been replaced.`
    );
    this.emitGameStateToAll();
  }

  handleReady(viewer, data) {
    this.gs.parties[viewer.pov].ready = data.ready;
    if (this.gs.allReady()) {
      this.gs.begin();
      this.begin();
    }
    this.emitGameStateToAll();
  }

  handleMsg(viewer, data) {
    const msg = data.msg;
    if (typeof(msg) == 'string' &&
        msg.trim().length > 0 &&
        viewer.pov >= 0) {
      viewer.socket.broadcast.emit('msg', {
        sender: viewer.name,
        text: msg.trim(),
        isSelf: false,
        isSystem: false
      });
    }
  }

  handlePass(viewer, data) {
    this.gs.advanceTurn();
    emitGameStateToAll();
  }

  handlePay(viewer, data) {
    if (this.gs.parties[viewer.pov].funds >= data.amount) {
      this.gs.pay(viewer.pov, data.p2, data.amount);
      this.emitGameStateToAll();
    }
  }

  handleBuy(viewer, data) {
    if (this.gs.parties[viewer.pov].funds >= 5) {
      this.gs.buySymp(viewer.pov);
      this.emitGameStateToAll();
    }
  }

  handleFlip(viewer, data) {
    if (this.gs.parties[viewer.pov].symps.includes(data)) {
      this.gs.flipSymp(viewer.pov, data);
      this.emitGameStateToAll();
    }
  }

  handleRun(viewer, data) {
    if (false) {
      this.emitGameStateToAll();
    }
  }

  handleFund(viewer, data) {
    if (false) {
      this.emitGameStateToAll();
    }
  }

  handleVote(viewer, data) {
    if (false) {
      this.emitGameStateToAll();
    }
  }

  // When a player disconnects, remove them from the list of viewers, fix the
  // viewer indices of all other viewers, and remove them from the game.
  handleDisconnect(viewer, data) {
    let index = this.viewers.indexOf(viewer);
    this.viewers.splice(index, 1);
    for (let i = index; i < this.viewers.length; i++) {
      this.viewers[index].viewerIndex = index;
    }

    if (viewer.pov >= 0) {
      this.removePlayer(viewer.pov);
    }
  }

  begin() {
    for (let i = 0; i < this.players.length; i++) {
      this.players[i].begin();
    }
  }

  // If the game hasn't started, remove the player with the given POV from the
  // game.
  // TODO: If the game has started, replace them with a bot.
  removePlayer(pov) {
    const name = this.gs.parties[pov].name;
    this.players.splice(pov, 1);
    if (!this.gs.started) {
      this.gs.parties.splice(pov, 1);

      for (let i = pov; i < this.players.length; i++) {
        this.players[i].pov = i;
      }
    } else {
      this.gs.parties[pov].connected = false;
    }

    this.emitGameStateToAll();
    this.emitSystemMsg(`Player '${name}' has disconnected.`);
  }

  // Broadcast a system message to all sockets except the one passed in.
  broadcastSystemMsg(socket, msg) {
    socket.broadcast.emit('msg', {
      sender: 'Game',
      text: msg,
      isSelf: false,
      isSystem: true
    });
  }

  // Send a system message to all sockets.
  emitSystemMsg(msg) {
    this.io.emit('msg', {
      sender: 'Game',
      text: msg,
      isSelf: false,
      isSystem: true
    });
  }

  // Emit the current game state to all viewers.
  emitGameStateToAll() {
    for (let i = 0; i < this.viewers.length; i++) {
      this.viewers[i].emitGameState(this.gs);
    }
  }
}

module.exports = GameManager;