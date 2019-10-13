import React from 'react';
import state from 'state';
import Card from 'elements/card';
import injectSheet from 'react-jss';
import { compose, withState, withHandlers } from 'recompose';
import ListPicker from 'elements/list-picker';
import { setRoute } from 'actions/route';

const enhance = compose(
  withState('team', 'setTeam', null),
  withState('game', 'setGame', null),
  withHandlers({
    handleTeamItemClick: props => teamId => () => {
      props.setTeam(state.getTeam(teamId));
    },
    handleGameItemClick: props => gameId => () => {
      props.setGame(state.getGame(gameId));
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
      setRoute(`/optimizations/${props.optimization.id}?acc0=true`);
    },
  }),
  injectSheet(theme => ({
    title: {
      fontSize: '32px',
      textAlign: 'center',
      color: theme.colors.TEXT_LIGHT,
      padding: theme.spacing.small,
    },
    itemCustom: {
      backgroundColor: theme.colors.PRIMARY_DARK,
    },
  }))
);

const toItems = list =>
  list.map(obj => ({ name: obj.name || obj.opponent, id: obj.id }));

const getComponent = props => {
  if (props.game) {
    return (
      <>
        <div className={props.classes.title}> Use this lineup? </div>
        <div
          className={'button edit-button confirm-button'}
          onClick={props.handleConfirmClick}
        >
          Confirm
        </div>
        <ListPicker
          itemClassName={props.classes.itemCustom}
          items={props.game.lineup.map(playerId => ({
            name: state.getPlayer(playerId).name,
            id: state.getPlayer(playerId).id,
          }))}
          onClick={() => {}}
        ></ListPicker>
      </>
    );
  } else if (props.team) {
    return (
      <>
        <div className={props.classes.title}> Pick a game </div>
        <ListPicker
          items={toItems([...props.team.games].reverse())}
          onClick={({ id }) => {
            props.setGame(state.getGame(id));
          }}
        ></ListPicker>
      </>
    );
  } else {
    return (
      <>
        <div className={props.classes.title}> Pick a team </div>
        <ListPicker
          items={toItems([...state.getLocalState().teams].reverse())}
          onClick={({ id }) => {
            props.setTeam(state.getTeam(id));
          }}
        ></ListPicker>
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
    {getComponent(props)}
  </Card>
));

export default CardImport;
