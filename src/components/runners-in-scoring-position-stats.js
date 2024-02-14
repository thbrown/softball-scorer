import css from 'css';
import React, { Component } from 'react';
import SharedLib from 'shared-lib';

export default class RunnersInScoringPositionStats extends Component {
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
      <tr>
        <th style={{ textAlign: 'left' }}>All PAs</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>No Runners</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>Any Runners</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>RISP</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>1B</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>2B</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>3B</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>1B, 2B</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>2B, 3B</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>1B, 3B</th>
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
      <tr>
        <th style={{ textAlign: 'left' }}>1B, 2B, 3B</th>
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
          fontSize: css.typography.size.small,
          width: '100%',
          padding: css.spacing.medium,
          paddingTop: '0',
        }}
      >
        <tbody className="player-stats">{seasonStats}</tbody>
      </table>
    );
  }
}
