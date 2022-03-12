import CommonUtils from '../utils/common-utils';
import ReactDOMServer from 'react-dom/server';
import React from 'react';

/*
 * We want to re-use the HTML we use for the results accordion in the optimization complete email. This file contains the common logic.
 */
const getResultsAsJsx = function (result, inputSummaryData) {
  let resultData = result ? JSON.parse(result) : undefined;
  let stats = inputSummaryData ? JSON.parse(inputSummaryData) : {};

  let optimizer = '-';
  let humanDetails = '-';
  let bestScore = '-';
  let bestPlayers = [];
  let progress = '-';
  let elapsedTime = '-';
  let lineupType = '-';
  if (resultData && resultData.lineup) {
    lineupType = resultData.lineupType;
    optimizer = resultData.optimizer;
    humanDetails = resultData.humanReadableDetails;
    bestScore = resultData.lineupScore;

    // Elapsed time format
    elapsedTime = `Elapsed Time: ${
      resultData.elapsedTimeMs
    }ms ~${CommonUtils.secondsToString(
      Math.round(resultData.elapsedTimeMs / 1000)
    )}`;

    // Completion % format
    let completed = resultData.countCompleted;
    let total = resultData.countTotal;
    if (total === 0) {
      progress = <div>0%</div>;
    } else if (completed === total) {
      progress = (
        <div>
          100% Complete<br></br>
          {elapsedTime}
        </div>
      );
    } else {
      progress = (
        <div>
          {completed} of {total} ({((completed / total) * 100).toFixed(1)}%)
          <br></br>
          {elapsedTime}
        </div>
      );
    }

    // Format lineup, we want names and stats, not ids
    const PLAYER_DELETED_MSG = '<Player was deleted>';
    const PLAYER_NAME_MAX_LENGTH = 25;
    let maxNameLength = Math.max.apply(
      Math,
      resultData.flatLineup.map(function (id) {
        return inputSummaryData[id]
          ? inputSummaryData[id].name.length
          : PLAYER_DELETED_MSG.length;
      })
    );
    maxNameLength = Math.min(maxNameLength, PLAYER_NAME_MAX_LENGTH);

    bestPlayers.push(
      <div key={'header'}>
        <i>{'Player '.padEnd(maxNameLength) + '   AVG   SLG'}</i>
        <br />
      </div>
    );
    for (let i = 0; i < resultData.flatLineup.length; i++) {
      let playerStats = stats[resultData.flatLineup[i]];
      if (!playerStats) {
        bestPlayers.push(
          <div key={i}>
            {PLAYER_DELETED_MSG}
            <br />
          </div>
        );
      } else {
        bestPlayers.push(
          <div key={i}>
            {CommonUtils.truncate(
              playerStats.name.padEnd(maxNameLength),
              PLAYER_NAME_MAX_LENGTH + 1
            ) +
              ' ' +
              playerStats.battingAverage.padStart(5) +
              ' ' +
              playerStats.sluggingPercentage /*+ 
              ' ' +
              playerStats.hits +
              ' ' +
              playerStats.atBats +
              ' ' +
              playerStats.outs +
              ' ' +
              playerStats.directOuts+
              ' ' +
              playerStats.FCs +
              ' ' +
              playerStats.strikeouts +
              ' ' +
              playerStats.reachedOnError +
              ' ' +
              playerStats.hits +
              ' ' + 
              playerStats.singles+
              ' ' +
              playerStats.doubles+
              ' ' +
              playerStats.triples+
              ' ' +
            playerStats.homeruns*/}
            <br />
            {console.log((playerStats))}
          </div>
        );
      }
    }
  }
  /*
          + StringUtils.formatDecimal(this.hitCount, 3) + " "
        + StringUtils.formatDecimal(this.atBatCount, 3) + " "
        + StringUtils.formatDecimal(this.getOutCount(), 3) + " "
        + StringUtils.formatDecimal(this.directOutCount, 3) + " "
        + StringUtils.formatDecimal(this.fcCount, 3) + " "
        + StringUtils.formatDecimal(this.strikeoutCount, 3) + " "
        + StringUtils.formatDecimal(this.errorCount, 3) + " "
        + StringUtils.formatDecimal(this.hitCount, 3) + " "
        + StringUtils.formatDecimal(this.singleCount, 3) + " "
        + StringUtils.formatDecimal(this.doubleCount, 3) + " "
        + StringUtils.formatDecimal(this.tripleCount, 3) + " "
        + StringUtils.formatDecimal(this.homerunCount, 3) + " ";
        */

  return (
    <div id="content">
      <b>Optimal Lineup Score:</b>
      <br />
      {typeof bestScore === "number" ? bestScore.toFixed(2) + " runs per game" : bestScore}
      <br />
      <br />
      <b>Optimal Lineup:</b>
      <pre style={{ margin: '0px' }}>{bestPlayers}</pre>
      <br />
      <b>Progress:</b>
      <br />
      {progress}
      <br />
      <b>Details:</b>
      <br />
      <pre style={{ margin: '0px' }}>{humanDetails}</pre>
      <br />
      <b>Optimizer Used:</b>
      <br />
      {optimizer}
      <br />
      <br />
    </div>
  );
};

const getResultsAsHtml = function (result, inputSummaryData) {
  return ReactDOMServer.renderToStaticMarkup(
    getResultsAsJsx(result, inputSummaryData)
  );
};

export {
  getResultsAsHtml,
  getResultsAsJsx,
};
