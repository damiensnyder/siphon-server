import * as React from "react";
import Router from "next/router";

import general from "../general.module.css";
import styles from "./join-menu.module.css";
import {RoomInfo} from "../../backend/game-room";
import {RoomStatus} from "../../backend/gamestate";

type GameStatusString = "Ended" | "In game" | "In lobby";

function joinRoom(roomCode: string) {
  Router.push(`/game/${roomCode}`).then();
}

function gameStatusString(gameStatus: RoomStatus): GameStatusString {
  switch (gameStatus) {
    case RoomStatus.pregame: return "In lobby";
    case RoomStatus.midgame: return "In game";
    case RoomStatus.postgame: return "Ended";
  }
}

function RoomItem(props: RoomInfo): JSX.Element {
  return (
    <div className={styles.gameItemOuter}>
      <div className={styles.gameItemInner}>
        <div className={styles.gameInfo}>
          <div>Name: {props.roomName}</div>
          <div>Players: {props.players}</div>
          <div>Status: {gameStatusString(props.gameStatus)}</div>
        </div>
        <button className={general.actionBtn}
                onClick={() => joinRoom(props.roomCode)}>
          Join
        </button>
      </div>
    </div>
  );
}

export default RoomItem;
