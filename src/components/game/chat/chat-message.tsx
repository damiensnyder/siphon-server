import * as React from "react";

import {Message, MessageSender} from "../../../backend/game-room";
import styles from "./chat.module.css";

function senderStyle(senderType: MessageSender): string {
  return senderType === MessageSender.self ? styles.selfSender : styles.sender;
}

function ChatMessage(props: Message): JSX.Element {
  if (props.senderType === MessageSender.system) {
    return (
      <div>
        <span className={styles.systemMsg}>{props.text}</span>
      </div>
    );
  }

  return (
    <div>
      <span className={senderStyle(props.senderType)}>
        {props.sender}:
      </span>
      &nbsp;&nbsp;{props.text}
    </div>
  );
}

export default ChatMessage;