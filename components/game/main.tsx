import * as React from "react";
import io from "socket.io-client";

import PlayersView from "./players/players-view";
import Chat from "./chat/chat";
// @ts-ignore
import styles from "./main.module.css";
import GamestateManager from "./gamestate-manager";

interface Message {
  sender: string,
  text: string,
  isSelf: boolean,
  isSystem: boolean
}

export default class GameView extends React.Component {
  socket?: any;
  roomCode: string;
  gamestateManager: GamestateManager;
  props: {
    roomCode: string
  };
  state: {
    gs: any,
    messages: Message[],
    connected: boolean
  };

  constructor(props: {roomCode: string}) {
    super(props);
    this.gamestateManager = new GamestateManager();

    this.state = {
      gs: this.gamestateManager.gs,
      messages: [],
      connected: false
    };

    this.callback = this.callback.bind(this);
  }

  // The room code mysteriously does not load immediately, so this checks every
  // 20 ms until it loads.
  async componentDidMount() {
    let timesChecked = 0;
    let checkForRouter = setInterval(() => {
      if (this.props.roomCode !== undefined) {
        clearInterval(checkForRouter);
        this.roomCode = this.props.roomCode;
        this.initializeSocket();
      }
      timesChecked++;
      if (timesChecked == 250) {
        clearInterval(checkForRouter);
      }
    }, 20);
  }

  // Creates the socket connection to the server and handlers for when messages
  // are received from the server.
  initializeSocket() {
    this.socket = io.connect('/game/' + this.props.roomCode);

    this.socket.on('connection', () => {
      this.gamestateManager.updateAfter('connection');
      this.setState({gs: this.gamestateManager.gs});
    });

    this.socket.on('disconnect', () => {
      this.gamestateManager.updateAfter('disconnect');
      this.setState({gs: this.gamestateManager.gs});
      this.addMsg({
        sender: "Client",
        text: "You have been disconnected.",
        isSelf: false,
        isSystem: true
      });
    });

    this.socket.on('msg', (msg) => {
      this.addMsg(msg);
    });

    this.socket.on('update', (gs) => {
      this.gamestateManager.setGs(gs);
      this.setState({gs: this.gamestateManager.gs});
      document.title = gs.settings.name;
    });

    this.socket.on('newready', (readyInfo) => {
      this.gamestateManager.updateAfter('newready', readyInfo);
      this.setState({gs: this.gamestateManager.gs});
    });

    this.socket.on('newreplace', (player) => {
      this.gamestateManager.updateAfter('newreplace', player);
      this.setState({gs: this.gamestateManager.gs});
    });

    this.socket.on('newdisconnect', (player) => {
      this.gamestateManager.updateAfter('newdisconnect', player);
      this.setState({gs: this.gamestateManager.gs});
    });
  }

  // Passed to child components. Assigns the callback to the proper handler
  // function and passes the data along. Sends the type and data via the socket
  // to the server.
  callback(type: string, data: any) {
    if (type === "msg") {
      this.addMsg({
        sender: "You",
        text: data,
        isSelf: true,
        isSystem: false
      });
    } else {
      this.gamestateManager.updateAfter(type, data);
      this.setState({
        gs: this.gamestateManager.gs
      });
    }

    const TYPES_TO_EMIT: string[] = ["join", "replace", "msg", "gameAction"];

    if (TYPES_TO_EMIT.includes(type)) {
      this.socket.emit(type, data);
    } else if (type == "ready") {
      this.socket.emit(type, this.gamestateManager.currentReady());
    }
  }

  // Adds a message to the Chat component.
  addMsg(msg: Message) {
    const messages: Message[] = this.state.messages;
    messages.push(msg);
    this.setState({
      messages: messages
    });
  }

  gameBoardJsx(): JSX.Element {
    return null;
  }

  render(): JSX.Element {
    return (
      <div id={styles.root}>
        <div id={styles.sidebar}>
          <PlayersView gs={this.state.gs}
                       callback={this.callback} />
          <Chat messages={this.state.messages}
              callback={this.callback} />
        </div>
        <div id={styles.gamePane}>
          {this.gameBoardJsx.bind(this)()}
        </div>
      </div>
    );
  }
}
