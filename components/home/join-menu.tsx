import React from "react";
import Router from "next/router";

import TextInput from "../text-input";
import RoomItem from "./room-item";
import general from "../general.module.css";
import styles from "./main.module.css";
import joinStyles from "./join-menu.module.css";
import {RoomInfo} from "../../logic/game-room";

enum FetchStatus {
  pending,
  success,
  error
}

interface JoinMenuState {
  roomCode: string,
  fetchStatus: FetchStatus,
  numFetches: number;
  rooms: RoomInfo[]
}

class JoinMenu extends React.Component<{}, JoinMenuState> {
  constructor(props) {
    super(props);

    this.state = {
      roomCode: "",
      fetchStatus: FetchStatus.pending,
      numFetches: 0,
      rooms: []
    }
  }

  componentDidMount() {
    this.fetchRooms().then();
  }

  componentWillUnmount() {
    this.setState({
      roomCode: "",
      fetchStatus: FetchStatus.pending
    });
  }

  async fetchRooms() {
    let res = await fetch('/api/activeRooms', {
      method: 'GET'
    });
    const rooms = await res.json();
    if (res.status === 200) {
      this.setState({
        rooms: rooms,
        fetchStatus: FetchStatus.success
      });
    } else if (this.state.fetchStatus === FetchStatus.pending) {
      this.setState({
        fetchStatus: FetchStatus.error
      });
    }

    // Fetch again and double delay until next fetch.
    setTimeout(this.fetchRooms.bind(this), 15000 * 2 ** this.state.numFetches);
    this.setState({
      numFetches: this.state.numFetches + 1
    });
  }

  roomsListJsx(): JSX.Element | JSX.Element[] {
    if (this.state.fetchStatus === FetchStatus.pending) {
      return <div>Loading...</div>;
    }
    if (this.state.fetchStatus === FetchStatus.error) {
      return <div>Error fetching games.</div>;
    }
    if (this.state.rooms.length === 0) {
      return <div>No games found.</div>;
    }

    return this.state.rooms.map((roomInfo) => {
      return <RoomItem key={roomInfo.roomCode}
                       {...roomInfo} />;
    });
  }

  roomCodeCallback(text: string) {
    this.setState({
      roomCode: text
    });
  }

  async submitCallback() {
    await Router.push(`/game/${this.state.roomCode}`);
  }

  render(): JSX.Element {
    return (
      <div className={styles.menuOuter}>
        <h2>Active Games</h2>
        <div id={joinStyles.activeGamesWindow}>
          {this.roomsListJsx.bind(this)()}
        </div>
        <div className={general.horizWrapper}>
          <TextInput label={"Game code:"}
                     maxLength={20}
                     value={this.state.roomCode}
                     changeCallback={this.roomCodeCallback.bind(this)}
                     submitCallback={this.submitCallback.bind(this)} />
          <div className={general.spacer}>
            <button className={`${general.actionBtn} ${general.priorityBtn}`}
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
