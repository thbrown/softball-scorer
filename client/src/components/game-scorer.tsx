import React from 'react';
import CardSection from 'elements/card-section';
import { getGlobalState } from 'state';
import { asGameId } from 'types/branded-ids';

const ScorePaper = ({ score, name }) => {
  return (
    <div className="score-paper-root">
      <div className="score-paper-team-name">{name}</div>
      <div className="score-paper-team-score">{score}</div>
    </div>
  );
};

const ScoreChangeButton = ({ onScoreChange, increment, buttonText }) => {
  return (
    <div
      style={{ padding: '6px' }}
      onClick={(ev) => {
        onScoreChange(increment);
        ev.preventDefault();
      }}
    >
      <div className="score-table-increment-button button">
        {buttonText}
      </div>
    </div>
  );
};

const TableCell = ({ whoseScore, inning, game, derivedScore }) => {

  const handleScoreChange = (increment) => {
    getGlobalState().setScoreAdjustment(game, inning, increment, whoseScore);
  };

  const scoreAdjustment = game[whoseScore][inning];

  const displayScore = (derivedScore ?? 0) + (scoreAdjustment ?? 0);
  const displayScoreContent =
    scoreAdjustment === undefined ? (
      <span>{displayScore}</span>
    ) : (
      <b>{displayScore}</b>
    );
  return (
    <td className="score-table-cell">
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ScoreChangeButton
          increment={-1}
          buttonText="-"
          onScoreChange={(increment) => {
            handleScoreChange(increment);
          }}
        />
        <div className="score-table-score-text">{displayScoreContent}</div>
        <ScoreChangeButton
          increment={1}
          buttonText="+"
          onScoreChange={(increment) => {
            handleScoreChange(increment);
          }}
        />
      </div>
    </td>
  );
};

const Inning = ({ inning, game, derivedScoreForUs }) => {
  return (
    <tr>
      <td className="score-table-cell">{inning}</td>
      <TableCell
        inning={inning}
        game={game}
        whoseScore="scoreUs"
        derivedScore={derivedScoreForUs[inning - 1]}
      />
      <TableCell
        inning={inning}
        game={game}
        whoseScore="scoreThem"
        derivedScore={0}
      />
    </tr>
  );
};

const ScoreTable = ({ usName, themName, game }) => {
  const derivedScoreForUs = getGlobalState().getInningScores(game.id);
  return (
    <table className="score-table">
      <thead>
        <tr>
          <th></th>
          <th className="score-table-cell">{usName}</th>
          <th className="score-table-cell">{themName}</th>
        </tr>
      </thead>
      <tbody>
        <Inning
          inning="1"
          game={game}
          derivedScoreForUs={derivedScoreForUs}
        ></Inning>
        <Inning
          inning="2"
          game={game}
          derivedScoreForUs={derivedScoreForUs}
        ></Inning>
        <Inning
          inning="3"
          game={game}
          derivedScoreForUs={derivedScoreForUs}
        ></Inning>
        <Inning
          inning="4"
          game={game}
          derivedScoreForUs={derivedScoreForUs}
        ></Inning>
        <Inning
          inning="5"
          game={game}
          derivedScoreForUs={derivedScoreForUs}
        ></Inning>
        <Inning
          inning="6"
          game={game}
          derivedScoreForUs={derivedScoreForUs}
        ></Inning>
        <Inning
          inning="7"
          game={game}
          derivedScoreForUs={derivedScoreForUs}
        ></Inning>
      </tbody>
    </table>
  );
};

const calculateScore = (scoreObj) => {
  let totalScore = 0;
  for (const inningNumber in scoreObj) {
    totalScore += scoreObj[inningNumber]; // Overrides
  }
  return totalScore;
};

const GameScorer = ({ teamId, gameId }) => {
  const game = getGlobalState().getGame(gameId);
  const team = getGlobalState().getTeam(teamId);

  const usName = team.name;
  const themName = game.opponent;
  const usDerivedScore = getGlobalState()
    .getInningScores(asGameId(game.id))
    .reduce((a, b) => a + b, 0);

  const overrideGameScoreUs = calculateScore(game.scoreUs);
  const overrideGameScoreThem = calculateScore(game.scoreThem);

  const usScore = overrideGameScoreUs + usDerivedScore;
  const themScore = overrideGameScoreThem;

  return (
    <CardSection>
      <div className="game-scorer-cards">
        <ScorePaper name={usName} score={usScore} />
        <ScorePaper name={themName} score={themScore} />
      </div>
      <div style={{ marginTop: '16px', overflowX: 'auto' }}>
        <ScoreTable game={game} usName={usName} themName={themName} />
      </div>
    </CardSection>
  );
};

export default GameScorer;
