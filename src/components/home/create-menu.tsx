import * as React from "react";
import Router from "next/router";

import TextInput from "../text-input";
import CheckboxInput from "../checkbox-input";
import general from "../general.module.css";
import styles from "./main.module.css";

interface CreateMenuState {
  roomName: string,
  isPrivate: boolean
}

export default class CreateMenu extends React.Component<{}, CreateMenuState> {
  constructor(props) {
    super(props);

    this.state = {
      roomName: "",
      isPrivate: true
    }
  }

  componentWillUnmount() {
    this.setState({
      roomName: ""
    });
  }

  nameCallback(text: string) {
    this.setState({
      roomName: text
    });
  }

  privateCallback(isPrivate: boolean) {
    this.setState({
      isPrivate: isPrivate
    });
  }

  async createGame() {
    const roomSettings: CreateMenuState = {
      roomName: this.state.roomName,
      isPrivate: this.state.isPrivate
    };
    if (this.state.roomName.length === 0) {
      roomSettings.roomName = "My Game";
    }

    let res = await fetch('/create', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({roomSettings: roomSettings})
    });

    const resInfo = await res.json();
    if (res.status === 200) {
      await Router.push(`/game/${resInfo.roomCode}`);
    }
  }

  render(): JSX.Element {
    return (
      <div className={styles.menuOuter}>
        <h2>Create Game</h2>
        <TextInput label={'Room name:'}
            maxLength={40}
            value={this.state.roomName}
            placeholder={'My Game'}
            changeCallback={this.nameCallback.bind(this)}
            submitCallback={this.createGame.bind(this)} />
        <CheckboxInput label={'Private:'}
            checked={this.state.isPrivate}
            checkCallback={this.privateCallback.bind(this)} />
        <div className={general.spacer}>
          <button className={`${general.actionBtn} ${general.priorityBtn}`}
              onClick={this.createGame.bind(this)}>
            Create
          </button>
        </div>
      </div>
    );
  }
}
