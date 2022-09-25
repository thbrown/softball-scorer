import React from 'react';
import { setRoute } from 'actions/route';
import CardStatsGame from 'cards/card-stats-game';
import CardStatsSharing from 'cards/card-stats-sharing';
import CardStatsSeason from 'cards/card-stats-season';
import HeaderTabs from 'elements/header-tabs';
import Card from 'elements/card';

export default class CardStatsPublic extends React.Component {
  static SEASON_TAB = 'season';
  static GAME_STATS_TAB = 'games';

  constructor(props) {
    super(props);

    this.handleTabClick = (tab) => {
      if (tab) {
        setRoute(`/public-teams/${this.props.team.publicId}/stats/${tab}`);
      } else {
        setRoute(
          `/public-teams/${this.props.team.publicId}/stats/${CardStatsPublic.SEASON_TAB}`
        );
      }
    };
  }

  render() {
    let tabToShow = null;
    if (this.props.tab === CardStatsPublic.GAME_STATS_TAB) {
      tabToShow = (
        <CardStatsGame
          team={this.props.team}
          game={this.props.game ? this.props.game : this.props.team.games[0]}
          isPublic={true}
          backNavUrl={`/public-teams/${this.props.team.publicId}/stats`}
          inputState={this.props.inputState}
          showGame={function (gameId) {
            setRoute(
              `/public-teams/${this.props.team.publicId}/stats/games/${gameId}`
            );
          }.bind(this)}
        />
      );
    } else {
      tabToShow = (
        <CardStatsSeason
          team={this.props.team}
          inputState={this.props.inputState}
          onPlayerClick={(playerId) => {
            setRoute(
              `/public-teams/${this.props.team.publicId}/stats/player/${playerId}`
            );
          }}
        />
      );
    }

    return (
      <Card
        title={`Stats for ${this.props.team.name}`}
        rightHeaderProps={{
          showBlogLink: true,
        }}
      >
        <HeaderTabs
          handleTabClick={(tabValue) => {
            this.handleTabClick(tabValue);
          }}
          tab={this.props.tab}
          tabNames={[
            { value: CardStatsPublic.SEASON_TAB, label: 'Season' },
            { value: CardStatsPublic.GAME_STATS_TAB, label: 'Games' },
          ]}
          invert={true}
          style={{
            marginBottom: '16px',
            fontSize: '20px',
          }}
          tabStyle={{
            height: '28px',
          }}
        />

        <div style={{ marginTop: '6px' }}>{tabToShow}</div>
      </Card>
    );
  }
}

CardStatsPublic.defaultProps = {
  team: null,
  state: null,
};
