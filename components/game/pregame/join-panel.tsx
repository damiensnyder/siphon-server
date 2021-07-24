import React from "react";

import TextInput from "../../text-input";
import InviteLink from "./invite-link";
import general from "../../general.module.css";
import styles from "./pregame.module.css";

interface JoinPanelProps {
  roomCode: string,
  callback: any
}

class JoinPanel extends React.Component {
  state: {
    partyName: string,
    abbr: string,
    abbrPlaceholder: string
  };
  partyAbbr: any;
  props: JoinPanelProps;

  constructor(props: JoinPanelProps) {
    super(props);

    this.state = {
      partyName: "",
      abbr: "",
      abbrPlaceholder: ""
    }

    this.partyAbbr = React.createRef();
  }

  updatePartyName(text) {
    this.setState({
      partyName: text,
      abbrPlaceholder: text.trim().substring(0, 4).toUpperCase()
    });
  }

  updateAbbr(text) {
    this.setState({
      abbr: text
    });
  }

  joinGame() {
    const abbr = this.state.abbr === "" ?
        this.state.abbrPlaceholder :
        this.state.abbr;

    this.props.callback('join', {
      name: this.state.partyName,
      abbr: abbr
    });
  }

  render() {
    return (
      <div className={general.outerWrapper + ' ' +
          general.responsiveHorizWrapper + ' ' +
          styles.panelContainer}>
        <div className={general.menu}>
          <TextInput label={"Party name:"}
                     maxLength={40}
                     value={this.state.partyName}
                     changeCallback={this.updatePartyName.bind(this)}
                     submitCallback={this.joinGame.bind(this)} />
          <TextInput label={"Abbreviation:"}
                     maxLength={4}
                     value={this.state.abbr}
                     placeholder={this.state.abbrPlaceholder}
                     changeCallback={this.updateAbbr.bind(this)}
                     submitCallback={this.joinGame.bind(this)} />
          <div className={general.spacer}>
            <button className={general.actionBtn + ' ' + general.priorityBtn}
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
