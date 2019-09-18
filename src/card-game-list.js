import React from 'react';
import DOM from 'react-dom-factories';
import state from 'state';
import { setRoute } from 'actions/route';

export default class CardGameList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.handleGameClick = function(game) {
      setRoute(`/teams/${props.team.id}/games/${game.id}`); // TODO: always back to lineup?
    };

    this.handleEditClick = function(game, ev) {
      setRoute(`/teams/${props.team.id}/games/${game.id}/edit`);
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      const game = state.addGame(props.team.id, '');
      setRoute(`/teams/${props.team.id}/games/${game.id}/edit?isNew=true`);
    };
  }

  renderGameList() {
    const elems = this.props.team.games.map(game => {
      return DOM.div(
        {
          game_id: game.id,
          id: 'game-' + game.id,
          key: 'game' + game.id,
          className: 'list-item',
          onClick: this.handleGameClick.bind(this, game),
          style: {
            display: 'flex',
            justifyContent: 'space-between',
          },
        },
        DOM.div(
          {
            className: 'prevent-overflow',
          },
          'Vs. ' + game.opponent
        ),
        DOM.div(
          {
            style: {},
          },
          DOM.img({
            src: '/server/assets/edit.svg',
            alt: 'edit',
            className: 'list-button',
            id: 'game-' + game.id + '-edit',
            onClick: this.handleEditClick.bind(this, game),
          })
        )
      );
    });

    elems.push(
      DOM.div(
        {
          id: 'newGame',
          key: 'newGame',
          className: 'list-item add-list-item',
          onClick: this.handleCreateClick,
        },
        '+ Add New Game'
      )
    );

    return DOM.div({}, elems);
  }

  render() {
    return (
      <div className="card">
        <div className="card-body">{this.renderGameList()}</div>
      </div>
    );
  }
}
