import React from 'react';
import expose from 'expose';
import Card from 'elements/card';
import HeaderTabs from 'elements/header-tabs';
import CardLineup from 'cards/card-lineup';
import CardScorer from 'cards/card-scorer';
import { setRoute } from 'actions/route';

const defaultTab = 'lineup';

export default class CardGame extends expose.Component {
  constructor(props) {
    super(props);
    this.exposeOverwrite('game');

    this.handleTabClick = function(newTab) {
      setRoute(
        `/teams/${this.props.team.id}/games/${this.props.game.id}/${newTab}`
      );
    }.bind(this);
  }

  render() {
    let tab = this.props.tab || defaultTab;

    return (
      <Card
        title={
          <HeaderTabs
            handleTabClick={tabValue => {
              this.handleTabClick(tabValue);
            }}
            tab={this.props.tab}
            tabNames={[
              { value: 'lineup', label: 'Lineup' },
              { value: 'scorer', label: 'Scorer' },
            ]}
          />
        }
      >
        {tab === 'scorer' ? (
          <CardScorer team={this.props.team} game={this.props.game} />
        ) : null}
        {tab === 'lineup' ? (
          <CardLineup team={this.props.team} game={this.props.game} />
        ) : null}
      </Card>
    );
  }
}
