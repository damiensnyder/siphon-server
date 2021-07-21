import React, {useEffect} from 'react';

import CreateMenu from './create-menu';
import JoinMenu from './join-menu';
import general from '../general.module.css';
import styles from './main.module.css';

function HomeView(): React.ReactElement {
  useEffect(() => {
    document.title = "Siphon State";
  });

  return (
    <div id={styles.mainBody}>
      <h1>Siphon State</h1>
      <div className={general.responsiveHorizWrapper}>
        <CreateMenu />
        <JoinMenu />
      </div>
    </div>
  );
}

export default HomeView;
