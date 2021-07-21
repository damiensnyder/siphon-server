import React from 'react';
import Router from 'next/router';

import TextInput from '../text-input';
import GameItem from './game-item';
import general from '../general.module.css';
import styles from './main.module.css';
import joinStyles from './join-menu.module.css';

class JoinMenu extends React.Component {
  gameCodeInput: React.RefObject<any>;
  numFetches: number;
  state: {
    gameCode: string,
    fetched: boolean,
    error: boolean,
    games: {
      gameCode: string,
      nation: string,
      name: string,
      private: false
    }[];
  }

  constructor(props) {
    super(props);

    this.state = {
      roomCode: "",
      fetched: false,
      error: false,
      games: []
    }

    this.gameCodeInput = React.createRef();
    this.numFetches = 0;
  }

  componentDidMount() {
    this.fetchGames().then();
  }

  componentWillUnmount() {
    this.setState({
      gameCode: "",
      fetched: false,
      error: false
    });
  }

  async fetchGames() {
    let res = await fetch('/api/activeGames', {
      method: 'GET'
    });
    const games = await res.json();
    if (res.status == 200) {
      this.setState({
        games: games,
        fetched: true
      });
    } else if (!this.state.fetched) {
      this.setState({
        error: true,
        fetched: true
      });
    }

    // Fetch again and double delay until next fetch.
    setTimeout(this.fetchGames.bind(this), 15000 * 2 ** this.numFetches);
    this.numFetches++;
  }

  gamesToJsx() {
    if (!this.state.fetched) {
      return <div>Loading...</div>;
    }
    if (this.state.error) {
      return <div>Error fetching games.</div>;
    }
    if (this.state.games.length == 0) {
      return <div>No games found.</div>;
    }

    return this.state.games.map((game) => {
      return <GameItem key={game.roomCode}
                       info={game} />;
    });
  }

  gameCodeCallback(text) {
    this.setState({
      gameCode: text
    });
  }

  submitCallback() {
    Router.push('/game/' + this.state.roomCode).then();
  }

  render(): React.ReactNode {
    return (
      <div className={styles.menuOuter}>
        <h2>Active Games</h2>
        <div id={joinStyles.activeGamesWindow}>
          {this.gamesToJsx.bind(this)()}
        </div>
        <div className={general.horizWrapper}>
          <TextInput label={"Game code:"}
                     maxLength={20}
                     text={this.state.roomCode}
                     textCallback={this.gameCodeCallback.bind(this)}
                     submitCallback={this.submitCallback.bind(this)} />
          <div className={general.spacer}>
            <button className={general.actionBtn + ' ' + general.priorityBtn}
                    onClick={this.submitCallback.bind(this)}>
              Join
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default JoinMenu;
