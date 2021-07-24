import React from "react";

import JoinPanel from "./join-panel";
import InviteLink from "./invite-link";
import general from "../../general.module.css";
import styles from "./pregame.module.css";
import HelperBar from "../helper-bar/helper-bar";
import {JoinInfo} from "../../../logic/game-room";

interface PregameViewProps {
  joinCallback: (joinInfo: JoinInfo) => void,
  isConnected: boolean,
  joined: boolean,
  roomSettings?: {
    roomCode: string
  }
}

function PregameView(props: PregameViewProps) {
  return (
    <div className={`${general.outerWrapper}
                     ${general.horizWrapper}
                     ${styles.panelContainer}`}>
      {props.joined ?
          <JoinPanel joinCallback={props.joinCallback}
                     roomCode={props.roomSettings.roomCode} /> :
          <InviteLink roomCode={props.roomSettings.roomCode} />}
      {/*<HelperBar {...props}*/}
      {/*           callback={props.joinCallback}*/}
      {/*           activeTab={0}*/}
      {/*           tabCallback={() => {}} />*/}
    </div>
  );
}

export default PregameView;
