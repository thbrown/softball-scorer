import React from 'react';
import DOM from 'react-dom-factories';
import state from 'state';
import { setRoute } from 'actions/route';
import Card from 'elements/card';
import expose from 'expose';

export default class CardTeamList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.handleTeamClick = function(team) {
      setRoute(`/teams/${team.id}`);
    };

    this.handleEditClick = function(team, ev) {
      expose.set_state('main', {
        isNew: false,
      });
      setRoute(`/teams/${team.id}/edit`);
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      const team = state.addTeam('');
      expose.set_state('main', {
        isNew: true,
      });
      setRoute(`/teams/${team.id}/edit`);
    };
  }

  renderTeamList() {
    const s = state.getLocalState();
    let elems = s.teams.map(team => {
      return DOM.div(
        {
          team_id: team.id,
          key: 'team' + team.id,
          className: 'list-item',
          onClick: this.handleTeamClick.bind(this, team),
          style: {
            display: 'flex',
            justifyContent: 'space-between',
          },
        },
        DOM.div(
          {
            className: 'prevent-overflow',
          },
          team.name
        ),
        DOM.div(
          {
            style: {},
          },
          DOM.img({
            src: '/server/assets/edit.svg',
            alt: 'edit',
            className: 'list-button',
            onClick: this.handleEditClick.bind(this, team),
          })
        )
      );
    });

    elems.push(
      DOM.div(
        {
          id: 'newteam',
          key: 'newteam',
          className: 'list-item add-list-item',
          onClick: this.handleCreateClick,
        },
        '+ Add New Team'
      )
    );

    return DOM.div(
      {
        id: 'teamlist',
      },
      elems
    );
  }

  render() {
    return <Card title="Teams">{this.renderTeamList()}</Card>;
  }
}
