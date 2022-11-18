import React from 'react';
import CardSection from 'elements/card-section';
import state from 'state';
import { makeStyles } from 'css/helpers';
import css from 'css';

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
    border: '1px solid',
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

const TableCell = ({ handleScoreChange, whoseScore }) => {
  const { classes } = tableStyles();
  return (
    <td className={classes.tableCell}>
      <div>
        <ScoreChangeButton
          increment={1}
          buttonText="+"
          onScoreChange={(increment) => {
            handleScoreChange(increment, whoseScore);
          }}
        />
        <div className={classes.scoreText}>0</div>
        <ScoreChangeButton
          increment={-1}
          buttonText="-"
          onScoreChange={(increment) => {
            handleScoreChange(increment, whoseScore);
          }}
        />
      </div>
    </td>
  );
};

const ScoreTable = ({ usName, themName, handleScoreChange }) => {
  const { classes } = tableStyles();
  return (
    <table className={classes.table}>
      <th>
        <td className={classes.tableCell}></td>
        <td className={classes.tableCell}>1</td>
        <td className={classes.tableCell}>2</td>
        <td className={classes.tableCell}>3</td>
        <td className={classes.tableCell}>4</td>
        <td className={classes.tableCell}>5</td>
        <td className={classes.tableCell}>6</td>
        <td className={classes.tableCell}>7</td>
      </th>
      <tr>
        <td className={classes.tableCell}>{usName}</td>
        <TableCell handleScoreChange={handleScoreChange} whoseScore="scoreUs" />
        <TableCell handleScoreChange={handleScoreChange} whoseScore="scoreUs" />
        <TableCell handleScoreChange={handleScoreChange} whoseScore="scoreUs" />
        <TableCell handleScoreChange={handleScoreChange} whoseScore="scoreUs" />
        <TableCell handleScoreChange={handleScoreChange} whoseScore="scoreUs" />
        <TableCell handleScoreChange={handleScoreChange} whoseScore="scoreUs" />
        <TableCell handleScoreChange={handleScoreChange} whoseScore="scoreUs" />
      </tr>
      <tr>
        <td className={classes.tableCell}>{themName}</td>
        <TableCell
          handleScoreChange={handleScoreChange}
          whoseScore="scoreThem"
        />
        <TableCell
          handleScoreChange={handleScoreChange}
          whoseScore="scoreThem"
        />
        <TableCell
          handleScoreChange={handleScoreChange}
          whoseScore="scoreThem"
        />
        <TableCell
          handleScoreChange={handleScoreChange}
          whoseScore="scoreThem"
        />
        <TableCell
          handleScoreChange={handleScoreChange}
          whoseScore="scoreThem"
        />
        <TableCell
          handleScoreChange={handleScoreChange}
          whoseScore="scoreThem"
        />
        <TableCell
          handleScoreChange={handleScoreChange}
          whoseScore="scoreThem"
        />
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

const GameScorer = ({ teamId, gameId }) => {
  const { classes } = useGameScorerStyles();

  const game = state.getGame(gameId);
  const team = state.getTeam(teamId);

  const usName = team.name;
  const themName = game.opponent;
  const usScore = game.scoreUs || 0;
  const themScore = game.scoreThem || 0;

  const handleScoreChange = (increment, scoreKey) => {
    console.log(state);
    state.setScore(
      {
        [scoreKey]: game[scoreKey] + increment,
      },
      gameId
    );
  };

  return (
    <CardSection>
      <div className={classes.cards}>
        <ScorePaper name={usName} score={usScore} />
        <ScorePaper name={themName} score={themScore} />
      </div>
      <div>
        <ScoreTable
          handleScoreChange={handleScoreChange}
          usName={usName}
          themName={themName}
        />
      </div>
    </CardSection>
  );
};

export default GameScorer;
