// @ts-ignore
const Generator = require('./content-generator');

interface Party {
  name: string,
  abbr: string,
  ready: boolean,
  connected: boolean,
  funds: number,
  votes: number,
  baseSupport: number,
  sympathetic: number[],
  bribed: number[],
  offers: any[],
  hitAvailable: boolean,
  pmChoice: boolean
}

interface HiddenInfo {
  bribed: number[][],
  sympathetic: number[][],
  offers: any[][],
  funds: number[],
  contentGenerator: typeof Generator
}

export default class GameState {
  hasStarted: boolean;
  hasEnded: boolean;
  priority: number;
  pov: number;
  turn: number;
  rounds: number;
  stage: number;
  decline: number;
  
  pols: typeof Generator.Pol[];
  parties: Party[];
  provs: typeof Generator.Prov[];
  officials: number[];
  primeMinister: number;
  suspender: number;
  settings: any;
  contentGenerator: typeof Generator;

  constructor(settings) {
    this.settings = settings;
    this.hasStarted = false;
    this.hasEnded = false;
    this.priority = -1;
    this.pov = -1;
    this.turn = -1;
    this.rounds = -1;
    this.stage = 1;
    this.decline = -1;
    
    this.contentGenerator = new Generator.ContentGenerator(settings.nation);
  
    this.pols = [];
    this.parties = [];
    this.provs = this.contentGenerator.provs;
    this.officials = [];
    this.primeMinister = null;
    this.suspender = null;
  }

  addParty(name: string, abbr: string): void {
    this.parties.push({
      name: name,
      abbr: abbr,
      ready: false,
      connected: true,
      funds: 0,
      votes: 0,
      baseSupport: 3,
      sympathetic: [],
      offers: [],
      bribed: [],
      hitAvailable: false,
      pmChoice: false
    });
  }

  // Returns true if all parties are ready, false otherwise.
  allReady(): boolean {
    for (let i = 0; i < this.parties.length; i++) {
      if (!this.parties[i].ready) {
        return false;
      }
    }
    return true;
  }

  commitAll(): void {
    this.parties.forEach((party) => {
      party.ready = false;
    });

    if (!this.hasStarted) {
      this.hasStarted = true;
      this.beginRace();
    } else if (this.stage === 1) {
      this.advanceRaceRound();
    } else if (this.stage === 2) {
      this.tallyVotes();
    } else if (this.stage === 3) {
      this.checkIfGameWon();
    }
  }

  /*
  ====
  RACE
  ====
  */

  beginRace(): void {
    // Increase decline and give priority to the prime minister's party (if
    // there is one) or party after the last party to have priority.
    if (this.primeMinister != null) {
      this.priority = this.pols[this.primeMinister].party;

      this.parties.forEach((party: Party, partyIndex: number) => {
        if (partyIndex == this.priority) {
          party.offers.forEach((offer) => {
            this.parties[offer.target].funds += offer.amount;
          });
        } else {
          party.offers.forEach((offer) => {
            this.parties[partyIndex].funds += offer.amount;
          });
        }
        party.offers = [];
      });
    } else {
      this.priority = (this.priority + 1) % this.parties.length;
    }
    this.stage = 1;
    this.rounds = 0;
    this.decline += 1;

    // Give all parties $6M, and bonus money to the prime minister's party.
    this.parties.forEach((party: Party) => {
      party.funds += 60;
    });

    this.updateBaseSupport();
    this.givePmBonus();
    this.replenishCandidates();

    if (this.decline >= 1) {
      this.giveSympathizers(1);
    }
    if ((this.decline % 3) == 2) {
      this.parties.forEach((party: Party) => {
        party.hitAvailable = true;
      });
    }

    this.officials = [];
  }

  // Return all officials to be candidates in their province with a +1 bonus to
  // support, then refill the province with candidates until each party has one
  // per seat.
  replenishCandidates(): void {
    this.provs.forEach((prov: Prov) => {
      // Put all the officials back as candidates in their province.
      const returningCandidates = [];
      let returningPerParty = Array(this.parties.length).fill(0);
      prov.candidates.forEach((polIndex: number) => {
        const pol: Pol = this.pols[polIndex];
        returningCandidates.push(polIndex);
        pol.support = this.parties[pol.party].baseSupport;
        returningPerParty[pol.party] += 1;
      });
      prov.candidates = returningCandidates;

      // Give each party new politicians in the province until they have one
      // per seat.
      this.parties.forEach((party: Party, partyIndex: number) => {
        while (returningPerParty[partyIndex] < prov.seats) {
          const newPol: Pol = this.contentGenerator.newPol(partyIndex);
          const tiebreaker: number = returningPerParty[partyIndex] /
              (this.parties.length * prov.seats * 2);
          newPol.support = party.baseSupport + tiebreaker;
          newPol.adsBought = 0;

          this.pols.push(newPol);
          prov.candidates.push(this.pols.length - 1);
          returningPerParty[partyIndex]++;
        }
      });

      prov.candidates.sort((a: number, b: number) => {
        return this.pols[b].support - this.pols[a].support;
      });
    });
  }

  // Assign each party a base support value, such that the highest-priority
  // parties have the lowest-priority candidates (when it comes to
  // tiebreakers in support). Regress parties with base support higher or lower
  // than 5 back to 5 by one.
  updateBaseSupport(): void {
    this.parties.forEach((party: Party, partyIndex: number) => {
      let previousSupport: number = Math.round(party.baseSupport);
      const partyPriority: number = (partyIndex - this.priority +
          this.parties.length) % this.parties.length;

      if (previousSupport < 3) {
        previousSupport++;
      }
      party.baseSupport = previousSupport +
          partyPriority / (this.parties.length * 2);
    });
  }

  // Give a bonus to the party with the prime minister, if there is one,
  // depending on the amount of decline and the choice the player made.
  givePmBonus(): void {
    const numOtherParties: number = this.parties.length - 1;
    if (this.primeMinister != null) {
      const pmParty: Party = this.parties[this.priority];
      if (this.decline == 1) {
        if (pmParty.pmChoice) {
          pmParty.funds += 5 * numOtherParties;
        } else {
          pmParty.baseSupport += 1;
        }
      } else if (this.decline == 2) {
        if (pmParty.pmChoice) {
          pmParty.funds += 10 * numOtherParties;
        } else {
          pmParty.baseSupport += 2;
        }
      } else if (pmParty.pmChoice) {
        pmParty.baseSupport += this.decline - 2;
        pmParty.funds += 30 * numOtherParties;
        this.suspender = this.priority;
      } else {
        this.suspender = null;
      }
    }
  }

  // Give the specified number of sympathizers to each player, but don't give
  // any player sympathizers from their own party or the party that suspended
  // the constitution.
  giveSympathizers(amountPerPlayer: number): void {
    // Add all running politicians to the list of possible sympathizers.
    const runningPols = [];
    this.provs.forEach((prov) => {
      prov.candidates.forEach((polIndex) => {
        runningPols.push(polIndex);
      });
    });

    // Remove all candidates who are already bribed from the list of possible
    // sympathizers.
    this.parties.forEach((party: Party) => {
      party.bribed.forEach((polIndex: number) => {
        runningPols.splice(runningPols.indexOf(polIndex), 1);
      });
    });

    // For each party, go down the list of possible sympathizers, skipping any
    // that are disqualified because they are in the same party, until a
    // sufficient number have been given or the end of the list has been
    // reached. Sympathizers are removed from the list when given.
    this.parties.forEach((party: Party, partyIndex: number) => {
      party.sympathetic = [];
      for (let i = 0; i < runningPols.length; i++) {
        const polParty = this.pols[runningPols[i]].party
        if (party.sympathetic.length < amountPerPlayer &&
            (this.primeMinister == null || polParty != this.priority) &&
            polParty !== partyIndex) {
          party.sympathetic.push(runningPols[i]);
          runningPols.splice(i, 1);
          i--;
        }
      }
    });
  }

  // Set the ads bought for all politicians to 0. If removeUnfundedPols is
  // true, remove all politicians with no ads bought unless the province has
  // no politicians with ads bought.
  resetAdsBought(removeUnfundedPols: boolean): void {
    this.provs.forEach((prov: Prov) => {
      // Check if there are any politicians with funding in the province
      let allUnfunded = true;
      prov.candidates.forEach((polIndex: number) => {
        if (this.pols[polIndex].adsBought) {
          allUnfunded = false;
        }
      });
      // Remove unfunded politicians if appropriate
      if (removeUnfundedPols && !allUnfunded) {
        prov.candidates = prov.candidates.filter((polIndex: number) => {
          return this.pols[polIndex].adsBought > 0;
        });
      }
      // Reset all politicians to have 0 ads bought
      prov.candidates.forEach((polIndex: number) => {
        this.pols[polIndex].adsBought = 0;
      });
    });
  }

  // Advance to the next round of the race. If it has been 3 rounds, advance to
  // the voting stage.
  advanceRaceRound(): void {
    this.rounds++;
    if (this.rounds === 3) {
      this.beginVoting();
    }
  }

  /*
  ======
  VOTING
  ======
  */

  beginVoting(): void {
    this.officials = [];
    
    // The leading candidate in each province becomes an official.
    this.provs.forEach((prov) => {
      prov.candidates.sort((a: number, b: number) => {
        return this.pols[b].support - this.pols[a].support;
      });
      for (let i = 0; i < prov.seats && i < prov.candidates.length; i++) {
        this.officials.push(prov.candidates[i]);
      }
    });
    
    this.stage = 2;
    this.rounds = 0;
    this.resetVotes();

    // If there are no officials, skip to the next stage.
    if (this.officials.length === 0) {
      this.beginChoice();
    } else if (this.officials.length === 1) {
      this.primeMinister = this.officials[0];
      this.beginChoice();
    }
  }

  // Reset all officials' vote totals and parties' usable votes to 0, then give
  // all parties votes equal to the number of officials they have in the
  // prov.
  resetVotes(): void {
    this.parties.forEach((party)=> {
      party.votes = 0;
      party.sympathetic = [];
    });
    this.officials.forEach((polIndex) => {
      this.pols[polIndex].support = 0;
      this.parties[this.pols[polIndex].party].votes++;
    });
  }

  // Count each official's votes. If there is a winner, elect them and begin
  // distribution. Otherwise, start the voting again.
  tallyVotes(): void {
    const sortedOfficials: number[] =
        this.officials.slice().sort(this.compareByVotesAndPriority.bind(this));

    // If the election was not disputed, elect the winner. If it was disputed
    // and this was the third voting round, elect the official belonging to the
    // highest-priority party. Otherwise, reset every politician's votes and
    // start again.
    if (this.officials.length == 0) {
      this.beginChoice();
    } else if (this.officials.length > 1 &&
        this.rounds < 3 &&
        (this.pols[sortedOfficials[0]].support ==
         this.pols[sortedOfficials[1]].support)) {
      this.rounds++;
      this.resetVotes();
    } else {
      this.officials = sortedOfficials
      this.primeMinister = this.officials[0];
      this.beginChoice();
    }
  }

  // Compare two candidates such that a candidates whose party has higher
  // priority is less than a candidate who doesn't, and a candidate with more
  // support is less, which supersedes that.
  compareByVotesAndPriority(a: number, b: number): number {
    if (this.pols[b].support != this.pols[a].support) {
      return this.pols[b].support - this.pols[a].support;
    }
    const priority = (partyIndex: number) => {
      return (partyIndex - this.priority) % this.parties.length;
    };
    return priority(this.pols[a].party) - priority(this.pols[b].party);
  }

  /*
  ======
  CHOICE
  ======
  */

  beginChoice(): void {
    this.stage = 3;
    this.parties.forEach((party: Party) => {
      party.pmChoice = false;
    });
    if (this.officials.length == 0) {
      this.primeMinister = null;
      this.checkIfGameWon();
    }
  }

  // End the game if a player suspended the constitution and won prime minister
  // in the next race. If a player suspended the constitution and did not win,
  // remove all their funds and give them a penalty to support. If the game has
  // not hasEnded, begin a new race.
  checkIfGameWon(): void {
    if (this.primeMinister != null &&
        this.suspender === this.pols[this.primeMinister].party) {
      this.hasEnded = true;
    } else if (this.suspender !== null) {
      this.parties[this.suspender].baseSupport = -1;   // becomes 0 before race
      this.parties[this.suspender].funds = 0;
    }

    // If there was no winner, advance to the next prov and begin nomination.
    if (!this.hasEnded) {
      this.beginRace();
    }
  }

  /*
  ========================
  ACTIONS PLAYERS CAN TAKE
  ========================
  */

  // Offer the given amount of funds to the target if the party offering wins
  // the prime minister (and the prime minister doesn't get flipped). Returns
  // true if the offer is valid, false otherwise.
  offer(partyIndex: number, offerInfo): boolean {
    if (offerInfo.amount <= this.parties[partyIndex].funds + 60 &&
        offerInfo.target < this.parties.length &&
        offerInfo.target >= 0) {
      this.parties[partyIndex].funds -= offerInfo.amount;
      this.parties[partyIndex].offers.push(offerInfo);
      return true;
    }
    return false;
  }

  // Buy an ad for the given politician, increasing their support.
  ad(partyIndex: number, polIndex: number): void {
    const party: Party = this.parties[partyIndex];
    const pol: Pol = this.pols[polIndex];
    if (pol.party === partyIndex &&
        party.funds >= pol.adsBought + 1 &&
        this.stage === 1) {
      pol.adsBought++;
      party.funds -= pol.adsBought;
      this.pols[polIndex].support++;
    }
  }

  // Smear the given politician, decreasing their support.
  smear(partyIndex: number, polIndex: number): void {
    const party: Party = this.parties[partyIndex];
    const pol: Pol = this.pols[polIndex];
    if (pol.party !== partyIndex &&
        party.funds >= pol.adsBought + 1 &&
        pol.support >= 1 &&
        this.stage === 1 &&
        this.rounds !== 0) {
      pol.adsBought++;
      party.funds -= pol.adsBought;
      this.pols[polIndex].support--;
    }
  }

  // Bribe the given politician, making them a member of your party.
  bribe(partyIndex: number, polIndex: number): void {
    const party: Party = this.parties[partyIndex];
    if (party.sympathetic.length > 0 && 
        party.funds >= 20 + 10 * this.rounds &&
        party.sympathetic.includes(polIndex)) {
      party.bribed.push(polIndex);
      party.sympathetic.splice(party.sympathetic.indexOf(polIndex), 1);
      party.funds -= 20 + 10 * this.rounds;
    }
  }

  // Transfer the symp from their old party to their new party.
  flip(partyIndex: number, polIndex: number): void {
    const party = this.parties[partyIndex];
    if (party.bribed.includes(polIndex) && this.stage >= 2) {
      
      // If they were an official, transfer their vote from their old party to
      // their new party
      if (this.officials.includes(polIndex) && this.stage === 2) {
        this.parties[this.pols[polIndex].party].votes--;
        party.votes++;
      }
      
      this.pols[polIndex].party = partyIndex;
      party.bribed.splice(party.bribed.indexOf(polIndex), 1);
    }
  }

  // Call a hit the given politician, removing them from the game.
  hit(partyIndex: number, polIndex: number) {
    const party: Party = this.parties[partyIndex];
    let cost: number = this.stage >= 2 ? 50 : 25;
    if (partyIndex == this.priority && this.primeMinister != null) {
      cost += 25;
    }
    if (party.funds >= cost &&
        party.hitAvailable &&
        this.pols[polIndex].party !== this.suspender) {
      if (this.officials.includes(polIndex)) {
        this.officials.splice(this.officials.indexOf(polIndex), 1);
      }
      this.provs.forEach((prov: Prov) => {
        if (prov.candidates.includes(polIndex)) {
          prov.candidates.splice(prov.candidates.indexOf(polIndex), 1);
          party.funds -= cost;
          party.hitAvailable = false;
        }
      })
    }
  }

  // Assign one vote from the given party to the given politician.
  vote(partyIndex: number, polIndex: number): void {
    if (this.parties[partyIndex].votes > 0 &&
        polIndex < this.pols.length &&
        polIndex >= 0 &&
        this.stage === 2) {
      this.pols[polIndex].support += 1;
      this.parties[partyIndex].votes--;
    }
  }

  // Choose between the two prime minister options.
  choose(partyIndex: number, choice: boolean): void {
    this.parties[partyIndex].pmChoice = choice;
  }

  // Censor secret info so the gamestate can be sent to the client, and return
  // it so it can be retrieved later.
  setPov(pov: number): HiddenInfo {
    this.pov = pov;
    const contentGenerator: typeof Generator = this.contentGenerator;
    delete this.contentGenerator;

    // Delete the hidden information of other players
    const bribed: number[][] = [];
    const sympathetic: number[][] = [];
    const offers: any[][] = [];
    const funds: number[] = [];
    this.parties.forEach((party: Party, partyIndex: number) => {
      bribed.push(party.bribed);
      sympathetic.push(party.sympathetic);
      offers.push(party.offers);
      funds.push(party.funds);
      if (partyIndex !== pov) {
        delete party.bribed;
        delete party.sympathetic;
        party.offers = party.offers.filter((offer: any) => {
          return offer.target == pov;
        });
        delete party.funds;
      }
    });

    return {
      bribed: bribed,
      sympathetic: sympathetic,
      offers: offers,
      funds: funds,
      contentGenerator: contentGenerator
    }
  }

  // Uncensor stored secret info.
  unsetPov(hiddenInfo: HiddenInfo): void {
    this.pov = undefined;
    this.contentGenerator = hiddenInfo.contentGenerator;

    this.parties.forEach((party: Party, partyIndex: number) => {
      party.bribed = hiddenInfo.bribed[partyIndex];
      party.sympathetic = hiddenInfo.sympathetic[partyIndex];
      party.offers = hiddenInfo.offers[partyIndex];
      party.funds = hiddenInfo.funds[partyIndex];
    });
  }
}
