import React from 'react';
import DOM from 'react-dom-factories';
import state from 'state';
import { setRoute } from 'actions/route';
import injectSheet from 'react-jss';
import Card from 'elements/card';

class CardPlayerList extends React.Component {
  constructor(props) {
    super(props);
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
            id: 'player-' + player.id,
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

    elems.unshift(
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
    return <Card title="Players">{this.renderPlayerList()}</Card>;
  }
}

export default injectSheet(theme => ({
  listItem: theme.classes.listItem,
}))(CardPlayerList);
