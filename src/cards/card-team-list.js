import React from 'react';
import DOM from 'react-dom-factories';
import state from 'state';
import { setRoute } from 'actions/route';
import Card from 'elements/card';
import injectSheet from 'react-jss';
import { getShallowCopy } from 'utils/functions';

class CardTeamList extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.handleTeamClick = function(team) {
      setRoute(`/teams/${team.id}`);
    };

    this.handleEditClick = function(team, ev) {
      setRoute(`/teams/${team.id}/edit`);
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      const team = state.addTeam('');
      setRoute(`/teams/${team.id}/edit?isNew=true`);
    };
  }

  renderTeamList() {
    const s = state.getLocalState();
    let elems = getShallowCopy(s.teams)
      .reverse()
      .map(team => {
        return DOM.div(
          {
            id: 'team-' + team.id,
            team_id: team.id,
            key: 'team' + team.id,
            className: 'list-item ' + this.props.classes.listItem,
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
              id: 'team-' + team.id + '-edit',
              src: '/server/assets/edit.svg',
              alt: 'edit',
              className: 'list-button',
              onClick: this.handleEditClick.bind(this, team),
            })
          )
        );
      });

    elems.unshift(
      DOM.div(
        {
          key: 'newTeam',
          id: 'newTeam',
          className: 'list-item add-list-item ' + this.props.classes.listItem,
          onClick: this.handleCreateClick,
        },
        '+ Add New Team'
      )
    );

    return DOM.div(
      {
        id: 'teamList',
      },
      elems
    );
  }

  render() {
    return <Card title="Teams">{this.renderTeamList()}</Card>;
  }
}
export default injectSheet(theme => ({
  listItem: {
    lineHeight: '20px',
    [`@media (max-width:${theme.breakpoints.sm})`]: {
      fontSize: '14px',
      lineHeight: '14px',
    },
  },
}))(CardTeamList);