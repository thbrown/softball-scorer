import React from 'react';
import DOM from 'react-dom-factories';
import expose from './expose';
import state from 'state';
import dialog from 'dialog';
import network from 'network';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import FloatingInput from 'component-floating-input';
import FloatingPicklist from 'component-floating-picklist';
import { setRoute } from 'actions/route';

const ACCORDION_QUERYPARAM_PREFIX = 'acc';
const SYNC_DELAY_MS = 5000; // This value also exists in the CSS

export default class CardOptimization extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.state = {};

    // Optimization is mutable inside this component so we'll stor it in an instance
    // variable instead fo using the props. This gets updated in the render method.
    this.optimization = props.optimization;

    this.handleSongHelpClick = function(event) {
      event.stopPropagation();
      dialog.show_notification(
        // TODO - Read this from a file so the format isn't dependent on whitespace spaces.
        `**Walkup Song**

Clips can be played from the player's plate appearance page

![Plate appearance scoring screenshot](/server/assets/help-walkup.svg)`,
        undefined
      );
    };

    this.handleOverrideClick = function(playerId) {
      setRoute(`/optimizations/${this.optimization.id}/overrides/${playerId}`);
    }.bind(this);

    this.handleAddPlayerClick = function() {
      setRoute(
        `/optimizations/${this.optimization.id}/overrides/player-select`
      );
    }.bind(this);

    this.doAutoSync = async function() {
      this.startCssAnimation();
      this.activeTime = setTimeout(
        async function() {
          await state.sync();
          this.doAutoSync();
        }.bind(this),
        SYNC_DELAY_MS
      );
    }.bind(this);

    this.startCssAnimation = function() {
      let element = document.getElementById('pie-timer');
      element.classList.remove('hidden');

      // Removing an element from the dom then reinserting it restarts the animation
      element.classList.add('gone');
      element.offsetHeight = +element.offsetHeight; /* trigger reflow https://gist.github.com/paulirish/5d52fb081b3570c81e3a */
      element.classList.remove('gone');

      setTimeout(function() {
        element.classList.add('hidden');
      }, SYNC_DELAY_MS);
    };

    this.onRenderUpdateOrMount = function() {
      // Make sure we are working with the most up-to-date optimization
      this.optimization = state.getOptimization(this.props.optimization.id);
    };

    this.handleTeamCheckboxClick = function(team) {
      let parsedTeams = JSON.parse(this.optimization.teamList);
      let newSet = new Set(parsedTeams);
      if (parsedTeams.includes(team.id)) {
        newSet.delete(team.id);
        state.setOptimizationField(
          this.optimization.id,
          'teamList',
          Array.from(newSet),
          true
        );
      } else {
        newSet.add(team.id);
        state.setOptimizationField(
          this.optimization.id,
          'teamList',
          Array.from(newSet),
          true
        );
      }
    }.bind(this);

    this.onOptionsChange = function(fieldName, value) {
      if (fieldName === 'lineupType') {
        state.setOptimizationField(this.optimization.id, 'lineupType', value);
      } else {
        state.setOptimizationCustomDataField(
          this.optimization.id,
          fieldName,
          value
        );
      }
    }.bind(this);

    this.handleSendEmailCheckbox = function() {
      if (this.optimization.sendEmail) {
        state.setOptimizationField(this.optimization.id, 'sendEmail', false);
      } else {
        state.setOptimizationField(this.optimization.id, 'sendEmail', true);
      }
    }.bind(this);

    this.handleStartClick = async function() {
      // Disable button in the UI
      let buttonDiv = document.getElementById('start-optimization-button');
      buttonDiv.innerHTML = 'Starting...';
      buttonDiv.classList.add('disabled');

      // Extract data an list fields
      let playerIds = JSON.parse(this.optimization.playerList);
      let teamIds = JSON.parse(this.optimization.teamList);
      let gameIds = JSON.parse(this.optimization.gameList);
      let customData = JSON.parse(this.optimization.customData);
      let overrideData = JSON.parse(this.optimization.overrideData);

      // Filter out any delted teams or games
      let filteredTeamList = teamIds.filter(teamId => state.getTeam(teamId));
      state.setOptimizationField(
        this.optimization.id,
        'teamList',
        filteredTeamList,
        true
      );

      let filteredGameList = gameIds.filter(gameId => state.getTeam(gameId));
      state.setOptimizationField(
        this.optimization.id,
        'gameList',
        filteredGameList,
        true
      );

      // Filter out any overrides that don't belong to a player in the playerList
      let overridePlayerIds = Object.keys(overrideData);
      let filteredOverrides = {};
      for (let i = 0; i < overridePlayerIds.length; i++) {
        if (playerIds.includes(overridePlayerIds[i])) {
          filteredOverrides[overridePlayerIds[i]] =
            overrideData[overridePlayerIds[i]];
        }
      }
      state.setOptimizationField(
        this.optimization.id,
        'overrideData',
        filteredOverrides,
        true
      );

      // Reload values that may have change after filtering
      teamIds = JSON.parse(this.optimization.teamList);
      gameIds = JSON.parse(this.optimization.gameList);
      overrideData = JSON.parse(this.optimization.overrideData);

      // Gather player data (TODO: a lot of this is duplicated from render)
      let executionPlayers = [];

      for (let i = 0; i < playerIds.length; i++) {
        let executionPlayer = {};

        let player = state.getPlayer(playerIds[i]);
        if (!player) {
          continue; // Player may have been deleted
        }

        let plateAppearances = state.getPlateAppearancesForPlayerInGameOrOnTeam(
          player.id,
          teamIds,
          null // TODO: gameIds
        );

        executionPlayer.id = player.id;
        executionPlayer.gender = player.gender;

        // Check to see if there are manual overrides of the stats for this player
        let existingOverride = overrideData[player.id];
        if (existingOverride) {
          Object.assign(executionPlayer, existingOverride);
        } else {
          // Gather the stats required for the optimization
          let fullStats = state.buildStatsObject(player.id, plateAppearances);
          let compressedStats = this.getCompressedStats(fullStats);

          // There isn't an override for this player, create one so stats on the
          // optimization page stay consistent with the moment this optimization was run
          overrideData[player.id] = compressedStats;
          state.setOptimizationField(
            this.optimization.id,
            'overrideData',
            overrideData,
            true
          );

          Object.assign(executionPlayer, compressedStats);
        }

        executionPlayers.push(executionPlayer);
      }

      // Flaten all this data into a single execution data object
      let executionData = {
        players: executionPlayers,
        teams: filteredTeamList,
        games: filteredGameList,
        innings: customData.innings,
        iterations: customData.iterations,
        lineupType: this.optimization.lineupType,
      };

      // Be sure the server has out optimization details before it tried to run the optimization
      await state.sync();

      let body = JSON.stringify({
        executionData: executionData,
        optimizationId: this.optimization.id,
      });
      let response = await network.request(
        'POST',
        'server/start-optimization',
        body
      );
      if (response.status === 204 || response.status === 200) {
        dialog.show_notification('Sent start request.');
        // Do a sync, since the above call succeeded server has updated the optimization's status on it's end
        await state.sync();
        // Start auto refresh
        this.doAutoSync();
      } else if (response.status === 403) {
        dialog.show_notification(
          'You must be logged in to run a lineup simulation. Please [Login](/menu/login) or [Signup](/menu/signup).'
        );
        buttonDiv.classList.remove('disabled');
        buttonDiv.innerHTML = 'Start Simulation';
      } else {
        dialog.show_notification(
          'Something went wrong. ' +
            response.status +
            ' ' +
            JSON.stringify(response.body)
        );
        buttonDiv.classList.remove('disabled');
        buttonDiv.innerHTML = 'Start Simulation';
      }
    }.bind(this);

    this.handleResumeClick = async function() {
      // Disable button in the UI
      let buttonDiv = document.getElementById('start-optimization-button');
      buttonDiv.innerHTML = 'Starting...';
      buttonDiv.classList.add('disabled');

      let body = JSON.stringify({
        optimizationId: this.optimization.id,
      });
      let response = await network.request(
        'POST',
        'server/start-optimization',
        body
      );
      if (response.status === 204 || response.status === 200) {
        dialog.show_notification('Sent start request.');

        // Do a sync, since the above call succeeded server has updated the optimization's status on it's end
        state.sync();
      } else if (response.status === 403) {
        dialog.show_notification(
          'You must be logged in to run a lineup simulation. Please [Login](/menu/login) or [Signup](/menu/signup).'
        );
        buttonDiv.classList.remove('disabled');
        buttonDiv.innerHTML = 'Start Simulation';
      } else {
        dialog.show_notification('Something went wrong. ' + response.status);
        buttonDiv.classList.remove('disabled');
        buttonDiv.innerHTML = 'Start Simulation';
      }
    }.bind(this);

    this.getCompressedStats = function(fullStats) {
      let result = {};
      result.outs = fullStats.atBats - fullStats.hits;
      result.singles = fullStats.singles + fullStats.walks;
      result.doubles = fullStats.doubles;
      result.triples = fullStats.triples;
      result.homeruns = fullStats.insideTheParkHR + fullStats.outsideTheParkHR;
      return result;
    };
  }

  componentWillUnmount() {
    // TODO: call this on transition to complete or error. Not a super big deal it just results in an error printed in console.
    clearTimeout(this.activeTime);
  }

  componentDidUpdate() {
    this.onRenderUpdateOrMount();
  }

  componentDidMount() {
    this.onRenderUpdateOrMount();

    if (
      this.optimization.status === state.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS ||
      this.optimization.status ===
        state.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES
    ) {
      // Frequently perform syncs on this page to check for server updates to the optimization object
      this.doAutoSync();
    }

    this.skipClickDelay = function(e) {
      e.preventDefault();
      e.target.click();
    };

    this.setAriaAttr = function(el, ariaType, newProperty) {
      el.setAttribute(ariaType, newProperty);
    };
    this.setAccordionAria = function(el1, el2, expanded) {
      switch (expanded) {
        case 'true':
          this.setAriaAttr(el1, 'aria-expanded', 'true');
          this.setAriaAttr(el2, 'aria-hidden', 'false');
          break;
        case 'false':
          this.setAriaAttr(el1, 'aria-expanded', 'false');
          this.setAriaAttr(el2, 'aria-hidden', 'true');
          break;
        default:
          break;
      }
    };

    this.switchAccordion = function(index, e) {
      e.preventDefault();
      var accordionTitle = e.currentTarget.parentNode.nextElementSibling;
      var accordionContent = e.currentTarget;
      var accordionChevron = e.currentTarget.children[0];
      if (accordionTitle.classList.contains('is-collapsed')) {
        this.setAccordionAria(accordionContent, accordionTitle, 'true');
        state.editQueryObject(ACCORDION_QUERYPARAM_PREFIX + index, true);
      } else {
        this.setAccordionAria(accordionContent, accordionTitle, 'false');
        state.editQueryObject(ACCORDION_QUERYPARAM_PREFIX + index, null);
      }
      accordionContent.classList.toggle('is-collapsed');
      accordionContent.classList.toggle('is-expanded');
      accordionTitle.classList.toggle('is-collapsed');
      accordionTitle.classList.toggle('is-expanded');
      accordionChevron.classList.toggle('chevronExpanded');

      accordionTitle.classList.toggle('animateIn');
    };

    // Attach listeners to the accordion (and click if necessary)
    let queryObject = state.getQueryObj();
    let accordionToggles = document.querySelectorAll('.js-accordionTrigger');
    for (var i = 0, len = accordionToggles.length; i < len; i++) {
      if ('ontouchstart' in window) {
        accordionToggles[i].addEventListener(
          'touchstart',
          this.skipClickDelay,
          false
        );
      }
      if ('pointerdown' in window) {
        accordionToggles[i].addEventListener(
          'pointerdown',
          this.skipClickDelay,
          false
        );
      }
      accordionToggles[i].addEventListener(
        'click',
        this.switchAccordion.bind(this, i),
        false
      );

      // Open the accordions indicated by he query params
      if (queryObject[ACCORDION_QUERYPARAM_PREFIX + i] === 'true') {
        accordionToggles[i].click();
      }
    }
  }

  renderOptimizationPage() {
    let isInNotStartedState =
      this.optimization.status === state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED;

    // Build players table
    const playerTable = [];
    playerTable.push(
      <tr key="header" className="title">
        <th height="35">Name</th>
        <th width="40">Outs</th>
        <th width="35">1B</th>
        <th width="35">2B</th>
        <th width="35">3B</th>
        <th width="35">HR</th>
        {isInNotStartedState ? (
          <th width="48" />
        ) : (
          false // Don't show the last column for already started optimizations
        )}
      </tr>
    );

    let displayPlayers = [];
    let playerIds = JSON.parse(this.optimization.playerList);
    for (let i = 0; i < playerIds.length; i++) {
      let displayPlayer = {};

      // Check to see if there are manual overrides of the stats for this player
      let overrides = JSON.parse(this.optimization.overrideData);
      let existingOverride = overrides[playerIds[i]];

      let player = state.getPlayer(playerIds[i]);
      if (existingOverride) {
        Object.assign(displayPlayer, existingOverride);
        displayPlayer.isOverride = true;
      } else {
        if (!player) {
          // Player doesn't exist (may have been deleted) and there are no
          // overrides, just skip em!
          continue;
        }

        let plateAppearances = state.getPlateAppearancesForPlayerInGameOrOnTeam(
          player.id,
          JSON.parse(this.optimization.teamList),
          null
        );

        let fullStats = state.buildStatsObject(player.id, plateAppearances);
        let compressedStats = this.getCompressedStats(fullStats);
        Object.assign(displayPlayer, compressedStats);
        displayPlayer.isOverride = false;
      }
      displayPlayer.name = player ? player.name : '<Player was deleted>';
      displayPlayer.playerId = playerIds[i];
      displayPlayers.push(displayPlayer);
    }

    for (let i = 0; i < displayPlayers.length; i++) {
      playerTable.push(
        <tr
          key={'row' + i}
          className={displayPlayers[i].isOverride ? 'overriden' : undefined}
        >
          <td height="48" className="name">
            {displayPlayers[i].name}
          </td>
          <td>{displayPlayers[i].outs}</td>
          <td>{displayPlayers[i].singles}</td>
          <td>{displayPlayers[i].doubles}</td>
          <td>{displayPlayers[i].triples}</td>
          <td>{displayPlayers[i].homeruns}</td>
          {isInNotStartedState ? (
            <td height="48">
              <img
                src="/server/assets/tune-black.svg"
                alt=">"
                className="tableButton"
                onClick={this.handleOverrideClick.bind(
                  this,
                  displayPlayers[i].playerId
                )}
              />
            </td>
          ) : (
            false // Don't show override column for optimizations that have already started
          )}
        </tr>
      );
    }

    // Build teams checkboxes
    let allTeams = state.getLocalState().teams;
    let teamsCheckboxes = [];

    let selectedTeams = JSON.parse(this.optimization.teamList);
    let selectedTeamsSet = new Set(selectedTeams);
    if (isInNotStartedState) {
      // What if there are not games/teams selected?
      if (allTeams.length === 0) {
        teamsCheckboxes.push(
          <i key="no-games">You haven't added any teams yet!</i>
        );
      }

      for (let i = 0; i < allTeams.length; i++) {
        let team = allTeams[i];
        teamsCheckboxes.push(
          <label key={team.name + 'checkboxLabel'}>
            <input
              key={team.name + 'checkbox'}
              type="checkbox"
              onChange={this.handleTeamCheckboxClick.bind(this, team)}
              checked={selectedTeamsSet.has(team.id)}
            />
            {team.name}
          </label>
        );
      }
    } else {
      // What if there are not games/teams selected?
      if (selectedTeams.length === 0) {
        teamsCheckboxes.push(
          <i key="no-games">No teams or games were selected</i>
        );
      }
      for (let i = 0; i < selectedTeams.length; i++) {
        let team = state.getTeam(selectedTeams[i]);
        let teamName;
        if (!team) {
          teamName = '<Team was deleted>';
        } else {
          teamName = team.name;
        }
        teamsCheckboxes.push(
          <label key={selectedTeams[i] + 'checkboxLabel'}>
            <input
              key={selectedTeams[i] + 'checkbox'}
              type="checkbox"
              checked={true}
              disabled="true"
            />
            {teamName}
          </label>
        );
      }
    }

    // Spinner (if necessary)
    let spinner = false;
    if (
      this.optimization.status === state.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS ||
      this.optimization.status ===
        state.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES
    ) {
      spinner = (
        <div>
          <div id="pie-timer" className="pie-timer hidden">
            <div className="pie-mask" />
          </div>
        </div>
      );
    }

    // Simulation Options
    let parsedCustomData = JSON.parse(this.optimization.customData);

    return (
      <div className="accordionContainer">
        <div className="text-div">
          Status:{' '}
          {state.OPTIMIZATION_STATUS_ENUM_INVERSE[this.optimization.status]}
          <br />
          {this.optimization.statusMessage}
          {spinner}
        </div>
        <div className="accordion">
          <dl>
            <dt>
              <div
                aria-expanded="false"
                aria-controls="accordion1"
                className="accordion-title accordionTitle js-accordionTrigger"
              >
                <img
                  src="/server/assets/chevron-right.svg"
                  alt=">"
                  className="chevron"
                />
                Players
              </div>
            </dt>
            <dd
              className="accordion-content accordionItem is-collapsed"
              id="accordion1"
              aria-hidden="true"
            >
              <table className="playerTable">
                <tbody>{playerTable}</tbody>
              </table>
              {this.optimization.status ===
              state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED ? (
                <div
                  className="edit-button button cancel-button"
                  onClick={this.handleAddPlayerClick}
                >
                  + Add/Remove Players
                </div>
              ) : (
                false // Don't show add/remove button for optimizations that have already started
              )}
            </dd>
            <dt>
              <div
                aria-expanded="false"
                aria-controls="accordion2"
                className="accordion-title accordionTitle js-accordionTrigger"
              >
                <img
                  src="/server/assets/chevron-right.svg"
                  alt=">"
                  className="chevron"
                />
                Games
              </div>
            </dt>
            <dd
              className="accordion-content accordionItem is-collapsed"
              id="accordion2"
              aria-hidden="true"
            >
              <div id="gamesMenu">{teamsCheckboxes}</div>
            </dd>
            <dt>
              <div
                aria-controls="accordion3"
                className="accordion-title accordionTitle js-accordionTrigger"
              >
                <img
                  src="/server/assets/chevron-right.svg"
                  alt=">"
                  className="chevron"
                />
                Simulation Options
              </div>
            </dt>
            <dd
              className="accordion-content accordionItem is-collapsed"
              id="accordion3"
              aria-hidden="true"
            >
              <div id="simulationOptionsMenu">
                {React.createElement(FloatingInput, {
                  key: 'iterations',
                  id: 'iterations',
                  maxLength: '12',
                  label: 'Iterations',
                  onChange: this.onOptionsChange.bind(this, 'iterations'),
                  type: 'number',
                  defaultValue: parsedCustomData.iterations,
                  disabled:
                    this.optimization.status !==
                    state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED,
                })}
                {React.createElement(FloatingInput, {
                  key: 'innings',
                  id: 'innings',
                  maxLength: '12',
                  label: 'Innings to Simulate',
                  onChange: this.onOptionsChange.bind(this, 'innings'),
                  maxLength: '2',
                  type: 'number',
                  defaultValue: parsedCustomData.innings,
                  disabled:
                    this.optimization.status !==
                    state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED,
                })}
                {React.createElement(FloatingPicklist, {
                  id: 'lineupType',
                  label: 'Lineup Type',
                  defaultValue: this.optimization.lineupType,
                  onChange: this.onOptionsChange.bind(this, 'lineupType'),
                  disabled:
                    this.optimization.status !==
                    state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED,
                })}
              </div>
            </dd>
            {this.renderResultsAccordion()}
          </dl>
        </div>
        {this.renderFooter()}
      </div>
    );
  }

  renderResultsAccordion() {
    // Results
    console.log(this.optimization.resultData);
    let resultData = JSON.parse(this.optimization.resultData);

    let groupA;
    let groupB;
    let bestScore;
    let bestPlayers = [];
    let progress;
    if (resultData && resultData.lineup) {
      bestScore = resultData.score;
      let completed = resultData.complete;
      let total = resultData.total;
      if (total === 0) {
        progress = <div>0%</div>;
      } else if (completed === total) {
        progress = <div>100% Complete</div>;
      } else {
        progress = <div>{((completed / total) * 100).toFixed(1)}%</div>;
      }
      if (
        this.optimization.lineupType === state.LINEUP_TYPE_ENUM.NORMAL ||
        this.optimization.lineupType ===
          state.LINEUP_TYPE_ENUM.NO_CONSECUTIVE_FEMALES
      ) {
        groupA = resultData.lineup.GroupA;

        for (let i = 0; i < groupA.length; i++) {
          let displayPlayer = {};
          let player = state.getPlayer(groupA[i]);
          if (!player) {
            displayPlayer.name = '<Player was deleted>';
          } else {
            displayPlayer.name = player.name;
          }
          bestPlayers.push(
            <div key={i}>
              {displayPlayer.name}
              <br />
            </div>
          );
        }
      } else if (
        this.optimization.lineupType ===
        state.LINEUP_TYPE_ENUM.ALTERNATING_GENDER
      ) {
        groupA = resultData.lineup.GroupA;
        groupB = resultData.lineup.GroupB;

        bestPlayers.push(
          <div key="first-group">
            <i>First Group:</i>
          </div>
        );

        for (let i = 0; i < groupA.length; i++) {
          let displayPlayer = {};
          let player = state.getPlayer(groupA[i]);
          if (!player) {
            displayPlayer.name = '<Player was deleted>';
          } else {
            displayPlayer.name = player.name;
          }
          bestPlayers.push(
            <div key={'a' + i}>
              {displayPlayer.name}
              <br />
            </div>
          );
        }

        bestPlayers.push(
          <div key="second-group">
            <i>Second Group:</i>
          </div>
        );

        for (let i = 0; i < groupB.length; i++) {
          let displayPlayer = {};
          let player = state.getPlayer(groupB[i]);
          if (!player) {
            displayPlayer.name = '<Player was deleted>';
          } else {
            displayPlayer.name = player.name;
          }
          bestPlayers.push(
            <div key={'b' + i}>
              {displayPlayer.name}
              <br />
            </div>
          );
        }
      } else {
        bestPlayers.push(
          <div key="bad-lineup-type">
            Unrecognized LineupType
            <br />
          </div>
        );
      }
    } else {
      bestScore = '-';
      bestPlayers = '-';
      progress = '-';
    }

    let resultsStyle = {};
    if (
      this.optimization.status === state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
    ) {
      resultsStyle = { display: 'none' };
    }
    return (
      <div style={resultsStyle}>
        <dt>
          <div
            aria-expanded="false"
            aria-controls="accordion4"
            className="accordion-title accordionTitle js-accordionTrigger"
          >
            <img
              src="/server/assets/chevron-right.svg"
              alt=">"
              className="chevron"
            />
            Results
            {/*
            <div className="help-container">
              <img
                src="/server/assets/help.svg"
                alt="?"
                onClick={this.handleSongHelpClick}
              />
            </div>
            */}
          </div>
        </dt>
        <dd
          className="accordion-content accordionItem is-collapsed"
          id="accordion3"
          aria-hidden="true"
        >
          <div>
            <b>Best Score:</b>
            <br />
            {bestScore}
            <br />
            <br />
            <b>Best Lineup:</b>
            <br />
            {bestPlayers}
            <br />
            <b>Progress:</b>
            <br />
            {progress}
          </div>
        </dd>
      </div>
    );
  }

  renderFooter() {
    if (
      this.optimization.status === state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
    ) {
      return (
        <div id="footer">
          <label>
            <input
              type="checkbox"
              onChange={this.handleSendEmailCheckbox}
              checked={this.optimization.sendEmail}
            />
            Send me an email when the simulation is complete.
          </label>
          <div
            id="start-optimization-button"
            className="edit-button button cancel-button"
            onClick={this.handleStartClick.bind(this)}
          >
            Start Simulation
          </div>
        </div>
      );
    }
    if (this.optimization.status === state.OPTIMIZATION_STATUS_ENUM.ERROR) {
      return (
        <div id="footer">
          <label>
            <input
              type="checkbox"
              onChange={this.handleSendEmailCheckbox}
              checked={this.optimization.sendEmail}
            />
            Send me an email when the simulation is complete.
          </label>
          <div
            id="start-optimization-button"
            className="edit-button button cancel-button"
            onClick={this.handleResumeClick.bind(this)}
          >
            Resume Simulation
          </div>
        </div>
      );
    } else {
      return (
        <div id="footer">
          <label>
            <input
              type="checkbox"
              checked={this.optimization.sendEmail}
              disabled={true}
            />
            Send me an email when the simulation is complete.
          </label>
        </div>
      );
    }
  }

  render() {
    return DOM.div(
      {
        className: 'card',
        style: {},
      },
      DOM.div(
        {
          className: 'card-title',
        },
        React.createElement(LeftHeaderButton),
        DOM.div(
          {
            className: 'card-title-text-with-arrow prevent-overflow',
          },
          this.optimization.name
        ),
        React.createElement(RightHeaderButton)
      ),
      DOM.div(
        {
          className: 'card-body',
        },
        this.renderOptimizationPage()
      )
    );
  }
}
