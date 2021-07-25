import * as React from "react";

import Player from "./player";
// @ts-ignore
import styles from "./players.module.css";

function partiesToJsx(gs, callback) {
  const partiesJsx = [];
  for (let i = 0; i < gs.parties.length; i++) {
    partiesJsx.push(
      <Player key={i}
              index={i}
              gs={gs}
              callback={callback} />
    );
  }
  return partiesJsx;
}

function PlayersView(props) {
  return (
    <div id={styles.partiesWrapper}>
      <h2 id={styles.gameName}>
        {props.gs.settings.name}
      </h2>
      {partiesToJsx(props.gs, props.callback)}
    </div>
  );
}

export default PlayersView;
