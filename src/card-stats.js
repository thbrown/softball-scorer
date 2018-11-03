"use strict";

const expose = require("./expose");

const results = require("plate-appearance-results.js");
const state = require("state");

const { StickyTable, Row, Cell } = require("react-sticky-table");

const DSC_CHAR = "▼"; //'\25bc';
const ASC_CHAR = "▲"; //'\25be';

const STATS_NAMES = [
  "battingAverage",
  "sluggingPercentage",
  "atBats",
  "doubles",
  "triples",
  "insideTheParkHR",
  "outsideTheParkHR",
  "walks",
  "reachedOnError"
];

const STAT_ALIASES = {
  name: "Name",
  battingAverage: "BA",
  sluggingPercentage: "SLG",
  atBats: "AB",
  doubles: "2B",
  triples: "3B",
  insideTheParkHR: "HRI",
  outsideTheParkHR: "HRO",
  walks: "BB",
  reachedOnError: "ROE"
};

module.exports = class CardStats extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.state = {
      sortField: "atBats",
      sortDirection: "DSC"
    };

    this.sortByState = (a, b) => {
      if (this.state.sortDirection === "DSC") {
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
          newState.sortDirection === "DSC" ? "ASC" : "DSC";
      } else {
        newState.sortDirection = "DSC";
        newState.sortField = sortField;
      }
      this.setState(newState);
    }.bind(this);

    this.handlePlayerClick = function(playerId) {
      expose.set_state("main", {
        page: `/teams/${this.props.team.id}/stats/player/${playerId}`
      });
    };
  }

  getHeaderText(statName) {
    if (statName === this.state.sortField) {
      const ret =
        STAT_ALIASES[statName] +
        (this.state.sortDirection === "DSC" ? DSC_CHAR : ASC_CHAR);
      return ret;
    } else {
      return STAT_ALIASES[statName];
    }
  }

  getCellClassName(statName) {
    let className = "table-cell";
    if (statName === "name") {
      className = className + " name-stat-cell";
    } else {
      className =
        className +
        ` ${
          STATS_NAMES.slice(0, 2).includes(statName) ? "percentage" : "number"
        }-stat-cell`;
    }
    return className;
  }

  renderStatsHeader() {
    const elems = ["name"].concat(STATS_NAMES).map(statName => {
      return (
        <Cell key={statName}>
          <div
            className={this.getCellClassName(statName)}
            onClick={this.handleStatsClick.bind(this, statName)}
          >
            <span style={{ userSelect: "none" }}>
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
          cursor: "default",
          color: "white",
          display: "flex",
          fontWeight: "bold"
        }}
      >
        {elems}
      </Row>
    );
  }

  renderPlayerRow(playerStats) {
    const elems = ["name"].concat(STATS_NAMES).map((statName, i) => {
      return (
        <Cell key={statName}>
          <div
            className={this.getCellClassName(statName)}
            onClick={
              !i ? this.handlePlayerClick.bind(this, playerStats.id) : null
            }
          >
            <span style={{ userSelect: "none" }}>{playerStats[statName]}</span>
          </div>
        </Cell>
      );
    });

    return (
      <Row
        key={playerStats.name}
        style={{ cursor: "default", color: "white", display: "flex" }}
      >
        {elems}
      </Row>
    );
  }

  render() {
    const s = state.getLocalState();
    const playerStatsList = s.players
      .filter(player => {
        return this.props.team.games.reduce((result, game) => {
          return result || game.lineup.indexOf(player.id) > -1;
        }, false);
      })
      .map(player => {
        return this.buildStatsObject(this.props.team.id, player.id);
      })
      .sort((a, b) => {
        return this.sortByState(a, b);
      });

    if (playerStatsList.length === 0) {
      return <div />;
    }

    const tableElems = [this.renderStatsHeader()].concat(
      playerStatsList.map(playerStats => {
        return this.renderPlayerRow(playerStats);
      })
    );

    const height = window.innerHeight - 80 + "px";
    return (
      <div
        className="card"
        style={{ width: "100%", height: height, marginTop: "20px" }}
      >
        <StickyTable>{tableElems}</StickyTable>
      </div>
    );
  }

  buildStatsObject(teamId, playerId) {
    const player = state.getPlayer(playerId);

    const stats = {};
    stats.id = player.id;
    stats.name = player.name;
    stats.plateAppearances = 0;
    stats.totalBasesByHit = 0;
    stats.atBats = 0;
    stats.hits = 0;
    stats.doubles = 0;
    stats.triples = 0;
    stats.insideTheParkHR = 0;
    stats.outsideTheParkHR = 0;
    stats.reachedOnError = 0;
    stats.walks = 0;
    stats.fieldersChoice = 0;

    const plateAppearances = state.getPlateAppearancesForPlayerOnTeam(
      playerId,
      teamId
    );

    plateAppearances.forEach(pa => {
      if (pa.result) {
        stats.plateAppearances++;

        if (pa.result && !results.getNoAtBatResults().includes(pa.result)) {
          stats.atBats++;
        }
        if (results.getHitResults().includes(pa.result)) {
          stats.hits++;
        }

        if (pa.result === "BB") {
          stats.walks++; // Boo!
        } else if (pa.result === "E") {
          stats.reachedOnError++;
        } else if (pa.result === "FC") {
          stats.fieldersChoice++;
        } else if (
          pa.result === "Out" ||
          pa.result === "SAC" ||
          pa.result === "K"
        ) {
          // Intentionally blank
        } else if (pa.result === "1B") {
          stats.totalBasesByHit++;
        } else if (pa.result === "2B") {
          stats.doubles++;
          stats.totalBasesByHit += 2;
        } else if (pa.result === "3B") {
          stats.triples++;
          stats.totalBasesByHit += 3;
        } else if (pa.result === "HRi") {
          stats.insideTheParkHR++;
          stats.totalBasesByHit += 4;
        } else if (pa.result === "HRo") {
          stats.outsideTheParkHR++;
          stats.totalBasesByHit += 4;
        } else {
          console.log(
            "WARNING: unrecognized batting result encountered and ignored for stats calculations",
            pa.result
          );
        }
      }
    });

    if (stats.atBats === 0) {
      stats.battingAverage = "-";
      stats.sluggingPercentage = "-";
    } else {
      if (stats.hits === stats.atBats) {
        stats.battingAverage = "1.000";
      } else {
        stats.battingAverage = (stats.hits / stats.atBats).toFixed(3).substr(1);
      }
      stats.sluggingPercentage = (stats.totalBasesByHit / stats.atBats).toFixed(
        3
      );
    }

    return stats;
  }
};
