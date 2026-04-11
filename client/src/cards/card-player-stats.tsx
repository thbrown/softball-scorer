import React from 'react';
import Card from 'elements/card';
import { setRoute } from 'actions/route';
import Spray from '../components/spray';
import { getGlobalState } from 'state';
import InnerSection from 'elements/inner-section';
import IconButton from '../elements/icon-button';
import { showStatsHelp } from 'utils/help-functions';
import RunnersInScoringPositionStats from '../components/runners-in-scoring-position-stats';
import type { Player, PlateAppearance } from 'shared-lib';
import { asPlayerId, asTeamId } from 'types/branded-ids';

interface PlayerTeamStats {
  teamName: string;
  stats: Record<string, any>;
}

interface CardPlayerStatsProps {
  player: Player;
  backNavUrl?: string;
}

interface CardPlayerStatsState {
  // No state needed for this component
}

export default class CardPlayerStats extends React.Component<
  CardPlayerStatsProps,
  CardPlayerStatsState
> {
  getSeasonalStats = (): PlayerTeamStats[] => {
    const playerStatsByTeam: PlayerTeamStats[] = [];
    const allTeams = getGlobalState().getAllTeams();
    for (const team of allTeams) {
      const playerPAsOnTeam =
        getGlobalState().getDecoratedPlateAppearancesForPlayerOnTeam(
          asPlayerId(this.props.player.id),
          asTeamId(team.id)
        );
      if (playerPAsOnTeam.length !== 0) {
        playerStatsByTeam.push({
          teamName: team.name,
          stats: getGlobalState().buildStatsObject(
            playerPAsOnTeam,
            asPlayerId(this.props.player.id)
          ),
        });
      }
    }
    return playerStatsByTeam;
  };

  render(): JSX.Element {
    // Generate season stats section
    const playerStatsByTeam = this.getSeasonalStats();

    const seasonStats: JSX.Element[] = [
      <tr
        key={'season-headers'}
        style={{
          textAlign: 'right',
        }}
      >
        <th style={{ textAlign: 'left' }}>Team Name</th>
        <th>PA</th>
        <th>Avg</th>
        <th>Slg</th>
        <th>RBI</th>
        <th>2B</th>
        <th>3B</th>
        <th>HR</th>
        <th>rG</th>
        <th>rPA</th>
        <th>PA/G</th>
        <th>O/G</th>
      </tr>,
    ];
    for (let season of playerStatsByTeam) {
      seasonStats.push(
        <tr
          key={'season-' + season.teamName}
          style={{
            textAlign: 'right',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          <td style={{ textAlign: 'left' }}>{season.teamName}</td>
          <td>{season.stats.plateAppearances}</td>
          <td>{season.stats.battingAverage}</td>
          <td>{season.stats.sluggingPercentage}</td>
          <td>{season.stats.rbi}</td>
          <td>{season.stats.doubles}</td>
          <td>{season.stats.triples}</td>
          <td>{season.stats.homeruns}</td>
          <td>{season.stats.gameAutocorrelation}</td>
          <td>{season.stats.paAutocorrelation}</td>
          <td>{season.stats.paPerGame}</td>
          <td>{season.stats.outsPerGame}</td>
        </tr>
      );
    }

    const allPAs = getGlobalState().getDecoratedPlateAppearancesForPlayer(
      asPlayerId(this.props.player.id)
    );
    const allTimeStats = getGlobalState().buildStatsObject(
      allPAs,
      asPlayerId(this.props.player.id)
    );
    seasonStats.push(
      <tr
        key={'season-alltime'}
        style={{
          textAlign: 'right',
        }}
      >
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
          onClick: (): boolean | void => {
            if (this.props.backNavUrl) {
              setRoute(this.props.backNavUrl);
              return true;
            }
          },
        }}
      >
        <Spray
          decoratedPlateAppearances={getGlobalState().getDecoratedPlateAppearancesForPlayer(
            asPlayerId(this.props.player.id)
          )}
        ></Spray>
        <InnerSection
          style={{
            marginTop: 'var(--spacing-xx-small)',
            overflow: 'auto',
            color: 'var(--color-text-light)',
            backgroundColor: 'var(--color-primary-dark)',
            borderRadius: 'var(--border-radius-medium)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--typography-size-medium)',
              paddingLeft: 'var(--spacing-medium)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div>Stats</div>
            <IconButton
              className="help-icon"
              src="/assets/help.svg"
              alt="help"
              onClick={showStatsHelp}
            />
          </div>
          <table
            style={{
              fontSize: 'var(--typography-size-small)',
              width: '100%',
              padding: 'var(--spacing-medium)',
              paddingTop: '0',
            }}
          >
            <tbody className="player-stats">{seasonStats}</tbody>
          </table>
        </InnerSection>
        <InnerSection
          style={{
            marginTop: 'var(--spacing-xx-small)',
            overflow: 'auto',
            color: 'var(--color-text-light)',
            backgroundColor: 'var(--color-primary-dark)',
            borderRadius: 'var(--border-radius-medium)',
          }}
        >
          <div
            style={{
              fontSize: 'var(--typography-size-medium)',
              paddingLeft: 'var(--spacing-medium)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <div style={{ paddingTop: '14px', paddingBottom: '14px' }}>
              Hitting by Base Runners
            </div>
          </div>
          <RunnersInScoringPositionStats
            stats={allTimeStats}
          ></RunnersInScoringPositionStats>
        </InnerSection>
      </Card>
    );
  }
}
