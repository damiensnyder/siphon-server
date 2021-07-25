import React from "react";

import JoinPanel from "./join-panel";
import InviteLink from "./invite-link";
import general from "../../general.module.css";
import styles from "./pregame.module.css";
import HelperBar from "../helper-bar/helper-bar";
import {JoinInfo, PlayerInfo, RoomInfo} from "../../../backend/game-room";
import {PartialGameState} from "../../../backend/gamestate";

interface PregameViewProps extends PartialGameState, RoomInfo {
  joinCallback: (joinInfo: JoinInfo) => void,
  playersList: PlayerInfo[]
}

function PregameView(props: PregameViewProps) {
  return (
    <div className={`${general.outerWrapper}
                     ${general.horizWrapper}
                     ${styles.panelContainer}`}>
      {typeof(props.pov) !== "number" ?
          <JoinPanel joinCallback={props.joinCallback}
                     roomCode={props.roomCode} /> :
          <InviteLink roomCode={props.roomCode} />}
      <HelperBar {...props}
                 readyCallback={props.joinCallback} />
    </div>
  );
}

export default PregameView;
