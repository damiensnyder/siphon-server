import * as React from "react";
import SocketIo from "socket.io-client";

import Chat from "./chat/chat";
import styles from "./main.module.css";
import {GameStatus, PartialGameState} from "../../logic/gamestate";
import PregameView from "./pregame/pregame-view";
import {JoinInfo} from "../../logic/game-room";

interface GameViewProps {
  roomCode: string
}

interface GameViewState extends PartialGameState {
  messages: Message[]
}

export interface Message {
  sender: string,
  text: string,
  senderType: MessageSender
}

export enum MessageSender {
  self,
  system,
  otherPlayer
}

export default class GameView
    extends React.Component<GameViewProps, GameViewState> {
  socket?: any;

  constructor(props) {
    super(props);

    this.state = {
      messages: [],
      isConnected: false,
      joined: false,
      isReady: false,
      players: []
    };
  }

  // The room code mysteriously does not load immediately, so this checks every
  // 20 ms until it loads or until 5 seconds elapse.
  async componentDidMount() {
    let timesChecked = 0;
    let checkForRouter = setInterval(() => {
      if (this.props.roomCode !== undefined) {
        clearInterval(checkForRouter);
        this.initializeSocket();
      }
      timesChecked++;
      if (timesChecked === 250) {
        clearInterval(checkForRouter);
      }
    }, 20);
  }

  // Creates the socket connection to the server and handlers for when messages
  // are received from the server.
  initializeSocket() {
    this.socket = SocketIo.connect(`/game/${this.props.roomCode}`);

    this.socket.on('connection', () => {
      this.setState({
        isConnected: true
      });
    });

    this.socket.on('disconnect', () => {
      this.setState({
        isConnected: false
      });
      this.addMsg({
        sender: "Game",
        text: "You have been disconnected.",
        senderType: MessageSender.system
      });
    });

    this.socket.on('msg', (msg: Message) => {
      this.addMsg(msg);
    });

    this.socket.on('update', (newGameState: PartialGameState) => {
      this.setState(newGameState);
      document.title = newGameState.roomSettings.roomName;
    });
  }

  chatCallback(msgText: string) {
    this.addMsg({
      sender: "You",
      text: msgText,
      senderType: MessageSender.self
    });
    this.socket.emit("msg", msgText);
  }

  joinCallback(joinInfo: JoinInfo) {
    this.setState({
      players: this.state.players.concat(joinInfo)
    });
    this.socket.emit("join", joinInfo);
  }

  // Adds a message to the Chat component.
  addMsg(msg: Message) {
    const messages: Message[] = this.state.messages;
    messages.push(msg);
    this.setState({
      messages: messages.concat(msg)
    });
  }

  render(): JSX.Element {
    return (
      <div id={styles.root}>
        <div id={styles.sidebar}>
          <Chat messages={this.state.messages}
                chatCallback={this.chatCallback.bind(this)} />
        </div>
        <div id={styles.gamePane}>
          {
            this.state.gameStatus === GameStatus.pregame ?
                <PregameView joinCallback={this.joinCallback.bind(this)}
                             {...this.state} /> :
                null
          }
        </div>
      </div>
    );
  }
}
