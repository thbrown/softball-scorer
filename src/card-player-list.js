import React from 'react';
import DOM from 'react-dom-factories';
import expose from './expose';
import state from 'state';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import { setRoute } from 'actions/route';

export default class CardPlayerList extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.handlePlayerClick = function(player) {
      setRoute(`/players/${player.id}`);
    };

    this.handleEditClick = function(player, ev) {
      setRoute(`/players/${player.id}/edit`);
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      const player = state.addPlayer('', 'M');
      setRoute(`/players/${player.id}/edit?isNew=true`);
    };
  }

  renderPlayerList() {
    let elems = state
      .getAllPlayersAlphabetically()
      .slice()
      .map(player => {
        return DOM.div(
          {
            player_id: player.id,
            key: 'player' + player.id,
            className: 'list-item',
            onClick: this.handlePlayerClick.bind(this, player),
            style: {
              display: 'flex',
              justifyContent: 'space-between',
            },
          },
          DOM.div(
            {
              className: 'prevent-overflow',
            },
            player.name
          ),
          DOM.div(
            {
              style: {},
            },
            DOM.img({
              src: '/server/assets/edit.svg',
              alt: 'edit',
              className: 'list-button',
              onClick: this.handleEditClick.bind(this, player),
            })
          )
        );
      });

    elems.push(
      DOM.div(
        {
          key: 'newplayer',
          className: 'list-item add-list-item',
          onClick: this.handleCreateClick,
        },
        '+ Add New Player'
      )
    );

    return DOM.div({}, elems);
  }

  render() {
    return DOM.div(
      {
        className: 'card',
        style: {},
      },
      DOM.div(
        {
          className: 'card-title',
        },
        React.createElement(LeftHeaderButton, {}),
        DOM.div(
          {
            className: 'prevent-overflow card-title-text-with-arrow',
          },
          'Players'
        ),
        React.createElement(RightHeaderButton, {})
      ),
      DOM.div(
        {
          className: 'card-body',
        },
        this.renderPlayerList()
      )
    );
  }
}
