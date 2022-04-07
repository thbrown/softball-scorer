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
  buttonRoot: {
    width: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: css.borderRadius.small,
    padding: css.spacing.small,
    color: css.colors.TEXT_LIGHT,
  },
  teamName: {
    fontSize: '1rem',
    color: css.colors.TEXT_LIGHT,
  },
  teamScore: {
    fontFamily: 'score_boardregular, Arial, sans-serif',
    fontSize: '6rem',
  },
  scoreIncrementButton: {
    backgroundColor: css.colors.PRIMARY,
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: css.spacing.small,
    fontSize: '3rem',
    borderRadius: '3rem',
    border: '5px solid ' + css.colors.PRIMARY_DARK,
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

const ScoreChanger = ({ onScoreChange }) => {
  const { classes } = useScorePaperStyles();
  return (
    <div className={classes.buttonRoot}>
      <div
        onClick={(ev) => {
          onScoreChange(1);
          ev.preventDefault();
        }}
        className={classes.scoreIncrementButton + ' button'}
      >
        +1
      </div>
      <div
        onClick={(ev) => {
          onScoreChange(-1);
          ev.preventDefault();
        }}
        className={classes.scoreIncrementButton + ' button'}
        style={{
          borderColor: css.colors.CANCEL,
        }}
      >
        -1
      </div>
    </div>
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

  const handleScoreChange = (inc, scoreKey) => {
    state.setScore(
      {
        [scoreKey]: game[scoreKey] + inc,
      },
      gameId
    );
  };

  const game = state.getGame(gameId);
  const team = state.getTeam(teamId);

  const usName = team.name;
  const themName = game.opponent;
  const usScore = game.scoreUs || 0;
  const themScore = game.scoreThem || 0;

  return (
    <CardSection>
      <div className={classes.cards}>
        <ScorePaper name={usName} score={usScore} />
        <ScorePaper name={themName} score={themScore} />
      </div>
      <div className={classes.cards}>
        <ScoreChanger
          onScoreChange={(inc) => {
            handleScoreChange(inc, 'scoreUs');
          }}
        />
        <ScoreChanger
          onScoreChange={(inc) => {
            handleScoreChange(inc, 'scoreThem');
          }}
          name={themName}
          score={themScore}
        />
      </div>
    </CardSection>
  );
};

export default GameScorer;
