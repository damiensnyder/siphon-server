import React from "react";

import general from "../../general.module.css";
import styles from "./helper-bar.module.css";
import {GameStatus, PartialGameState} from "../../../logic/gamestate";

interface HelperBarProps extends PartialGameState {
  readyCallback: (string) => void,
  tabCallback: (number) => void
}

interface HelperBarState {
  helpIsVisible: boolean,
  helpMessageIndex: number
}

type ReadyButtonText = "Ready" | "Rematch" | "Cancel" | "Help" | "Hide";

class HelperBar extends React.Component<HelperBarProps, HelperBarState> {
  constructor(props) {
    super(props);

    this.state = {
      helpIsVisible: false,
      helpMessageIndex: 0
    };
  }

  toggleHelp() {
    this.setState({
      helpIsVisible: !this.state.helpIsVisible,
      helpMessageIndex: 0
    });
  }

  buttonLabel(): ReadyButtonText {
    if (this.props.isReady) {
      return "Cancel";
    } else if (this.props.gameStatus === GameStatus.pregame) {
      return "Ready";
    } else if (this.props.gameStatus === GameStatus.postgame) {
      return "Rematch";
    } else if (this.state.helpIsVisible) {
      return "Hide";
    }
    return "Help";
  }

  explanationJsx(): JSX.Element {
    if (this.state.helpIsVisible) {
      return (
        <div className={styles.helpText}>
          {this.currentHelpMessageSet.bind(this)()[this.state.helpMessageIndex]}
        </div>
      );
    }
    return null;
  }

  // Return the set of help messages appropriate to the current situation.
  currentHelpMessageSet(): string[] {
    return [""];
  }

  showPreviousHelpMessage() {
    this.setState({
      helpMessageIndex: this.state.helpMessageIndex - 1,
    });
  }

  showNextHelpMessage() {
    this.setState({
      helpMessageIndex: this.state.helpMessageIndex + 1
    });
  }

  handleActionButtonPressed() {

  }

  render(): JSX.Element {
    const buttonStyle = `${general.actionBtn} ${styles.bigButton} `;
    const inactiveStyle = `${general.inactiveBtn2} ${styles.bigButton} `;
    const priorityStyle = `${buttonStyle} ${general.priorityBtn} `;

    if (this.props.joined === null) {
      return null;
    } else if (this.props.gameStatus === GameStatus.pregame) {
      return (
          <button className={priorityStyle}
                  onClick={this.handleActionButtonPressed}>
            {this.buttonLabel()}
          </button>
      );
    }

    let backButton = (
      <button className={buttonStyle}
          onClick={this.showPreviousHelpMessage.bind(this)}>
        &lt;&lt; Back
      </button>
    );
    let nextButton = (
      <button className={buttonStyle}
          onClick={this.showNextHelpMessage.bind(this)}>
        Next &gt;&gt;
      </button>
    );
    if (this.state.helpIsVisible && this.state.helpMessageIndex === 0) {
      backButton = (
        <button className={inactiveStyle}>
          &lt;&lt; Back
        </button>
      );
    }
    if (this.state.helpMessageIndex ===
        this.currentHelpMessageSet.bind(this)().length - 1) {
      nextButton = (
        <button className={inactiveStyle}>
          Next &gt;&gt;
        </button>
      );
    }
    if (!this.state.helpIsVisible) {
      backButton = null;
      nextButton = null;
    }

    return (
      <div className={styles.outerWrapper}>
        {this.explanationJsx.bind(this)()}
        <div className={styles.buttonsRow}>
          {backButton}
          {nextButton}
          <button className={priorityStyle}
                  onClick={this.handleActionButtonPressed}>
            {this.buttonLabel()}
          </button>
        </div>
      </div>
    );
  }
}



export default HelperBar;
