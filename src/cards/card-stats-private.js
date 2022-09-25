import React from 'react';
import { setRoute } from 'actions/route';
import CardStatsGame from 'cards/card-stats-game';
import CardStatsSharing from 'cards/card-stats-sharing';
import CardStatsSeason from 'cards/card-stats-season';
import HeaderTabs from 'elements/header-tabs';

export default class CardStatsPrivate extends React.Component {
  static SEASON_TAB = 'season';
  static GAME_STATS_TAB = 'games';
  static SHARING_TAB = 'sharing';

  constructor(props) {
    super(props);

    this.handleTabClick = (tab) => {
      if (tab) {
        setRoute(`/teams/${this.props.team.id}/stats/${tab}`);
      } else {
        setRoute(
          `/teams/${this.props.team.id}/stats/${CardStatsPrivate.SEASON_TAB}`
        );
      }
    };
  }

  render() {
    let tabToShow = null;
    if (this.props.tab === CardStatsPrivate.GAME_STATS_TAB) {
      tabToShow = (
        <CardStatsGame
          team={this.props.team}
          game={this.props.game ? this.props.game : this.props.team.games[0]}
          isPublic={false}
          backNavUrl={`/teams/${this.props.team.id}/stats`}
          showGame={function (gameId) {
            setRoute(`/teams/${this.props.team.id}/stats/games/${gameId}`);
          }.bind(this)}
        />
      );
    } else if (this.props.tab === CardStatsPrivate.SHARING_TAB) {
      tabToShow = <CardStatsSharing team={this.props.team} />;
    } else {
      tabToShow = (
        <CardStatsSeason
          team={this.props.team}
          onPlayerClick={(playerId) => {
            setRoute(`/teams/${this.props.team.id}/stats/player/${playerId}`);
          }}
        />
      );
    }

    return (
      <div>
        <HeaderTabs
          handleTabClick={(tabValue) => {
            this.handleTabClick(tabValue);
          }}
          tab={this.props.tab}
          tabNames={[
            { value: CardStatsPrivate.SEASON_TAB, label: 'Season' },
            { value: CardStatsPrivate.GAME_STATS_TAB, label: 'Games' },
            { value: CardStatsPrivate.SHARING_TAB, label: 'Sharing' },
          ]}
          invert={true}
          style={{
            marginBottom: '16px',
            fontSize: '20px',
            marginLeft: '8px',
            marginRight: '8px',
          }}
          tabStyle={{
            height: '28px',
          }}
        />
        <div style={{ marginTop: '6px' }}>{tabToShow}</div>
      </div>
    );
  }
}

CardStatsPrivate.defaultProps = {
  team: null,
  state: null,
};
