import React from 'react';
import Card from 'elements/card';
import { setRoute } from 'actions/route';
import Spray from '../components/spray';
import state from 'state';
import css from 'css';
import InnerSection from 'elements/inner-section';

export default class CardPlayerStats extends React.Component {
  getSeasonalStats() {
    const playerStatsByTeam = [];
    const allTeams = state.getAllTeams();
    for (const team of allTeams) {
      const playerPAsOnTeam = state.getDecoratedPlateAppearancesForPlayerOnTeam(
        this.props.player.id,
        team.id
      );
      if (playerPAsOnTeam.length !== 0) {
        playerStatsByTeam.push({
          teamName: team.name,
          stats: state.buildStatsObject(playerPAsOnTeam, this.props.player.id),
        });
      }
    }
    return playerStatsByTeam;
  }

  render() {
    // Generate season stats section
    const playerStatsByTeam = this.getSeasonalStats();

    const seasonStats = [
      <tr key={'season-headers'} style={{ textAlign: 'right' }}>
        <th style={{ textAlign: 'left' }}>Team Name</th>
        <th>PA</th>
        <th>Avg</th>
        <th>Slg</th>
        <th>2B</th>
        <th>3B</th>
        <th>HR</th>
        <th>rG</th>
        <th>rPA</th>
        <th>PA/G</th>
      </tr>,
    ];
    for (let season of playerStatsByTeam) {
      seasonStats.push(
        <tr key={'season-' + season.teamName} style={{ textAlign: 'right' }}>
          <td style={{ textAlign: 'left' }}>{season.teamName}</td>
          <td>{season.stats.plateAppearances}</td>
          <td>{season.stats.battingAverage}</td>
          <td>{season.stats.sluggingPercentage}</td>
          <td>{season.stats.doubles}</td>
          <td>{season.stats.triples}</td>
          <td>{season.stats.homeruns}</td>
          <td>{season.stats.gameAutocorrelation}</td>
          <td>{season.stats.paAutocorrelation}</td>
          <td>{season.stats.paPerGame}</td>
        </tr>
      );
    }

    const allPAs = state.getDecoratedPlateAppearancesForPlayer(
      this.props.player.id
    );
    const allTimeStats = state.buildStatsObject(allPAs, this.props.player.id);
    seasonStats.push(
      <tr key={'season-alltime'} style={{ textAlign: 'right' }}>
        <td style={{ textAlign: 'left' }}>
          <b>Total</b>
        </td>
        <td>
          <b>{allTimeStats.plateAppearances}</b>
        </td>
        <td>
          <b>{allTimeStats.battingAverage}</b>
        </td>
        <td>
          <b>{allTimeStats.sluggingPercentage}</b>
        </td>
        <td>
          <b>{allTimeStats.doubles}</b>
        </td>
        <td>
          <b>{allTimeStats.triples}</b>
        </td>
        <td>
          <b>{allTimeStats.homeruns}</b>
        </td>
        <td>
          <b>{allTimeStats.gameAutocorrelation}</b>
        </td>
        <td>
          <b>{allTimeStats.paAutocorrelation}</b>
        </td>
        <td>
          <b>{allTimeStats.paPerGame}</b>
        </td>
      </tr>
    );

    return (
      <Card
        title={this.props.player.name}
        leftHeaderProps={{
          onClick: () => {
            if (this.props.backNavUrl) {
              setRoute(this.props.backNavUrl);
              return true;
            }
          },
        }}
      >
        <div
          style={{
            margin: 'auto',
            maxWidth: '500px',
            padding: '0.25rem',
            textAlign: 'center',
            color: css.colors.TEXT_GREY,
          }}
        >
          Tap a location to see information about the plate appearance.
        </div>
        <Spray
          decoratedPlateAppearances={state.getDecoratedPlateAppearancesForPlayer(
            this.props.player.id
          )}
        ></Spray>
        <InnerSection
          style={{
            margin: '7px auto',
            color: css.colors.TEXT_LIGHT,
            backgroundColor: css.colors.PRIMARY_DARK,
            borderRadius: '9px',
            marginBottom: '100px',
          }}
        >
          <div
            style={{
              fontSize: '16px',
              fontWeight: 'bold',
              paddingTop: '1rem',
              paddingLeft: '1rem',
            }}
          >
            Stats
          </div>
          <table style={{ width: '100%', padding: '1rem' }}>
            <tbody>{seasonStats}</tbody>
          </table>
        </InnerSection>
      </Card>
    );
  }
}
