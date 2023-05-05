import React from 'react';
import CardSection from 'elements/card-section';
import state from 'state';
import { makeStyles } from 'css/helpers';
import css from 'css';
import { json } from 'body-parser';

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
    borderColor: css.colors.PRIMARY,
    padding: '4px',
    width: '32px',
    height: '32px',
  },
  scoreText: {
    padding: '4px',
  },
  scoreIncrementButton: {
    backgroundColor: css.colors.PRIMARY_DARK,
    color: css.colors.TEXT_LIGHT,
    padding: '0',
    margin: '0',
    minWidth: '32px',
    height: '32px',
  },
}));

const ScoreChangeButton = ({ onScoreChange, increment, buttonText }) => {
  const { classes } = tableStyles();
  return (
    <div
      onClick={(ev) => {
        onScoreChange(increment);
        ev.preventDefault();
      }}
      className={classes.scoreIncrementButton + ' button'}
    >
      {buttonText}
    </div>
  );
};

const TableCell = ({ whoseScore, inning, game }) => {
  const { classes } = tableStyles();

  const handleScoreChange = (increment) => {
    state.setScore(game, inning, increment, whoseScore);
  };

  return (
    <td className={classes.tableCell}>
      <div>
        <ScoreChangeButton
          increment={1}
          buttonText="+"
          onScoreChange={(increment) => {
            handleScoreChange(increment);
          }}
        />
        <div className={classes.scoreText}>{game[whoseScore][inning] || 0}</div>
        <ScoreChangeButton
          increment={-1}
          buttonText="-"
          onScoreChange={(increment) => {
            handleScoreChange(increment);
          }}
        />
      </div>
    </td>
  );
};

const ScoreTable = ({ usName, themName, game }) => {
  const { classes } = tableStyles();
  return (
    <table className={classes.table}>
      <thead>
        <th className={classes.tableCell}></th>
        <th className={classes.tableCell}>1</th>
        <th className={classes.tableCell}>2</th>
        <th className={classes.tableCell}>3</th>
        <th className={classes.tableCell}>4</th>
        <th className={classes.tableCell}>5</th>
        <th className={classes.tableCell}>6</th>
        <th className={classes.tableCell}>7</th>
      </thead>
      <tr>
        <td className={classes.tableCell}>{usName}</td>
        <TableCell inning="1" game={game} whoseScore="scoreUs" />
        <TableCell inning="2" game={game} whoseScore="scoreUs" />
        <TableCell inning="3" game={game} whoseScore="scoreUs" />
        <TableCell inning="4" game={game} whoseScore="scoreUs" />
        <TableCell inning="5" game={game} whoseScore="scoreUs" />
        <TableCell inning="6" game={game} whoseScore="scoreUs" />
        <TableCell inning="7" game={game} whoseScore="scoreUs" />
      </tr>
      <tr>
        <td className={classes.tableCell}>{themName}</td>
        <TableCell inning="1" game={game} whoseScore="scoreThem" />
        <TableCell inning="2" game={game} whoseScore="scoreThem" />
        <TableCell inning="3" game={game} whoseScore="scoreThem" />
        <TableCell inning="4" game={game} whoseScore="scoreThem" />
        <TableCell inning="5" game={game} whoseScore="scoreThem" />
        <TableCell inning="6" game={game} whoseScore="scoreThem" />
        <TableCell inning="7" game={game} whoseScore="scoreThem" />
      </tr>
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
    totalScore += scoreObj[inningNumber];
  }
  return totalScore;
};

const GameScorer = ({ teamId, gameId }) => {
  const { classes } = useGameScorerStyles();

  const game = state.getGame(gameId);
  const team = state.getTeam(teamId);

  const usName = team.name;
  const themName = game.opponent;
  const usScore = calculateScore(game.scoreUs) || 0;
  const themScore = calculateScore(game.scoreThem) || 0;

  return (
    <CardSection>
      <div className={classes.cards}>
        <ScorePaper name={usName} score={usScore} />
        <ScorePaper name={themName} score={themScore} />
      </div>
      <div style={{ marginTop: '16px' }}>
        <ScoreTable game={game} usName={usName} themName={themName} />
      </div>
    </CardSection>
  );
};

export default GameScorer;
