import * as React from "react";

import general from "../../general.module.css";
import styles from "./pregame.module.css";

class InviteLink extends React.Component {
  props: {roomCode: string};
  state: {copied: boolean};
  linkArea: any;

  constructor(props: {roomCode: string}) {
    super(props);

    this.state = {
      copied: false
    }

    this.linkArea = React.createRef();
  }

  // Selects the textarea with the invite link and copies it to clipboard.
  copyInviteLink() {
    this.linkArea.current.select();
    document.execCommand('copy');

    if (window.getSelection !== undefined) {        // All browsers except IE <9
      window.getSelection().removeAllRanges();
      // @ts-ignore
    } else if (document.selection !== undefined) {  // IE <9
      // @ts-ignore
      document.selection.empty();
    }

    this.setState({
      copied: true
    });

    setTimeout(() => {
      this.setState({
        copied: false
      });
    }, 2500);
  }

  render() {
    return (
      <div className={general.menu}>
        <div className={general.spacer}>
          <div className={general.horizWrapper}>
            <textarea rows={1}
                      cols={18}
                      ref={this.linkArea}
                      className={styles.gameLink}
                      onChange={() => {}} // suppresses warning
                      value={'http://www.siphonstate.com/game/' +
                             this.props.roomCode}>
            </textarea>
            <button className={general.actionBtn + ' ' + general.priorityBtn}
                    id={styles.copyBtn}
                    onClick={this.copyInviteLink.bind(this)}>
              {this.state.copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
        <span id={styles.inviteFriend}>invite a friend</span>
      </div>
    );
  }
}

export default InviteLink;
