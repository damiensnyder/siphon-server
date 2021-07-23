class GamestateManager {
  handlers: any;
  gs: any;

  constructor() {
    this.gs = {
      parties: [],
      pov: -1,
      started: false,
      ended: false,
      settings: {
        name: "Loading..."
      }
    };

    this.handlers = {
      'connection': this.handleConnect,
      'join': this.handleJoin,
      'replace': this.handleReplace,
      'ready': this.handleReady,
      'disconnect': this.handleDisconnect,
      'gameAction': this.handleGameAction,
      'newreplace': this.handleNewReplace,
      'newready': this.handleNewReady,
      'newdisconnect': this.handleNewDisconnect
    }
    this.currentReady = this.currentReady.bind(this);
    this.ownPov = this.ownPov.bind(this);
  }

  setGs(gs): void {
    // Set the gamestate to the received gamestate, and add helper variables
    // to keep track of the current province and the player's party.
    this.gs = gs;
  }

  updateAfter(type: string, actionInfo?: any): void {
    this.handlers[type].bind(this)(actionInfo);
  }

  currentReady(): boolean {
    if (!this.gs.parties[this.gs.pov].ready) {
      return false;
    } else if (!this.gs.started || this.gs.ended) {
      return true;
    }
  }

  handleConnect() {
    if (this.ownPov() !== undefined) {
      this.ownPov().connected = true;
    }
  }

  handleJoin() {

  }

  handleReplace(target) {
    this.gs.parties[target].connected = true;
    this.gs.pov = target;
  }

  handleReady() {
    this.ownPov().ready = !this.ownPov().ready;
  }

  handleDisconnect() {
    if (this.ownPov() !== undefined) {
      this.ownPov().connected = false;
    }
  }

  handleGameAction(actionInfo?: any) {

  }

  handleNewReplace(partyIndex): void {
    this.gs.parties[partyIndex].connected = true;
  }

  handleNewReady(readyInfo): void {
    this.gs.parties[readyInfo.party].ready = readyInfo.isReady;
  }

  handleNewDisconnect(partyIndex): void {
    this.gs.parties[partyIndex].connected = false;
  }
  
  ownPov() {
    return this.gs.parties[this.gs.pov];
  }
}

export default GamestateManager;
