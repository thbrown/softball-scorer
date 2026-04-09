import React from 'react';
import { setRoute } from 'actions/route';
import CardStatsGame from 'cards/card-stats-game';
import CardStatsSharing from 'cards/card-stats-sharing';
import CardStatsSeason from 'cards/card-stats-season';
import HeaderTabs from 'elements/header-tabs';
import Card from 'elements/card';
import { getGlobalState } from 'state';
import type { Team, Game } from 'shared-lib';

interface CardStatsPublicProps {
  team: Team | null;
  tab: string;
  game?: Game | null;
  inputState?: unknown;
  state?: unknown | null;
}

export default class CardStatsPublic extends React.Component<CardStatsPublicProps> {
  static SEASON_TAB = 'season';
  static GAME_STATS_TAB = 'games';

  static defaultProps = {
    team: null,
    state: null,
  };

  handleTabClick: (tab: string) => void;

  constructor(props: CardStatsPublicProps) {
    super(props);

    this.handleTabClick = (tab: string) => {
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
    let tabToShow: React.JSX.Element | null = null;
    if (this.props.team && this.props.tab === CardStatsPublic.GAME_STATS_TAB) {
      tabToShow = (
        <CardStatsGame
          team={this.props.team}
          game={this.props.game ? this.props.game : this.props.team.games[0]}
          isPublic={true}
          backNavUrl={`/public-teams/${this.props.team.publicId}/stats`}
          inputState={this.props.inputState}
          showGame={function (gameId: string) {
            if (this.props.team) {
              setRoute(
                `/public-teams/${this.props.team.publicId}/stats/games/${gameId}`
              );
            }
          }.bind(this)}
        />
      );
    } else if (this.props.team) {
      tabToShow = (
        <CardStatsSeason
          team={this.props.team}
          inputState={this.props.inputState}
          onPlayerClick={(playerId: string) => {
            if (this.props.team) {
              setRoute(
                `/public-teams/${this.props.team.publicId}/stats/player/${playerId}`
              );
            }
          }}
        />
      );
    }

    return (
      <Card
        title={this.props.team ? `Stats for ${this.props.team.name}` : 'Stats'}
        rightHeaderProps={{
          showBlogLink: getGlobalState().isSessionValid() ? false : true, // Show home button if user is already signed into a softball.app account, otherwise the blog link
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
            marginLeft: '8px',
            marginRight: '8px',
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
