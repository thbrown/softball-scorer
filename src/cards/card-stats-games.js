import React from 'react';
import ListButton from 'elements/list-button';
import { sortObjectsByDate, toClientDate } from 'utils/functions';
import { setRoute } from 'actions/route';

export default class CardStatsSharing extends React.Component {
  constructor(props) {
    super(props);

    this.handleGameClick = function (game) {
      setRoute(`/teams/${this.props.team.id}/stats/games/${game.id}`);
    };
  }

  render() {
    const games = sortObjectsByDate(this.props.team.games, { isAsc: false });
    const elems = games.map((game) => {
      const teamStatsForGame = getGlobalState().buildStatsObject(
        game.plateAppearances
      );
      return (
        <ListButton
          key={'game-' + game.id}
          id={'game-' + game.id}
          onClick={this.handleGameClick.bind(this, game)}
        >
          <div className="centered-row">
            <div className="prevent-overflow">
              <span>Stats:</span>
              <span style={{ marginLeft: '4px', fontSize: '9px' }}>VS. </span>
              {game.opponent}
            </div>
            <div>PAs: {game.plateAppearances.length}</div>
            <div>Team avg: {teamStatsForGame.battingAverage}</div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  fontSize: '12px',
                  marginRight: '10px',
                }}
              >
                {toClientDate(game.date)}
              </div>
            </div>
          </div>
        </ListButton>
      );
    });

    return <div>{elems}</div>;
  }
}
