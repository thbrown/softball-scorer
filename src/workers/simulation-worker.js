// TODO: minify
self.addEventListener('message', e => {
  let message = JSON.parse(e.data);
  let lineup = [];

  let time = new Date().getTime();

  // Empty lineup returns a score of 0
  if (message.lineup.length === 0) {
    let response = {};
    response.score = 0;
    response.time = 0;
    self.postMessage(JSON.stringify(response));
    return;
  }

  // Convert results to hit number for each player in the lineup
  for (let p = 0; p < message.lineup.length; p++) {
    let historicHits = [];
    for (let hit = 0; hit < message.lineup[p].length; hit++) {
      if (message.lineup[p][hit]) {
        historicHits.push(mapResultToHitType(message.lineup[p][hit]));
      }
    }
    lineup.push(historicHits);
  }

  const numberOfGamesToSimulate = message.iterations;
  const INNINGS_PER_GAME = message.innings;
  const VERBOSE = false;
  const MAX_RUNS = 100;

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
      while (outs < 3 && gameScore < MAX_RUNS) {
        let h = lineup[hitterIndex]; // TODO: Alternating gender lineup
        let bases = hit(h);
        if (bases > 0) {
          // Move runners around the bases and add to the score
          let runsResultingFromHit = 0;
          for (let i = 0; i < bases; i++) {
            // TODO: Consider the runner scoring from 2nd.
            runsResultingFromHit += third ? 1 : 0;
            third = second;
            second = first;
            first = (i == 0) ? true : false;
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
      first = false;
      second = false;
      third = false;
    }
    if (VERBOSE) {
      console.log("Runs Scored: " + gameScore);
      console.log("=============================================================");
    }
    totalScore += gameScore;
  }
  console.log('Lineup avg runs', totalScore / numberOfGamesToSimulate);
  let response = {};
  response.score = totalScore / numberOfGamesToSimulate;
  if (response.score > MAX_RUNS) {
    response.score = MAX_RUNS;
  }
  response.time = (new Date().getTime() - time);
  self.postMessage(JSON.stringify(response));
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
      throw Error(`Unrecognized bases count: ${bases}`);
  }
}

function mapResultToHitType(result) {
  switch (result) {
    case "Out":
    case "SAC":
    case "FC":
    case "K":
    case "E":
      return 0;
    case "1B":
    case "BB":
      return 1;
    case "2B":
      return 2;
    case "3B":
      return 3;
    case "HRi":
    case "HRo":
      return 4;
    default:
      throw Error(`Unrecognized hit type: ${result}`);
  }
}

function hit(historicalHits) {
  var hit = generateRandomInteger(0, historicalHits.length - 1);
  return historicalHits[hit];
}

function generateRandomInteger(min, max) {
  // TODO: use secure random? A bad rng will likely affect the quality of the simulation
  return Math.floor(min + Math.random() * (max + 1 - min));
}