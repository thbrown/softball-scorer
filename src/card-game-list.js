import React from 'react';
import expose from './expose';
import DOM from 'react-dom-factories';
import state from 'state';

export default class CardGameList extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.handleGameClick = function(game) {
      expose.set_state('main', {
        page: `/teams/${props.team.id}/games/${game.id}`, // TODO: always back to lineup?
      });
    };

    this.handleEditClick = function(game, ev) {
      expose.set_state('main', {
        page: `/teams/${props.team.id}/games/${game.id}/edit`,
        isNew: false,
      });
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      let game = state.addGame(this.props.team.id, '');
      expose.set_state('main', {
        page: `/teams/${props.team.id}/games/${game.id}/edit`,
        isNew: true,
      });
    }.bind(this);
  }

  renderGameList() {
    let elems = this.props.team.games.map(game => {
      return DOM.div(
        {
          game_id: game.id,
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
            onClick: this.handleEditClick.bind(this, game),
          })
        )
      );
    });

    elems.push(
      DOM.div(
        {
          key: 'newgame',
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
