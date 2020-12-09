import React from 'react';
import CardStats from 'cards/card-stats';
import GameList from 'components/game-list';
import Card from 'elements/card';
import HeaderTabs from 'elements/header-tabs';
import { setRoute } from 'actions/route';

export default class CardTeam extends React.Component {
  constructor(props) {
    super(props);
    this.handleTabClick = (tab) => {
      setRoute(window?.location?.pathname + '?tab=' + tab);
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
          <CardStats team={this.props.team} routingMethod="app" />
        ) : (
          <GameList team={this.props.team} />
        )}
      </Card>
    );
  }
}
