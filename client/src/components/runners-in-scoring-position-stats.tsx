import React, { Component } from 'react';
import SharedLib from 'shared-lib';

interface RunnerStats {
  hitsWithRunnersOn_000: number;
  hitsWithRunnersOn_100: number;
  hitsWithRunnersOn_010: number;
  hitsWithRunnersOn_001: number;
  hitsWithRunnersOn_110: number;
  hitsWithRunnersOn_011: number;
  hitsWithRunnersOn_101: number;
  hitsWithRunnersOn_111: number;
  missesWithRunnersOn_000: number;
  missesWithRunnersOn_100: number;
  missesWithRunnersOn_010: number;
  missesWithRunnersOn_001: number;
  missesWithRunnersOn_110: number;
  missesWithRunnersOn_011: number;
  missesWithRunnersOn_101: number;
  missesWithRunnersOn_111: number;
}

interface RISPProps {
  stats: RunnerStats;
}

export default class RunnersInScoringPositionStats extends Component<RISPProps> {
  render() {
    const stats = this.props.stats;

    const hitsRunnersOn =
      stats.hitsWithRunnersOn_100 +
      stats.hitsWithRunnersOn_010 +
      stats.hitsWithRunnersOn_110 +
      stats.hitsWithRunnersOn_101 +
      stats.hitsWithRunnersOn_111;

    const missesRunnersOn =
      stats.missesWithRunnersOn_100 +
      stats.missesWithRunnersOn_010 +
      stats.missesWithRunnersOn_110 +
      stats.missesWithRunnersOn_101 +
      stats.missesWithRunnersOn_111;

    const hitsRISP =
      stats.hitsWithRunnersOn_010 +
      stats.hitsWithRunnersOn_110 +
      stats.hitsWithRunnersOn_101 +
      stats.hitsWithRunnersOn_111;

    const missesRISP =
      stats.missesWithRunnersOn_010 +
      stats.missesWithRunnersOn_110 +
      stats.missesWithRunnersOn_101 +
      stats.missesWithRunnersOn_111;

    const allHits = hitsRunnersOn + stats.hitsWithRunnersOn_000;
    const allMisses = missesRunnersOn + stats.missesWithRunnersOn_000;
    const allAvg = allHits / (allHits + allMisses);

    const seasonStats = [
      <tr
        key={'season-headers'}
        style={{
          textAlign: 'left',
        }}
      >
        <th>Runners on</th>
        <th>Hits</th>
        <th>AB</th>
        <th>Avg</th>
        <th>% Diff</th>
      </tr>,
      <tr key="all-pas">
        <td>All PAs</td>
        <td>{allHits}</td>
        <td>{allHits + allMisses}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            allHits,
            allHits + allMisses
          )}
        </td>
        <td>-</td>
      </tr>,
      <tr key="no-runners">
        <td>No Runners</td>
        <td>{stats.hitsWithRunnersOn_000}</td>
        <td>{stats.hitsWithRunnersOn_000 + stats.missesWithRunnersOn_000}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            stats.hitsWithRunnersOn_000,
            stats.hitsWithRunnersOn_000 + stats.missesWithRunnersOn_000
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            stats.hitsWithRunnersOn_000 /
              (stats.hitsWithRunnersOn_000 + stats.missesWithRunnersOn_000)
          )}
        </td>
      </tr>,
      <tr key="any-runners">
        <td>Any Runners</td>
        <td>{hitsRunnersOn}</td>
        <td>{hitsRunnersOn + missesRunnersOn}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            hitsRunnersOn,
            hitsRunnersOn + missesRunnersOn
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            hitsRunnersOn / (hitsRunnersOn + missesRunnersOn)
          )}
        </td>
      </tr>,
      <tr key="risp">
        <td>RISP</td>
        <td>{hitsRISP}</td>
        <td>{hitsRISP + missesRISP}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            hitsRISP,
            hitsRISP + missesRISP
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            hitsRISP / (hitsRISP + missesRISP)
          )}
        </td>
      </tr>,
      <tr key="1b">
        <td>1B</td>
        <td>{stats.hitsWithRunnersOn_100}</td>
        <td>{stats.missesWithRunnersOn_100 + stats.hitsWithRunnersOn_100}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            stats.hitsWithRunnersOn_100,
            stats.hitsWithRunnersOn_100 + stats.missesWithRunnersOn_100
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            stats.hitsWithRunnersOn_100 /
              (stats.hitsWithRunnersOn_100 + stats.missesWithRunnersOn_100)
          )}
        </td>
      </tr>,
      <tr key="2b">
        <td>2B</td>
        <td>{stats.hitsWithRunnersOn_010}</td>
        <td>{stats.missesWithRunnersOn_010 + stats.hitsWithRunnersOn_010}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            stats.hitsWithRunnersOn_010,
            stats.hitsWithRunnersOn_010 + stats.missesWithRunnersOn_010
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            stats.hitsWithRunnersOn_010 /
              (stats.hitsWithRunnersOn_010 + stats.missesWithRunnersOn_010)
          )}
        </td>
      </tr>,
      <tr key="3b">
        <td>3B</td>
        <td>{stats.hitsWithRunnersOn_001}</td>
        <td>{stats.missesWithRunnersOn_001 + stats.hitsWithRunnersOn_001}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            stats.hitsWithRunnersOn_001,
            stats.hitsWithRunnersOn_001 + stats.missesWithRunnersOn_001
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            stats.hitsWithRunnersOn_001 /
              (stats.hitsWithRunnersOn_001 + stats.missesWithRunnersOn_001)
          )}
        </td>
      </tr>,
      <tr key="1b-2b">
        <td>1B, 2B</td>
        <td>{stats.hitsWithRunnersOn_110}</td>
        <td>{stats.missesWithRunnersOn_110 + stats.hitsWithRunnersOn_110}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            stats.hitsWithRunnersOn_110,
            stats.hitsWithRunnersOn_110 + stats.missesWithRunnersOn_110
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            stats.hitsWithRunnersOn_110 /
              (stats.hitsWithRunnersOn_110 + stats.missesWithRunnersOn_110)
          )}
        </td>
      </tr>,
      <tr key="2b-3b">
        <td>2B, 3B</td>
        <td>{stats.hitsWithRunnersOn_011}</td>
        <td>{stats.missesWithRunnersOn_011 + stats.hitsWithRunnersOn_011}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            stats.hitsWithRunnersOn_011,
            stats.hitsWithRunnersOn_011 + stats.missesWithRunnersOn_011
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            stats.hitsWithRunnersOn_011 /
              (stats.hitsWithRunnersOn_011 + stats.missesWithRunnersOn_011)
          )}
        </td>
      </tr>,
      <tr key="1b-3b">
        <td>1B, 3B</td>
        <td>{stats.hitsWithRunnersOn_101}</td>
        <td>{stats.missesWithRunnersOn_101 + stats.hitsWithRunnersOn_101}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            stats.hitsWithRunnersOn_101,
            stats.hitsWithRunnersOn_101 + stats.missesWithRunnersOn_101
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            stats.hitsWithRunnersOn_101 /
              (stats.hitsWithRunnersOn_101 + stats.missesWithRunnersOn_101)
          )}
        </td>
      </tr>,
      <tr key="1b-2b-3b">
        <td>1B, 2B, 3B</td>
        <td>{stats.hitsWithRunnersOn_111}</td>
        <td>{stats.missesWithRunnersOn_111 + stats.hitsWithRunnersOn_111}</td>
        <td>
          {SharedLib.commonUtils.calculateFormattedAverage(
            stats.hitsWithRunnersOn_111,
            stats.hitsWithRunnersOn_111 + stats.missesWithRunnersOn_111
          )}
        </td>
        <td>
          {SharedLib.commonUtils.percentageIncrease(
            allAvg,
            stats.hitsWithRunnersOn_111 /
              (stats.hitsWithRunnersOn_111 + stats.missesWithRunnersOn_111)
          )}
        </td>
      </tr>,
    ];

    return (
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
    );
  }
}
