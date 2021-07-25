import React from "react";

import JoinPanel from "./join-panel";
import InviteLink from "./invite-link";
import general from "../../general.module.css";
import styles from "./pregame.module.css";
import HelperBar from "../helper-bar/helper-bar";
import {JoinInfo} from "../../../backend/game-room";
import {PartialGameState} from "../../../backend/gamestate";

interface PregameViewProps extends PartialGameState {
  joinCallback: (joinInfo: JoinInfo) => void
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
      <HelperBar {...props}
                 readyCallback={props.joinCallback} />
    </div>
  );
}

export default PregameView;
