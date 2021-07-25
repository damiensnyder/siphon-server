import * as React from "react";

import general from "../../general.module.css";
import styles from "./players.module.css";

interface PartyProps {
  gs: any,
  index: number,
  callback: any
}

function ownFundsJsx(amount: number): JSX.Element {
  return (
    <span className={styles.funds}>
      Funds: {"$" + (amount * 100000).toLocaleString()}
    </span>
  );
}

function offersJsx(offers): JSX.Element {
  let totalAmount: number = 0;
  offers.forEach((offer) => {totalAmount += offer.amount});
  return (
    <span className={styles.funds}>
      Offered you: {"$" + (totalAmount / 10) + "M"}
    </span>
  );
}

function replaceBtnJsx(props: PartyProps) {
  return (
    <div className={styles.funds}>
      <button className={general.actionBtn}
          onClick={() => props.callback('replace', props.index)}>
        Replace
      </button>
    </div>
  );
}

function paymentJsx(props: PartyProps) {
  return null;
}

function Player(props: PartyProps) {
  const self = props.gs.parties[props.index];
  let nameStyle: string = styles.partyInfo;
  if (props.gs.pov == props.index) {
    nameStyle += " " + styles.ownParty;
  } else if (props.gs.suspender === props.index) {
    nameStyle += " " + styles.suspender;
  } else if (props.gs.priority == props.index) {
    nameStyle += " " + styles.priority;
  }

  const showReplace: boolean = props.gs.pov === undefined && !self.connected;
  const showOffers: boolean = self.offers.length > 0 &&
      self.offers[0].fromParty != props.gs.pov;
  const showPayment: boolean = props.gs.started &&
      !props.gs.ended &&
      props.gs.stage == 2 &&
      props.gs.pov !== undefined &&
      !props.gs.parties[props.gs.pov].ready;
  const showFunds: boolean = props.gs.started &&
      !props.gs.ended &&
      props.gs.pov === props.index;

  return (
    <div className={styles.partyOuter + " " +
        (self.ready ? styles.ready : "")}>
      <div className={nameStyle}>
        <span className={styles.partyName}>
          {self.name}
        </span>
        <div className={styles.abbrAndVotes}>
          <span className={styles.partyAbbr}>{self.abbr}</span>
          <span className={styles.votes}>
            {showOffers ? offersJsx(self.offers) : null}
          </span>
        </div>
      </div>
      {showReplace ? replaceBtnJsx(props) : null}
      {showPayment ? paymentJsx(props) : null}
      {showFunds ? ownFundsJsx(self.funds) : null}
    </div>
  );
}

export default Player;
