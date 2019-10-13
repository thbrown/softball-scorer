import React from 'react';
import state from 'state';
import Card from 'elements/card';
import injectSheet from 'react-jss';
import { compose, withState, withHandlers } from 'recompose';
import ListPicker from 'elements/list-picker';
import { setRoute } from 'actions/route';
import { toClientDate } from 'utils/functions';

const enhance = compose(
  withState('team', 'setTeam', null),
  withState('game', 'setGame', null),
  withHandlers({
    handleTeamItemClick: props => item => {
      props.setTeam(state.getTeam(item.id));
    },
    handleGameItemClick: props => item => {
      props.setGame(state.getGame(item.id));
    },
    handleBackClick: props => () => {
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
    handleConfirmClick: props => ev => {
      state.setOptimizationField(
        props.optimization.id,
        'playerList',
        props.game.lineup,
        true
      );
      state.setOptimizationField(
        props.optimization.id,
        'teamList',
        [props.team.id],
        true
      );
      setRoute(
        `/optimizations/${props.optimization.id}/overrides/player-select`
      );
    },
  }),
  injectSheet(theme => ({
    title: {
      position: 'sticky',
      left: '0px',
      top: '48px',
      fontSize: theme.typography.size.xLarge,
      textAlign: 'center',
      color: theme.colors.TEXT_LIGHT,
      padding: theme.spacing.small,
      backgroundColor: theme.colors.SECONDARY_DARK,
      borderTop: '2px solid ' + theme.colors.PRIMARY,
    },
    itemCustom: {
      backgroundColor: theme.colors.PRIMARY_DARK,
      textAlign: 'center',
    },
    confirmButtonContainer: {
      display: 'flex',
      justifyContent: 'center',
    },
    confirmButton: {
      width: '180px',
    },
    vs: {
      color: theme.colors.TEXT_LIGHT,
      fontSize: theme.typography.size.medium,
    },
    chipContainer: {
      paddingTop: theme.spacing.xSmall,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
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
  }))
);

const toItems = list =>
  list.map(obj => ({
    name: obj.name || obj.opponent,
    id: obj.id,
    floatName: obj.date ? toClientDate(obj.date) : undefined,
  }));

const LineupList = props => {
  if (props.game) {
    return (
      <>
        <div className={props.classes.title}> Use this lineup? </div>
        <div className={props.classes.chipContainer}>
          <div className={props.classes.chip}>{props.team.name}</div>
          <span className={props.classes.vs}> vs. </span>
          <div className={props.classes.chip}>{props.game.opponent}</div>
        </div>
        <ListPicker
          itemClassName={props.classes.itemCustom}
          items={props.game.lineup.map(playerId => ({
            name: state.getPlayer(playerId).name,
            id: state.getPlayer(playerId).id,
          }))}
          onClick={() => {}}
        />
        <div className={props.classes.confirmButtonContainer}>
          <div
            id="confirm"
            className={
              'button edit-button confirm-button ' + props.classes.confirmButton
            }
            onClick={props.handleConfirmClick}
          >
            Confirm
          </div>
        </div>
      </>
    );
  } else if (props.team) {
    return (
      <>
        <div className={props.classes.title}> Pick a game </div>
        <div className={props.classes.chipContainer}>
          <div className={props.classes.chip}>{props.team.name}</div>
        </div>
        <ListPicker
          items={toItems([...props.team.games].reverse())}
          onClick={props.handleGameItemClick}
        />
      </>
    );
  } else {
    return (
      <>
        <div className={props.classes.title}> Pick a team </div>
        <ListPicker
          items={toItems([...state.getLocalState().teams].reverse())}
          onClick={props.handleTeamItemClick}
        />
      </>
    );
  }
};

const CardImport = enhance(props => (
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
