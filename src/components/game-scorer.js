import React from 'react';
import CardSection from 'elements/card-section';
import { getGlobalState } from 'state';
import { makeStyles } from 'css/helpers';

const useScorePaperStyles = makeStyles((css) => ({
  root: {
    width: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: css.borderRadius.small,
    padding: css.spacing.small,
    backgroundColor: css.colors.PRIMARY,
    color: css.colors.TEXT_LIGHT,
    boxShadow: css.boxShadow.paper,
  },
  teamName: {
    fontSize: '1rem',
    color: css.colors.TEXT_LIGHT,
    textAlign: 'center',
  },
  teamScore: {
    fontFamily: 'score_boardregular, Arial, sans-serif',
    fontSize: '6rem',
  },
}));

const ScorePaper = ({ score, name }) => {
  const { classes } = useScorePaperStyles();
  return (
    <div className={classes.root}>
      <div className={classes.teamName}>{name}</div>
      <div className={classes.teamScore}>{score}</div>
    </div>
  );
};

const tableStyles = makeStyles((css) => ({
  table: {
    color: css.colors.TEXT_DARK,
    borderCollapse: 'collapse',
    margin: 'auto',
  },
  tableCell: {
    textAlign: 'center',
    verticalAlign: 'middle',
    border: '3px solid',
    borderColor: css.colors.SECONDARY,
    minWidth: '48px',
    height: '48px',
  },
  scoreText: {
    padding: '4px',
  },
  scoreIncrementButton: {
    backgroundColor: css.colors.PRIMARY,
    color: css.colors.TEXT_LIGHT,
    padding: '0',
    margin: '0',
    minWidth: '36px',
    height: '36px',
  },
}));

const ScoreChangeButton = ({ onScoreChange, increment, buttonText }) => {
  const { classes } = tableStyles();
  return (
    <div
      style={{ padding: '6px' }}
      onClick={(ev) => {
        onScoreChange(increment);
        ev.preventDefault();
      }}
    >
      <div className={classes.scoreIncrementButton + ' button'}>
        {buttonText}
      </div>
    </div>
  );
};

const TableCell = ({ whoseScore, inning, game, derivedScore }) => {
  const { classes } = tableStyles();

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
    <td className={classes.tableCell}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <ScoreChangeButton
          increment={-1}
          buttonText="-"
          onScoreChange={(increment) => {
            handleScoreChange(increment);
          }}
        />
        <div className={classes.scoreText}>{displayScoreContent}</div>
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
  const { classes } = tableStyles();
  return (
    <tr>
      <td className={classes.tableCell}>{inning}</td>
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
  const { classes } = tableStyles();
  const derivedScoreForUs = getGlobalState().getInningScores(game.id);
  return (
    <table className={classes.table}>
      <thead>
        <tr>
          <th></th>
          <th className={classes.tableCell}>{usName}</th>
          <th className={classes.tableCell}>{themName}</th>
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

const useGameScorerStyles = makeStyles((css) => ({
  cards: {
    display: 'flex',
    justifyContent: 'space-around',
    margin: `${css.spacing.xSmall} 0`,
  },
}));

const calculateScore = (scoreObj) => {
  let totalScore = 0;
  for (let inningNumber in scoreObj) {
    totalScore += scoreObj[inningNumber]; // Overrides
  }
  return totalScore;
};

const GameScorer = ({ teamId, gameId }) => {
  const { classes } = useGameScorerStyles();

  const game = getGlobalState().getGame(gameId);
  const team = getGlobalState().getTeam(teamId);

  const usName = team.name;
  const themName = game.opponent;
  const usDerivedScore = getGlobalState()
    .getInningScores(game.id)
    .reduce((a, b) => a + b, 0);

  const overrideGameScoreUs = calculateScore(game.scoreUs);
  const overrideGameScoreThem = calculateScore(game.scoreThem);

  const usScore = overrideGameScoreUs + usDerivedScore;
  const themScore = overrideGameScoreThem;

  return (
    <CardSection>
      <div className={classes.cards}>
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
