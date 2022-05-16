import React from 'react';
import Card from 'elements/card';
import { setRoute } from 'actions/route';
import Spray from '../components/spray';
import state from 'state';
import css from 'css';

export default class CardPlayerStats extends React.Component {
  render() {
    // Generate season stats section
    let playerStatsByTeam = [];
    let allTeams = state.getAllTeams();
    for (let team of allTeams) {
      let playerPAsOnTeam = state.getPlateAppearancesForPlayerOnTeam(
        this.props.player.id,
        team.id
      );
      if (playerPAsOnTeam.length !== 0) {
        playerStatsByTeam.push({
          teamName: team.name,
          stats: state.buildStatsObject(this.props.player.id, playerPAsOnTeam),
        });
      }
    }

    let seasonStats = [
      <tr key={'season-headers'} style={{ textAlign: 'right' }}>
        <th style={{ textAlign: 'left' }}>Team Name</th>
        <th>PA</th>
        <th>Avg</th>
        <th>Slg</th>
        <th>2B</th>
        <th>3B</th>
        <th>HR</th>
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
        </tr>
      );
    }

    let allPAs = state.getPlateAppearancesForPlayer(this.props.player.id);
    let allTimeStats = state.buildStatsObject(this.props.player.id, allPAs);
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
        <Spray
          //team={this.props.team}
          //player={this.props.player}
          decoratedPlateAppearances={state.getDecoratedPlateAppearancesForPlayer(
            this.props.player.id
          )}
        ></Spray>
        <div
          style={{
            margin: '7px auto',
            maxWidth: '500px',
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
            {seasonStats}
          </table>
        </div>
      </Card>
    );
  }
}
