import React from 'react';
import state from 'state';
import css from 'css';
import Card from 'elements/card';
import { makeStyles } from 'css/helpers';
import ListPicker from 'elements/list-picker';
import { sortObjectsByDate, toClientDate } from 'utils/functions';

const useLineupListStyles = makeStyles((theme) => ({
  title: {
    position: 'sticky',
    left: '0px',
    fontSize: theme.typography.size.xLarge,
    textAlign: 'center',
    color: theme.colors.TEXT_DARK,
    padding: theme.spacing.xSmall,
    backgroundColor: theme.colors.BACKGROUND,
    // boxShadow: '0px 2px 5px 5px rgba(0,0,0,0.5)',
    marginBottom: theme.spacing.small,
  },
  itemCustom: {
    backgroundColor: theme.colors.PRIMARY_DARK,
    textAlign: 'center',
  },
  itemText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'pre',
  },
  actionButtonContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  actionButton: {
    width: '180px',
  },
  vs: {
    color: theme.colors.TEXT_LIGHT,
    fontSize: theme.typography.size.medium,
  },
  chipContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.xSmall,
  },
  chip: {
    padding: '15px',
    marginRight: theme.spacing.xxSmall,
    marginLeft: theme.spacing.xxSmall,
    color: theme.colors.TEXT_LIGHT,
    backgroundColor: theme.colors.PRIMARY_DARK,
    borderRadius: css.borderRadius.xLarge,
    fontSize: theme.typography.size.medium,
  },
}));

const toItems = (list) =>
  list.map((obj) => ({
    name: obj.name || obj.opponent,
    id: obj.id,
    floatName: obj.date ? toClientDate(obj.date) : undefined,
    date: obj.date,
  }));

const LineupList = (props) => {
  const { classes } = useLineupListStyles();
  const handleTeamItemClick = (item) => {
    props.setTeam(state.getTeam(item.id));
    window.scroll(0, 0);
  };
  const handleGameItemClick = (item) => {
    props.setGame(state.getGame(item.id));
    window.scroll(0, 0);
  };

  const handleConfirmClick = props.handleConfirmClick;
  const handleCancelClick = props.handleCancelClick;

  if (props.game) {
    return (
      <>
        <div className={classes.title}> Use this lineup? </div>
        <div className={classes.chipContainer}>
          <div className={classes.chip}>{props.team.name}</div>
          <span className={classes.vs}> vs. </span>
          <div className={classes.chip}>{props.game.opponent}</div>
        </div>
        <ListPicker
          itemClassName={classes.itemCustom}
          textClassName={classes.itemText}
          items={props.game.lineup.map((playerId) => ({
            name: state.getPlayer(playerId).name,
            id: state.getPlayer(playerId).id,
          }))}
          onClick={() => {}}
        />
        <div className={classes.actionButtonContainer}>
          <div
            id="confirm"
            className={'button primary-button ' + classes.actionButton}
            onClick={function wrapper(ev) {
              return handleConfirmClick(ev, props.team, props.game);
            }}
          >
            Confirm
          </div>
        </div>
        <div className={classes.actionButtonContainer}>
          <div
            id="cancel"
            className={'button tertiary-button ' + classes.actionButton}
            onClick={handleCancelClick}
          >
            Cancel
          </div>
        </div>
      </>
    );
  } else if (props.team) {
    return (
      <>
        <div className={classes.title}> Pick a game </div>
        <div className={classes.chipContainer}>
          <div className={classes.chip}>{props.team.name}</div>
        </div>
        <ListPicker
          textClassName={classes.itemText}
          items={sortObjectsByDate(toItems([...props.team.games]), {
            isAsc: false,
          })}
          onClick={handleGameItemClick}
        />
      </>
    );
  } else {
    return (
      <>
        <div className={classes.title}> Pick a team </div>
        <ListPicker
          items={toItems([...state.getLocalState().teams].reverse())}
          onClick={handleTeamItemClick}
        />
      </>
    );
  }
};

const CardImport = (props) => {
  const [team, setTeam] = React.useState(null);
  const [game, setGame] = React.useState(null);

  const handleBackClick = (props) => () => {
    // Back means different things in each stage of the import wizard
    let skipDefaultBack = false;
    if (game) {
      setGame(null);
      skipDefaultBack = true;
    } else if (team) {
      setTeam(null);
      skipDefaultBack = true;
    }
    return skipDefaultBack;
  };

  return (
    <Card
      title="Import Lineup"
      leftHeaderProps={{
        onClick: handleBackClick,
      }}
    >
      <LineupList
        {...props}
        team={team}
        setTeam={setTeam}
        game={game}
        setGame={setGame}
      />
    </Card>
  );
};

export default CardImport;
