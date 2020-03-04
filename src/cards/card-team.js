import React from 'react';
import css from 'css';
import CardStats from 'cards/card-stats';
import GameList from 'components/game-list';
import Card from 'elements/card';
import { setRoute } from 'actions/route';

export default class CardTeam extends React.Component {
  constructor(props) {
    super(props);
    this.handleTabClick = tab => {
      setRoute(window?.location?.pathname + '?tab=' + tab);
    };
  }

  render() {
    return (
      <Card
        title={
          <div className="card-title-tab-container">
            <div
              onClick={() => {
                this.handleTabClick('stats');
              }}
              style={{
                borderBottom:
                  this.props.tab === 'stats'
                    ? '5px solid ' + css.colors.TEXT_LIGHT
                    : 'none',
                height: '42px',
              }}
            >
              Stats
            </div>
            <div
              onClick={() => {
                this.handleTabClick('games');
              }}
              style={{
                borderBottom:
                  this.props.tab === 'games'
                    ? '5px solid ' + css.colors.TEXT_LIGHT
                    : 'none',
                height: '42px',
              }}
            >
              Games
            </div>
          </div>
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
