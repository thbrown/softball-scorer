import React from 'react';
import { getGlobalState } from 'state';
import CardSection from 'elements/card-section';
import { StickyTable, Row, Cell } from 'react-sticky-table';
import InnerSection from 'elements/inner-section';
import { showStatsHelp } from 'utils/help-functions';
import { FilterStatsModal, getUrlFilterState } from 'components/filter-stats';

const DSC_CHAR = '▼'; //'\25bc';
const ASC_CHAR = '▲'; //'\25be';

const STATS_NAMES = [
  'battingAverage',
  'sluggingPercentage',
  'atBats',
  'rbi',
  // 'runs',
  'doubles',
  'triples',
  'insideTheParkHRs',
  'outsideTheParkHRs',
  'walks',
  'doublePlays',
  'reachedOnError',
  'gameAutocorrelation',
  'paAutocorrelation',
  'paPerGame',
  'outsPerGame',
];

const STAT_ALIASES = {
  name: 'Name',
  battingAverage: 'BA',
  sluggingPercentage: 'SLG',
  atBats: 'AB',
  rbi: 'RBI',
  // runs: 'R',
  doubles: '2B',
  triples: '3B',
  insideTheParkHRs: 'HRi',
  outsideTheParkHRs: 'HRo',
  walks: 'BB',
  reachedOnError: 'ROE',
  doublePlays: 'DP',
  gameAutocorrelation: 'rG',
  paAutocorrelation: 'rPA',
  paPerGame: 'PA/G',
  outsPerGame: 'O/G',
};

export default class CardStatsSeason extends React.Component {
  constructor(props) {
    super(props);

    const search = new URLSearchParams(window.location.search);
    let abFilter = parseInt(search.get('ab'));
    if (isNaN(abFilter) || abFilter < 0) {
      abFilter = 4;
    }

    this.state = {
      sortField: 'atBats',
      sortDirection: 'DSC',
      filterStateChanged: false,
      filterState: getUrlFilterState(),
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

    this.handleStatsClick = function (sortField) {
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

    this.handlePlayerClick = function (playerId) {
      this.props.onPlayerClick(playerId);
    }.bind(this);

    this.setFilterState = (filterState) => {
      this.setState({ filterState });
    };
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
    const { team, inputState } = this.props;
    const plateAppearances =
      getGlobalState().getDecoratedPlateAppearancesForPlayerOnTeam(
        playerId,
        team,
        inputState
      );
    const player = getGlobalState().getPlayer(playerId, inputState);
    return getGlobalState().buildStatsObject(plateAppearances, player);
  }

  renderStatsHeader() {
    const elems = ['name'].concat(STATS_NAMES).map((statName) => {
      return (
        <Cell key={statName}>
          <div
            className={
              this.getCellClassName(statName) + ' table-cell-header-label'
            }
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
        style={{ cursor: 'default', display: 'flex' }}
      >
        {elems}
      </Row>
    );
  }

  renderNoTable(reason) {
    const reasons = {
      noTeam: 'No team selected.',
      noData: 'There is no data for this team.',
      noFilteredData: 'All data has been filtered out.',
    };
    return (
      <CardSection isCentered={true}>
        Cannot display season stats: {reasons[reason] ?? 'No data.'}
      </CardSection>
    );
  }

  render() {
    const { team, inputState } = this.props;

    // TODO: Generate this once when the component mounts.  It's very redundant to do it
    // on each render
    const s = inputState || getGlobalState().getLocalState();

    if (!team) {
      return this.renderNoTable('noTeam');
    }

    const searchFilterState = this.state.filterState;

    const playerStatsListBeforeFilter = s.players
      .filter((player) => {
        return team.games.reduce((result, game) => {
          return result || game.lineup.indexOf(player.id) > -1;
        }, false);
      })
      .map((player) => {
        return this.buildStatsObject(team.id, player.id);
      });

    if (playerStatsListBeforeFilter.length === 0) {
      return this.renderNoTable('noGames');
    }

    const playerStatsList = playerStatsListBeforeFilter
      .filter((statsObj) => {
        if (searchFilterState.filterChecked) {
          return statsObj.plateAppearances >= searchFilterState.abFilter;
        }
        return true;
      })
      .sort((a, b) => {
        return this.sortByState(a, b);
      });

    const tableElems = [this.renderStatsHeader()].concat(
      playerStatsList.map((playerStats) => {
        return this.renderPlayerRow(playerStats);
      })
    );

    return (
      <CardSection>
        {playerStatsList.length === 0 ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-start',
              }}
            >
              <FilterStatsModal setFilterState={this.setFilterState} />
            </div>
            {this.renderNoTable('noFilteredData')}
          </>
        ) : (
          <>
            <StickyTable>{tableElems}</StickyTable>
            <InnerSection className="stats-footer">
              <div>Tap a player name for season spray chart.</div>
            </InnerSection>
            <InnerSection className="stats-footer">
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div>Curious about a particular stat?</div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginLeft: '16px',
                    textDecoration: 'underline',
                    userSelect: 'none',
                    cursor: 'pointer',
                  }}
                  onClick={showStatsHelp}
                >
                  <span>Click Here</span>
                </div>
              </div>
            </InnerSection>
            <InnerSection className="stats-footer">
              <FilterStatsModal setFilterState={this.setFilterState} />
            </InnerSection>
          </>
        )}
      </CardSection>
    );
  }
}

CardStatsSeason.defaultProps = {
  team: null,
  state: null,
};
