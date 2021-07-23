import * as React from 'react';

// @ts-ignore
import styles from './chat.module.css';

function senderStyle(isSelf: boolean) {
  return isSelf ? styles.selfSender : styles.sender;
}

function ChatMessage(props) {
  if (props.msg.isSystem) {
    return (
      <div>
        <span className={styles.systemMsg}>{props.msg.text}</span>
      </div>
    );
  }

  return (
    <div>
      <span className={senderStyle(props.msg.isSelf)}>
        {props.msg.sender}:
      </span>
      &nbsp;&nbsp;{props.msg.text}
    </div>
  );
}

export default ChatMessage;
