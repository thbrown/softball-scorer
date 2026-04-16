import React from 'react';
import CardStatsPrivate from 'cards/card-stats-private';
import GameList from 'components/game-list';
import Card from 'elements/card';
import HeaderTabs from 'elements/header-tabs';
import { setRoute } from 'actions/route';
import type { Team, Game } from 'shared-lib';

interface CardTeamProps {
  team: Team;
  tab: string;
  subtab?: string;
  game?: Game;
}

export default class CardTeam extends React.Component<CardTeamProps> {
  handleTabClick: (tab: string) => void;

  constructor(props: CardTeamProps) {
    super(props);
    this.handleTabClick = (tab: string) => {
      setRoute(`/teams/${this.props.team.id}/${tab}`, true);
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
            tab={this.props.subtab ?? ''}
            game={this.props.game}
          />
        ) : (
          <GameList team={this.props.team} />
        )}
      </Card>
    );
  }
}
