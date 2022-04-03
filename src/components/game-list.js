import React from 'react';
import state from 'state';
import ListButton from 'elements/list-button';
import { setRoute } from 'actions/route';
import { toClientDate } from 'utils/functions';

const GameList = (props) => {
  const handleGameClick = function (game) {
    setRoute(`/teams/${props.team.id}/games/${game.id}`); // TODO: always back to lineup?
  };

  const handleEditClick = function (game) {
    setRoute(`/teams/${props.team.id}/games/${game.id}/edit`);
  };

  const handleCreateClick = function () {
    const game = state.addGame(props.team.id, '');
    setRoute(`/teams/${props.team.id}/games/${game.id}/edit?isNew=true`);
  };

  const elems = [...props.team.games].reverse().map((game) => {
    return (
      <ListButton
        key={'game-' + game.id}
        id={'game-' + game.id}
        onClick={handleGameClick.bind(this, game)}
      >
        <div className="centered-row">
          <div className="prevent-overflow">
            <span style={{ fontSize: '12px' }}>VS. </span>
            {game.opponent}
          </div>
          <div style={{ display: 'flex' }}>
            <div
              style={{
                fontSize: '12px',
                marginRight: '10px',
                marginTop: '5px',
              }}
            >
              {toClientDate(game.date)}
            </div>
            <img
              src="/server/assets/edit.svg"
              alt="edit"
              id={'game-' + game.id + '-edit'}
              onClick={(ev) => {
                handleEditClick(game);
                ev.preventDefault();
                ev.stopPropagation();
              }}
            />
          </div>
        </div>
      </ListButton>
    );
  });

  elems.unshift(
    <ListButton
      id="newGame"
      key="newGame"
      type="tertiary-button"
      onClick={handleCreateClick}
    >
      + Add New Game
    </ListButton>
  );

  return (
    <div className="card">
      <div className="card-body">{elems}</div>
    </div>
  );
};

export default GameList;
