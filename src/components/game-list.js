import React from 'react';
import { getGlobalState } from 'state';
import ListButton from 'elements/list-button';
import { setRoute } from 'actions/route';
import { sortObjectsByDate, toClientDate } from 'utils/functions';
import IconButton from '../elements/icon-button';

const GameList = (props) => {
  const handleGameClick = function (game) {
    setRoute(`/teams/${props.team.id}/games/${game.id}`); // TODO: always back to lineup?
  };

  const handleEditClick = function (game) {
    setRoute(`/teams/${props.team.id}/games/${game.id}/edit`);
  };

  const handleCreateClick = function () {
    const game = getGlobalState().addGame(props.team.id, '');
    setRoute(`/teams/${props.team.id}/games/${game.id}/edit?isNew=true`);
  };

  const games = sortObjectsByDate(props.team.games, { isAsc: false });

  const elems = games.map((game) => {
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
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div
              style={{
                fontSize: '12px',
                marginRight: '10px',
                marginTop: '5px',
              }}
            >
              {toClientDate(game.date)}
            </div>
            <IconButton
              src="/assets/edit.svg"
              alt="edit"
              id={'game-' + game.id + '-edit'}
              onClick={(ev) => {
                handleEditClick(game);
                ev.preventDefault();
                ev.stopPropagation();
              }}
              invert
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
      type="primary-button"
      onClick={handleCreateClick}
    >
      + Add New Game
    </ListButton>
  );

  return <div>{elems}</div>;
};

export default GameList;
