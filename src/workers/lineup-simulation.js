self.addEventListener('message',  e => {
  let lineup = [];
  // For each player in lineup create a hitter
  for(let p = 0; p < e.data.lineup.length; p++) {
    let hitter = new hitter(e.data.lineup[p].plateAppearances);
    lineup.push(hitter);
  }

  const numberOfGamesToSimulate = 10000;
  const INNINGS_PER_GAME = 7;
  const VERBOSE = false;

  let totalScore = 0;
  // Full Simulation
  for (let i = 0; i < numberOfGamesToSimulate; i++) {

    // Game
    let gameScore = 0;
    let hitterIndex = 0;
    for (let inning = 0; INNINGS_PER_GAME > inning; inning++) {

      let first = false;
      let second = false;
      let third = false;

      // Inning
      let outs = 0;
      while (outs < 3) {
        let h = lineup[hitterIndex];
        let bases = h.hit();
        if (bases > 0) {
          // Move runners around the bases and add to the score
          let runsResultingFromHit = 0;
          for (let i = 0; i < bases; i++) {
            // TODO: Consider the runner scoring from 2nd.
            runsResultingFromHit += this.third ? 1 : 0;
            this.third = this.second;
            this.second = this.first;
            this.first = (i == 0) ? true : false;
          }
          gameScore += runsResultingFromHit;
        } else {
          outs++;
        }
        hitterIndex = (hitterIndex + 1) % lineup.length;

        if (VERBOSE) {
          let message =
                  "\t hit:" + mapBasesToHitType(bases) +
                  "\t outs:" + outs +
                  "\t score:" + gameScore;
          console.log(message);
        }
      }
      if (VERBOSE) {
        console.log("--------------");
      }

      // Clear the bases
      this.first = false;
      this.second = false;
      this.third = false;
    }
    if (VERBOSE) {
      console.log("Runs Scored: " + gameScore);
      console.log("=============================================================");
    }
    totalScore += gameScore;
    lineup.reset();
  }

})

function mapBasesToHitType(bases) {
  switch (bases) {
  case 0:
    return "out";
  case 1:
    return "single";
  case 2:
    return "double";
  case 3:
    return "triple";
  case 4:
    return "homerun";
  default:
    throw Error(`Unrecognized hit type: ${bases}`);
  }
}