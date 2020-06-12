import React from 'react';
import io from 'socket.io-client';
import styles from './game.module.css';
import Province from './province';
import OtherPlayer from './other-player';
import Chat from './chat';

class GameView extends React.Component {
  constructor(props) {
    super(props);

    this.socket = undefined;

    this.numPlayers = 4;
    this.state = {
      gameState: {
        provinces: [
          { name: 'texum', isActive: false },
          { name: 'TikManDoo', isActive: false },
          { name: 'Starf', isActive: false },
          { name: '1', isActive: false },
          { name: 'Cancelr', isActive: false }
        ]
      },
      messages: []
    };

    this.chatHandler = this.chatHandler.bind(this);
  }

  componentDidMount() {
    this.waitForGameCode();
  }

  async waitForGameCode() {
    await this.retryUntilGameCode();
  }

  retryUntilGameCode() {
    return new Promise((resolve) => {
      var timesChecked = 0;
      var checkForRouter = setInterval(() => {
        if (this.props.gameCode !== undefined) {
          clearInterval(checkForRouter);
          this.initializeSocket();
        }
        timesChecked++;
        if (timesChecked == 250) {
          clearInterval(checkForRouter);
        }
      }, 20);
      resolve(null);
    });
  }

  initializeSocket() {
    this.socket = io.connect('/game/' + this.props.gameCode);
    console.log('in cdm: ' + this.props.gameCode);

    this.socket.on('msg', (msg) => {
      this.addMsg(msg);
    });
  }

  provincesToJsx() {
    const provincesJsx = [];
    for (var i = 0; i < 5; i++) {
      provincesJsx.push(
        <Province gameState={this.state.gameState}
                  index={i}
                  key={i} />
      );
    }
    return provincesJsx;
  }

  otherPlayersToJsx() {
    const otherPlayersJsx = [];
    for (var i = 0; i < this.numPlayers - 1; i++) {
      otherPlayersJsx.push(
        <OtherPlayer gameState={this.state.gameState}
                     index={i}
                     key={i} />
      );
    }
    return otherPlayersJsx;
  }

  chatHandler(msgText) {
    this.addMsg({
      sender: 'You',
      text: msgText,
      isSelf: true,
      isSystem: false
    });
    this.socket.emit('msg', msgText);
  }

  addMsg(msg) {
    const messages = this.state.messages;
    messages.push(msg);
    this.setState({
      messages: messages
    });
  }

  render() {
    return (
      <div id={styles.root}>
        <div id={styles.gameContainer}
             className={styles.containerLevel2}>
          {this.provincesToJsx()}
        </div>
        <Chat messages={this.state.messages}
              chatHandler={this.chatHandler} />
        <div id={styles.otherPlayers}
             className={styles.containerLevel2}>
          {this.otherPlayersToJsx()}
        </div>
        <div id={styles.controlPanel}
             className={styles.containerLevel2}>
          {this.props.gameCode}
        </div>
      </div>
    );
  }
}

export default GameView;
