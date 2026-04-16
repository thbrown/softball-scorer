import React from 'react';
import expose from 'expose';
import Card from 'elements/card';
import HeaderTabs from 'elements/header-tabs';
import CardLineup from 'cards/card-lineup';
import GameScorer from 'components/game-scorer';
import { setRoute } from 'actions/route';
import type { Team, Game } from 'shared-lib';

const defaultTab = 'lineup';

interface CardGameProps {
  team: Team;
  game: Game;
  tab?: string;
}

export default class CardGame extends expose.Component<CardGameProps> {
  handleTabClick: (newTab: string) => void;

  constructor(props: CardGameProps) {
    super(props);
    this.exposeOverwrite('game');

    this.handleTabClick = (newTab: string) => {
      setRoute(
        `/teams/${this.props.team.id}/games/${this.props.game.id}/${newTab}`,
        true
      );
    };
  }

  render() {
    let tab = this.props.tab || defaultTab;
    return (
      <Card
        title={
          <HeaderTabs
            handleTabClick={(tabValue) => {
              this.handleTabClick(tabValue);
            }}
            tab={this.props.tab ?? ''}
            tabNames={[
              { value: 'lineup', label: 'Lineup' },
              { value: 'scorer', label: 'Score' },
            ]}
          />
        }
      >
        {tab === 'scorer' ? (
          <GameScorer teamId={this.props.team.id} gameId={this.props.game.id} />
        ) : null}
        {tab === 'lineup' ? (
          <CardLineup team={this.props.team} game={this.props.game} />
        ) : null}
      </Card>
    );
  }
}
