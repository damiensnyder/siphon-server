import * as React from "react";

import {Message} from "../main";
import ChatMessage from "./chat-message";
import general from "../../general.module.css";
import styles from "./chat.module.css";

interface ChatProps {
  messages: Message[],
  chatCallback: (msg: string) => void
}

interface ChatState {
  currentMsg: string
}

export default class Chat extends React.Component<ChatProps, ChatState> {
  textInput: any;
  messagesInner: any;
  bottomMessage: any;
  messageJustSent: any;

  constructor(props) {
    super(props);

    this.state = {
      currentMsg: ""
    };

    this.textInput = React.createRef();
    this.messagesInner = React.createRef();
    this.bottomMessage = React.createRef();
    this.messageJustSent = false;

    this.handleTyping = this.handleTyping.bind(this);
    this.checkIfEnterPressed = this.checkIfEnterPressed.bind(this);
    this.sendMsg = this.sendMsg.bind(this);
  }

  msgsJsx(): JSX.Element[] {
    return this.props.messages.map((msg, i) => {
      return <ChatMessage msg={msg} key={i} />;
    });
  }

  handleTyping(event: React.ChangeEvent<HTMLInputElement>) {
    this.setState({currentMsg: event.target.value});
  }

  checkIfEnterPressed(key: React.KeyboardEvent<HTMLInputElement>) {
    if (key.code === "Enter") {
      this.sendMsg();
      this.textInput.current.focus();
    }
  }

  sendMsg() {
    const newMsg = this.state.currentMsg.trim();
    if (newMsg.length > 0) {
      this.props.chatCallback(newMsg);

      // Update the message box and scroll to the bottom of the chat log
      this.setState({
        currentMsg: ""
      });
      this.messageJustSent = true;
    }
  }

  // Scroll to the bottom of the chat log, only if the user just sent a message
  // themselves or they are already scrolled to within 50 pixels of the bottom
  // of the chat log.
  scrollToBottom() {
    let p = this.messagesInner.current;
    if (this.messageJustSent ||
        p.scrollHeight - p.scrollTop < p.clientHeight + 50) {
      this.bottomMessage.current.scrollIntoView(false);
      this.messageJustSent = false;
    }
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  render(): JSX.Element {
    return (
      <div id={styles.chatContainer}>
        <div id={styles.messagesOuter}>
          <div id={styles.messagesInner}
               ref={this.messagesInner}>
            {this.msgsJsx()}
            <div id={styles.bottomMessage}
                 ref={this.bottomMessage} />
          </div>
        </div>
        <div id={styles.inputRow}>
          <input id={styles.inputBox}
                 placeholder="Chat here"
                 value={this.state.currentMsg}
                 onChange={this.handleTyping}
                 onKeyDown={this.checkIfEnterPressed}
                 ref={this.textInput} />
          <button className={general.actionBtn}
                  id={styles.sendBtn}
                  onClick={this.sendMsg}>
            Send
          </button>
        </div>
      </div>
    );
  }
}
