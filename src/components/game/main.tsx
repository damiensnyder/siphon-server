import * as React from "react";
import SocketIo from "socket.io-client";

import Chat from "./chat/chat";
import styles from "./main.module.css";
import {RoomStatus, PartialGameState} from "../../backend/gamestate";
import PregameView from "./pregame/pregame-view";
import {JoinInfo, Message, MessageSender, PlayerInfo, RoomInfo} from "../../backend/game-room";

interface GameViewProps {
  roomCode: string
}

interface GameViewState extends PartialGameState, RoomInfo {
  messages: Message[],
  playersList: PlayerInfo[],
  isConnected: boolean
}

export default class GameView
    extends React.Component<GameViewProps, GameViewState> {
  socket?: any;

  constructor(props) {
    super(props);

    this.state = {
      isConnected: false,
      roomStatus: RoomStatus.pregame,
      players: 0,
      roomCode: "",
      roomName: "",
      messages: [],
      playersList: []
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
    this.socket.on("connection", this.handleConnection.bind(this));
    this.socket.on("disconnect", this.handleDisconnect.bind(this));
    this.socket.on("message", this.addMessage.bind(this));
    this.socket.on("gameState", this.setState.bind(this));
    this.socket.on("playersList", (newPlayersList: PlayerInfo[]) => {
      this.setState({playersList: newPlayersList});
    });
    this.socket.on("roomInfo", this.setState.bind(this));
  }

  handleConnection() {
    this.setState({
      isConnected: true
    });
  }

  handleDisconnect() {
    this.setState({
      isConnected: false
    });
    this.addMessage({
      sender: "Game",
      text: "You have been disconnected.",
      senderType: MessageSender.system
    });
  }

  chatCallback(text: string) {
    this.addMessage({
      sender: "You",
      text: text,
      senderType: MessageSender.self
    });
    this.socket.emit("message", text);
  }

  joinCallback(joinInfo: JoinInfo) {
    this.socket.emit("join", joinInfo);
  }

  readyCallback(isReady: boolean) {
    this.socket.emit("ready", isReady);
  }

  replaceCallback(pov: number) {
    this.socket.emit("replace", pov);
  }

  // Adds a message to the Chat component.
  addMessage(msg: Message) {
    const messages: Message[] = this.state.messages;
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
            this.state.roomStatus === RoomStatus.pregame ?
                <PregameView joinCallback={this.joinCallback.bind(this)}
                             {...this.state} /> :
                null
          }
        </div>
      </div>
    );
  }
}
