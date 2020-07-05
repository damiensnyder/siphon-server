import React from 'react';

import PolCategory from '../pol-category';
import styles from './game-controls.module.css';

function GameControls() {
  const gs = this.props.gs;
  const self = gs.parties[gs.pov];
  const runnable = [];
  const symps = [];

  for (let i = 0; i < self.pols.length; i++) {
    let pol = self.pols[i];
    if (gs.pols[pol].runnable) {
      runnable.push(pol);
    }
  }

  for (let i = 0; i < self.symps.length; i++) {
    symps.push(self.symps[i]);
  }

  return (
    <div className={styles.outerWrapper}>
      <div className={styles.innerWrapper}>
        <div>
          <PolCategory gs={gs}
                       callback={this.props.callback}
                       type={"Available"}
                       inProvince={false}
                       pols={runnable} />
        </div>
        <div>
          <PolCategory gs={gs}
                       callback={this.props.callback}
                       type={"Sympathizers"}
                       inProvince={false}
                       pols={symps} />
        </div>
      </div>
    </div>
  );
}

export default GameControls;
