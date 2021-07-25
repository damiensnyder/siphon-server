import * as React from "react";

import CreateMenu from "./create-menu";
import JoinMenu from "./join-menu";
import general from "../general.module.css";
import styles from "./main.module.css";

function HomeView(): JSX.Element {
  React.useEffect(() => {
    document.title = "Siphon Server";
  });

  return (
    <div id={styles.mainBody}>
      <h1>Siphon Server</h1>
      <div className={general.responsiveHorizWrapper}>
        <CreateMenu />
        <JoinMenu />
      </div>
    </div>
  );
}

export default HomeView;
