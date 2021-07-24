import React from "react";

import TextInput from "../../text-input";
import InviteLink from "./invite-link";
import general from "../../general.module.css";
import styles from "./pregame.module.css";
import {JoinInfo} from "../../../logic/game-room";

interface JoinPanelProps {
  roomCode: string,
  joinCallback: (joinInfo: JoinInfo) => void
}

interface JoinPanelState {
  name: string
}

class JoinPanel extends React.Component<JoinPanelProps, JoinPanelState> {
  constructor(props: JoinPanelProps) {
    super(props);

    this.state = {
      name: ""
    }
  }

  updatePlayerName(newName) {
    this.setState({
      name: newName
    });
  }

  joinGame() {
    this.props.joinCallback(this.state)
  }

  render() {
    return (
      <div className={`${general.outerWrapper}
                       ${general.responsiveHorizWrapper}
                       ${styles.panelContainer}`}>
        <div className={general.menu}>
          <TextInput label={"Name:"}
                     maxLength={40}
                     value={this.state.name}
                     changeCallback={this.updatePlayerName.bind(this)}
                     submitCallback={this.joinGame.bind(this)} />
          <div className={general.spacer}>
            <button className={`${general.actionBtn} ${general.priorityBtn}`}
                    onClick={this.joinGame.bind(this)}>
              Join Game
            </button>
          </div>
        </div>
        <div id={styles.orDiv}>or</div>
        <InviteLink roomCode={this.props.roomCode} />
      </div>
    );
  }
}

export default JoinPanel;
