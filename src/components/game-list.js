import React from 'react';
import state from 'state';
import { setRoute } from 'actions/route';
import { toClientDate } from 'utils/functions';
import { makeStyles } from 'css/helpers';

const useGameListStyles = makeStyles(theme => ({
  dateText: {
    float: 'right',
    marginRight: '32px',
    fontSize: '12px',
    marginTop: '10px',
  },
}));

const GameList = props => {
  const handleGameClick = function(game) {
    setRoute(`/teams/${props.team.id}/games/${game.id}`); // TODO: always back to lineup?
  };

  const handleEditClick = function(game) {
    setRoute(`/teams/${props.team.id}/games/${game.id}/edit`);
  };

  const handleCreateClick = function() {
    const game = state.addGame(props.team.id, '');
    setRoute(`/teams/${props.team.id}/games/${game.id}/edit?isNew=true`);
  };

  const { styles } = useGameListStyles();

  const elems = [...props.team.games].reverse().map(game => {
    return (
      <div
        key={'game-' + game.id}
        id={'game-' + game.id}
        className={'list-item'}
        onClick={handleGameClick.bind(this, game)}
      >
        <img
          src="/server/assets/edit.svg"
          alt="edit"
          className={'list-button'}
          style={{
            float: 'right',
          }}
          id={'game-' + game.id + '-edit'}
          onClick={ev => {
            handleEditClick(game);
            ev.preventDefault();
            ev.stopPropagation();
          }}
        />
        <div style={styles.dateText}>{toClientDate(game.date)}</div>
        <div className="prevent-overflow">
          <span style={{ fontSize: '12px' }}>VS. </span>
          {game.opponent}
        </div>
      </div>
    );
  });

  elems.unshift(
    <div
      id="newGame"
      key="newGame"
      className={'list-item add-list-item'}
      onClick={handleCreateClick}
    >
      + Add New Game
    </div>
  );

  return (
    <div className="card">
      <div className="card-body">{elems}</div>
    </div>
  );
};

export default GameList;
