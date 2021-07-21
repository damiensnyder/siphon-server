import React from "react";

import JoinPanel from "./join-panel";
import InviteLink from "./invite-link";
import general from "../../general.module.css";
import styles from "./pregame.module.css";
import HelperBar from "../helper-bar/helper-bar";

interface PregameViewProps {
  joined: boolean,
  gameCode: string,
  callback: any,
  gs: any
}

function joinPanelJsx(props: PregameViewProps) {
  if (!props.joined) {
    return (
      <JoinPanel callback={props.callback}
          gameCode={props.roomCode} />
    );
  }
  return <InviteLink gameCode={props.roomCode} />;
}

function PregameView(props: PregameViewProps) {
  return (
    <div className={general.outerWrapper + ' ' +
        general.horizWrapper + ' ' +
        styles.panelContainer}>
      {joinPanelJsx(props)}
      <HelperBar gs={props.gs}
          callback={props.callback}
          activeTab={0}
          tabCallback={() => {}} />
    </div>
  );
}

export default PregameView;
