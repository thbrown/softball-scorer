import React from 'react';
import { getGlobalState, type StatsObject } from 'state';
import CardSection from 'elements/card-section';
import InnerSection from 'elements/inner-section';
import { showStatsHelp } from 'utils/help-functions';
import { FilterStatsModal, getUrlFilterState } from 'components/filter-stats';
import type { Team, TopLevelClient } from 'shared-lib';
import { asPlayerId } from 'types/branded-ids';

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

const STAT_ALIASES: Record<string, string> = {
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

interface FilterState {
  filterChecked: boolean;
  abFilter: number;
}

interface CardStatsSeasonProps {
  team: Team | null;
  inputState?: TopLevelClient;
  onPlayerClick: (playerId: string) => void;
}

interface CardStatsSeasonState {
  sortField: string;
  sortDirection: string;
  filterStateChanged: boolean;
  filterState: FilterState;
}

export default class CardStatsSeason extends React.Component<
  CardStatsSeasonProps,
  CardStatsSeasonState
> {
  sortByState: (a: StatsObject, b: StatsObject) => number;
  handleStatsClick: (sortField: string) => void;
  handlePlayerClick: (playerId: string) => void;
  setFilterState: (filterState: FilterState) => void;

  constructor(props: CardStatsSeasonProps) {
    super(props);

    const search = new URLSearchParams(window.location.search);
    let abFilter = parseInt(search.get('ab') ?? '');
    if (isNaN(abFilter) || abFilter < 0) {
      abFilter = 4;
    }

    this.state = {
      sortField: 'atBats',
      sortDirection: 'DSC',
      filterStateChanged: false,
      filterState: getUrlFilterState(),
    };

    this.sortByState = (a: StatsObject, b: StatsObject): number => {
      const field = this.state.sortField;
      const aRow = a as unknown as Record<string, string | number>;
      const bRow = b as unknown as Record<string, string | number>;
      if (this.state.sortDirection === 'DSC') {
        if (isNaN(aRow[field] as number) || isNaN(bRow[field] as number)) {
          if (aRow[field] < bRow[field]) {
            return -1;
          } else if (aRow[field] > bRow[field]) {
            return 1;
          } else {
            return 0;
          }
        } else {
          return parseFloat(bRow[field] as string) - parseFloat(aRow[field] as string);
        }
      } else {
        if (isNaN(aRow[field] as number) || isNaN(bRow[field] as number)) {
          if (aRow[field] < bRow[field]) {
            return 1;
          } else if (aRow[field] > bRow[field]) {
            return -1;
          } else {
            return 0;
          }
        } else {
          return parseFloat(aRow[field] as string) - parseFloat(bRow[field] as string);
        }
      }
    };

    this.handleStatsClick = (sortField: string): void => {
      const newState = Object.assign({}, this.state) as CardStatsSeasonState;
      if (newState.sortField === sortField) {
        newState.sortDirection =
          newState.sortDirection === 'DSC' ? 'ASC' : 'DSC';
      } else {
        newState.sortDirection = 'DSC';
        newState.sortField = sortField;
      }
      this.setState(newState);
    };

    this.handlePlayerClick = (playerId: string): void => {
      this.props.onPlayerClick(playerId);
    };

    this.setFilterState = (filterState: FilterState): void => {
      this.setState({ filterState });
    };
  }


  getHeaderText = (statName: string): string => {
    if (statName === this.state.sortField) {
      const ret =
        STAT_ALIASES[statName] +
        (this.state.sortDirection === 'DSC' ? DSC_CHAR : ASC_CHAR);
      return ret;
    } else {
      return STAT_ALIASES[statName];
    }
  };

  getCellClassName = (statName: string): string => {
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
  };

  buildStatsObject = (teamId: string, playerId: string): Record<string, any> => {
    const { team, inputState } = this.props;
    const plateAppearances =
      getGlobalState().getDecoratedPlateAppearancesForPlayerOnTeam(
        asPlayerId(playerId),
        (team as Team),
        inputState
      );
    const player = getGlobalState().getPlayer(playerId);
    return getGlobalState().buildStatsObject(plateAppearances, player);
  };

  renderStatsHeader = (): JSX.Element => {
    const elems = ['name'].concat(STATS_NAMES).map((statName) => {
      return (
        <th key={statName} style={{ padding: 0 }}>
          <div
            className={
              this.getCellClassName(statName) + ' table-cell-header-label'
            }
            onClick={(): void => this.handleStatsClick(statName)}
          >
            <span style={{ userSelect: 'none' }}>
              {this.getHeaderText(statName)}
            </span>
          </div>
        </th>
      );
    });

    return (
      <tr
        key="header"
        style={{
          cursor: 'default',
          fontWeight: 'bold',
        }}
      >
        {elems}
      </tr>
    );
  };

  renderPlayerRow = (playerStats: any): JSX.Element => {
    const elems = ['name'].concat(STATS_NAMES).map((statName, i) => {
      return (
        <td key={statName} style={{ padding: 0 }}>
          <div
            className={this.getCellClassName(statName)}
            onClick={
              !i ? (): void => this.handlePlayerClick(playerStats.id) : undefined
            }
          >
            <span style={{ userSelect: 'none' }}>{playerStats[statName]}</span>
          </div>
        </td>
      );
    });

    return (
      <tr key={playerStats.name} style={{ cursor: 'default' }}>
        {elems}
      </tr>
    );
  };

  renderNoTable = (reason: string): JSX.Element => {
    const reasons: Record<string, string> = {
      noTeam: 'No team selected.',
      noData: 'There is no data for this team.',
      noFilteredData: 'All data has been filtered out.',
    };
    return (
      <CardSection isCentered={true}>
        Cannot display season stats: {reasons[reason] ?? 'No data.'}
      </CardSection>
    );
  };

  render(): JSX.Element {
    const { team, inputState } = this.props;

    // TODO: Generate this once when the component mounts.  It's very redundant to do it
    // on each render
    const s = inputState || getGlobalState().getLocalState();

    if (!team) {
      return this.renderNoTable('noTeam');
    }

    const searchFilterState = this.state.filterState;

    const playerStatsListBeforeFilter = s.players
      .filter((player: any) => {
        return team.games.reduce((result: boolean, game: any) => {
          return result || game.lineup.indexOf(player.id) > -1;
        }, false);
      })
      .map((player: any) => {
        return this.buildStatsObject(team.id, player.id);
      });

    if (playerStatsListBeforeFilter.length === 0) {
      return this.renderNoTable('noGames');
    }

    const playerStatsList = playerStatsListBeforeFilter
      .filter((statsObj: any) => {
        if (searchFilterState.filterChecked) {
          return statsObj.plateAppearances >= searchFilterState.abFilter;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        return this.sortByState(a, b);
      });

    const headerElem = this.renderStatsHeader();
    const bodyElems = playerStatsList.map((playerStats: any) => {
      return this.renderPlayerRow(playerStats);
    });

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
            <div className="stats-table-container">
              <table className="stats-table">
                <thead>{headerElem}</thead>
                <tbody>{bodyElems}</tbody>
              </table>
            </div>
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

