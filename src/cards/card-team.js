import React from 'react';
import CardStatsPrivate from 'cards/card-stats-private';
import GameList from 'components/game-list';
import Card from 'elements/card';
import HeaderTabs from 'elements/header-tabs';
import { setRoute } from 'actions/route';

export default class CardTeam extends React.Component {
  constructor(props) {
    super(props);
    this.handleTabClick = (tab) => {
      setRoute(`/teams/${this.props.team.id}/${tab}`);
    };
  }

  render() {
    return (
      <Card
        title={
          <HeaderTabs
            handleTabClick={(tabValue) => {
              this.handleTabClick(tabValue);
            }}
            tab={this.props.tab}
            tabNames={[
              { value: 'games', label: 'Games' },
              { value: 'stats', label: 'Stats' },
            ]}
          />
        }
      >
        {this.props.tab === 'stats' ? (
          <CardStatsPrivate
            team={this.props.team}
            tab={this.props.subtab}
            game={this.props.game}
          />
        ) : (
          <GameList team={this.props.team} />
        )}
      </Card>
    );
  }
}
