import React from 'react';
import expose from './expose';
import state from 'state';
import Card from 'elements/card';
import { StickyTable, Row, Cell } from 'react-sticky-table';
import { setRoute } from 'actions/route';
import css from 'css';

const DSC_CHAR = '▼'; //'\25bc';
const ASC_CHAR = '▲'; //'\25be';

const STATS_NAMES = [
  'battingAverage',
  'sluggingPercentage',
  'atBats',
  'doubles',
  'triples',
  'insideTheParkHR',
  'outsideTheParkHR',
  'walks',
  'reachedOnError',
];

const STAT_ALIASES = {
  name: 'Name',
  battingAverage: 'BA',
  sluggingPercentage: 'SLG',
  atBats: 'AB',
  doubles: '2B',
  triples: '3B',
  insideTheParkHR: 'HRI',
  outsideTheParkHR: 'HRO',
  walks: 'BB',
  reachedOnError: 'ROE',
};

export default class CardStats extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.state = {
      sortField: 'atBats',
      sortDirection: 'DSC',
    };

    this.sortByState = (a, b) => {
      if (this.state.sortDirection === 'DSC') {
        if (isNaN(a[this.state.sortField]) || isNaN(b[this.state.sortField])) {
          if (a[this.state.sortField] < b[this.state.sortField]) {
            return -1;
          } else if (a[this.state.sortField] > b[this.state.sortField]) {
            return 1;
          } else {
            return 0;
          }
        } else {
          return (
            parseFloat(b[this.state.sortField]) -
            parseFloat(a[this.state.sortField])
          );
        }
      } else {
        if (isNaN(a[this.state.sortField]) || isNaN(b[this.state.sortField])) {
          if (a[this.state.sortField] < b[this.state.sortField]) {
            return 1;
          } else if (a[this.state.sortField] > b[this.state.sortField]) {
            return -1;
          } else {
            return 0;
          }
        } else {
          return (
            parseFloat(a[this.state.sortField]) -
            parseFloat(b[this.state.sortField])
          );
        }
      }
    };
    this.handleStatsClick = function(sortField) {
      const newState = Object.assign({}, this.state);
      if (newState.sortField === sortField) {
        newState.sortDirection =
          newState.sortDirection === 'DSC' ? 'ASC' : 'DSC';
      } else {
        newState.sortDirection = 'DSC';
        newState.sortField = sortField;
      }
      this.setState(newState);
    }.bind(this);

    this.handlePlayerClick = function(playerId) {
      const {
        team: { id: teamId },
        routingMethod,
      } = this.props;
      if (routingMethod === 'app') {
        setRoute(`/teams/${teamId}/stats/player/${playerId}`);
      } else if (routingMethod === 'statsPage') {
        setRoute(`/stats/${this.props.state.statsId}/player/${playerId}`);
      }
    }.bind(this);
  }

  getHeaderText(statName) {
    if (statName === this.state.sortField) {
      const ret =
        STAT_ALIASES[statName] +
        (this.state.sortDirection === 'DSC' ? DSC_CHAR : ASC_CHAR);
      return ret;
    } else {
      return STAT_ALIASES[statName];
    }
  }

  getCellClassName(statName) {
    let className = 'table-cell';
    if (statName === 'name') {
      className = className + ' name-stat-cell';
    } else {
      if (STAT_ALIASES[statName].length > 2) {
        className =
          className +
          ` ${
            STATS_NAMES.slice(0, 2).includes(statName) ? 'percentage' : 'number'
          }-stat-cell`;
      } else {
        className =
          className +
          ` ${
            STATS_NAMES.slice(0, 2).includes(statName) ? 'percentage' : 'number'
          }-stat-cell`;
      }
    }
    return className;
  }

  buildStatsObject(teamId, playerId) {
    const { team, state: stateProps } = this.props;
    const plateAppearances = state.getPlateAppearancesForPlayerOnTeam(
      playerId,
      team
    );
    const player = state.getPlayer(playerId, stateProps);
    return state.buildStatsObject(player, plateAppearances);
  }

  renderStatsHeader() {
    const elems = ['name'].concat(STATS_NAMES).map(statName => {
      return (
        <Cell key={statName}>
          <div
            className={this.getCellClassName(statName)}
            onClick={this.handleStatsClick.bind(this, statName)}
          >
            <span style={{ userSelect: 'none' }}>
              {this.getHeaderText(statName)}
            </span>
          </div>
        </Cell>
      );
    });

    return (
      <Row
        key="header"
        style={{
          cursor: 'default',
          color: 'white',
          display: 'flex',
          fontWeight: 'bold',
        }}
      >
        {elems}
      </Row>
    );
  }

  renderPlayerRow(playerStats) {
    const elems = ['name'].concat(STATS_NAMES).map((statName, i) => {
      return (
        <Cell key={statName}>
          <div
            className={this.getCellClassName(statName)}
            onClick={
              !i ? this.handlePlayerClick.bind(this, playerStats.id) : null
            }
          >
            <span style={{ userSelect: 'none' }}>{playerStats[statName]}</span>
          </div>
        </Cell>
      );
    });

    return (
      <Row
        key={playerStats.name}
        style={{ cursor: 'default', color: 'white', display: 'flex' }}
      >
        {elems}
      </Row>
    );
  }

  render() {
    const { team, state: stateProps } = this.props;

    if (!team) {
      throw new Error('No team given to CardStats.');
    }

    // TODO: Generate this once when the component mounts.  It's very redundant to do it
    // on each render
    const s = stateProps || state.getLocalState();
    const playerStatsList = s.players
      .filter(player => {
        return team.games.reduce((result, game) => {
          return result || game.lineup.indexOf(player.id) > -1;
        }, false);
      })
      .map(player => {
        return this.buildStatsObject(team.id, player.id);
      })
      .sort((a, b) => {
        return this.sortByState(a, b);
      });

    if (playerStatsList.length === 0) {
      throw new Error('No playerStats could be generated.');
    }

    const tableElems = [this.renderStatsHeader()].concat(
      playerStatsList.map(playerStats => {
        return this.renderPlayerRow(playerStats);
      })
    );

    return (
      <Card title="Stats">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: css.spacing.xSmall,
          }}
        >
          <StickyTable>{tableElems}</StickyTable>
        </div>
      </Card>
    );
  }
}

CardStats.defaultProps = {
  team: null,
  state: null,
  routingMethod: 'app',
};
