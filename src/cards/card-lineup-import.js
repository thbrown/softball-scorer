import React from 'react';
import state from 'state';
import Card from 'elements/card';
import { makeStyles } from 'css/helpers';
import { compose, withState, withHandlers } from 'recompose';
import ListPicker from 'elements/list-picker';
import { sortObjectsByDate, toClientDate } from 'utils/functions';

const enhance = compose(
  withState('team', 'setTeam', null),
  withState('game', 'setGame', null),
  withHandlers({
    handleTeamItemClick: (props) => (item) => {
      props.setTeam(state.getTeam(item.id));
      window.scroll(0, 0);
    },
    handleGameItemClick: (props) => (item) => {
      props.setGame(state.getGame(item.id));
      window.scroll(0, 0);
    },
    handleBackClick: (props) => () => {
      // Back means different things in each stage of the import wizard
      let skipDefaultBack = false;
      if (props.game) {
        props.setGame(null);
        skipDefaultBack = true;
      } else if (props.team) {
        props.setTeam(null);
        skipDefaultBack = true;
      }
      return skipDefaultBack;
    },
    handleConfirmClick: (props) => props.handleConfirmClick,
    handleCancelClick: (props) => props.handleCancelClick,
  })
);

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
    borderRadius: '30px',
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
              return props.handleConfirmClick(ev, props.team, props.game);
            }}
          >
            Confirm
          </div>
        </div>
        <div className={classes.actionButtonContainer}>
          <div
            id="cancel"
            className={
              'button edit-button secondary-button ' + classes.actionButton
            }
            onClick={props.handleCancelClick}
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
          onClick={props.handleGameItemClick}
        />
      </>
    );
  } else {
    return (
      <>
        <div className={classes.title}> Pick a team </div>
        <ListPicker
          items={toItems([...state.getLocalState().teams].reverse())}
          onClick={props.handleTeamItemClick}
        />
      </>
    );
  }
};

const CardImport = enhance((props) => (
  <Card
    title="Import Lineup"
    leftHeaderProps={{
      onClick: props.handleBackClick,
    }}
  >
    <LineupList {...props} />
  </Card>
));

export default CardImport;
