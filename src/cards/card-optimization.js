import React from 'react';
import Card from 'elements/card';
import state from 'state';
import dialog from 'dialog';
import { setRoute } from 'actions/route';
import SharedLib from '/../shared-lib';
import NoSelect from 'elements/no-select';
import StandardOptions from 'elements/optimizer-standard-options';
import CustomOptions from 'elements/optimizer-custom-options';
import network from 'network';

const ACCORDION_QUERY_PARAM_PREFIX = 'acc';
const SYNC_DELAY_MS = 10000; // This value also exists in the CSS

export default class CardOptimization extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      optimizerData: undefined,
    };

    this.previousOptimizationState = undefined;

    this.pieTimer = React.createRef();

    this.handleOverrideClick = function (playerId) {
      setRoute(`/optimizations/${props.optimization.id}/overrides/${playerId}`);
    }.bind(this);

    this.handleAddPlayerClick = function () {
      setRoute(`/optimizations/${props.optimization.id}/player-select`);
    }.bind(this);

    this.enableAutoSync = async function () {
      this.startCssAnimation();
      clearTimeout(this.activeTime);
      this.activeTime = setTimeout(
        async function () {
          await state.sync();
          this.enableAutoSync();
        }.bind(this),
        SYNC_DELAY_MS
      );
    }.bind(this);

    this.disableAutoSync = async function () {
      clearTimeout(this.activeTime);
    };

    this.startCssAnimation = () => {
      let element = this.pieTimer.current;

      if (element) {
        element.classList.remove('hidden');

        // Removing an element from the DOM then reinserting it restarts the animation
        element.classList.add('gone');
        element.getClientRects(); /* trigger reflow https://gist.github.com/paulirish/5d52fb081b3570c81e3a */
        element.classList.remove('gone');

        setTimeout(function () {
          element.classList.add('hidden');
        }, SYNC_DELAY_MS);
      }
    };

    this.onRenderUpdateOrMount = function () {
      // Update Result and Player accordion heights, these is dynamic (thus gets overridden by an !important CSS property on accordion collapse)
      document.getElementById('accordion4').style.maxHeight =
        document.getElementById('result-accordion-content').offsetHeight + 'px';
      document.getElementById('accordion1').style.maxHeight =
        document.getElementById('player-accordion-content').offsetHeight + 'px';

      // Frequently perform syncs on this page to check for server updates to the optimization object
      let optimization = this.props.optimization;

      // Only enable/disable auto sync if there is a change of status OR this is the first update
      if (
        this.previousOptimizationState != undefined &&
        this.previousOptimizationState == optimization.status
      ) {
        return;
      }
      this.previousOptimizationState = optimization.status;

      if (
        optimization.status ===
          SharedLib.constants.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS ||
        optimization.status ===
          SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES ||
        optimization.status ===
          SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSING
      ) {
        this.enableAutoSync();
      } else {
        this.disableAutoSync();
      }
    };

    this.handleTeamCheckboxClick = function (team) {
      let parsedTeams = JSON.parse(this.props.optimization.teamList);
      let newSet = new Set(parsedTeams);
      if (parsedTeams.includes(team.id)) {
        newSet.delete(team.id);
        state.setOptimizationField(
          this.props.optimization.id,
          'teamList',
          Array.from(newSet),
          true
        );
      } else {
        newSet.add(team.id);
        state.setOptimizationField(
          this.props.optimization.id,
          'teamList',
          Array.from(newSet),
          true
        );
      }
    }.bind(this);

    this.handleSendEmailCheckbox = function () {
      if (this.props.optimization.sendEmail) {
        state.setOptimizationField(
          this.props.optimization.id,
          'sendEmail',
          false
        );
      } else {
        state.setOptimizationField(
          this.props.optimization.id,
          'sendEmail',
          true
        );
      }
    }.bind(this);

    this.toggleOptimizationButtonRef = React.createRef();
    this.handlePauseClick = async function () {
      // Disable button in the UI
      const buttonDiv = this.toggleOptimizationButtonRef.current;
      buttonDiv.innerHTML = 'Pausing...';
      buttonDiv.classList.add('disabled');

      const body = JSON.stringify({
        optimizationId: this.props.optimization.id,
      });
      const response = await state.request(
        'POST',
        'server/pause-optimization',
        body
      );
      if (response.status === 204 || response.status === 200) {
        dialog.show_notification('Sent pause request.');
        // Do a sync, since the above call succeeded server has updated the optimization's status on it's end
        await state.sync();
        buttonDiv.classList.remove('disabled');
        return;
      } else if (response.status === 403) {
        dialog.show_notification(
          <div>
            You must be logged in to pause a lineup simulation. Please{' '}
            <a href="/menu/login">Login </a> or{' '}
            <a href="/menu/signup">Signup</a>.
          </div>
        );
      } else if (response.status === -1) {
        dialog.show_notification(
          'The network is offline. Try again when you have an internet connection.'
        );
      } else {
        dialog.show_notification(
          'Something went wrong. ' +
            response.status +
            ' ' +
            JSON.stringify(response.body)
        );
      }
      // Re-enable the button
      buttonDiv.classList.remove('disabled');
      buttonDiv.innerHTML = 'Pause Simulation';
    };

    this.handleStartClick = async function () {
      // Don't do anything if optimizerData isn't loaded
      if (!this.state.optimizerData) {
        return;
      }

      // Disable button in the UI
      const buttonDiv = this.toggleOptimizationButtonRef.current;
      buttonDiv.innerHTML = 'Starting...';
      buttonDiv.classList.add('disabled');

      // Set custom options - Read and prep default optimizer options
      let optimizer = this.props.optimization.optimizerType;
      let optimizerOptions = this.state.optimizerData[optimizer].options;
      let defaultOptions = {};
      for (let option of optimizerOptions) {
        if (option.uiVisibility !== 'HIDDEN') {
          defaultOptions[option.longLabel] = option.defaultValue;
        }
      }

      // Set custom options - Delete any options that are undefined, and merge default and supplied options
      let parsedCustomOptionsData = JSON.parse(
        this.props.optimization.customOptionsData
      );
      for (let key in defaultOptions) {
        if (parsedCustomOptionsData[key] !== undefined) {
          defaultOptions[key] = parsedCustomOptionsData[key];
        }
      }

      //console.log('Final options ', defaultOptions);
      state.setOptimizationField(
        this.props.optimization.id,
        'customOptionsData',
        defaultOptions,
        true
      );

      // Set inputSummaryData, this is used to keep a snapshot of the player's stats at the moment the optimization was started
      const playerIds = JSON.parse(this.props.optimization.playerList);
      const teamIds = JSON.parse(this.props.optimization.teamList);
      const overrideData = JSON.parse(this.props.optimization.overrideData);

      const stats = state.getActiveStatsForAllPlayers(
        overrideData,
        playerIds,
        teamIds
      );

      state.setOptimizationField(
        this.props.optimization.id,
        'inputSummaryData',
        stats,
        true
      );

      // To Server
      /*


    custom_options_data jsonb,
  ->input_summary_data jsonb,
    status smallint,
    result_data jsonb,
    status_message text COLLATE pg_catalog."default",
    team_list jsonb,
    game_list jsonb,
    player_list jsonb,
    lineup_type integer,
    optimizer_type integer,
    override_data jsonb,

        {
          playerIds: [],
          teamIds: [],
          gameIds: [],
          overrideData: { S: [], S: [] }
          lineupType: #
          optimizer: #
          customOptionsData: {}
        }
      */

      /*


      // Filter out any deleted teams or games (since these can get out of sync)
      // TODO: Shouldn't this move to the server side?
      const filteredTeamList = teamIds.filter((teamId) =>
        state.getTeam(teamId)
      );
      state.setOptimizationField(
        this.props.optimization.id,
        'teamList',
        filteredTeamList,
        true
      );

      const filteredGameList = gameIds.filter((gameId) =>
        state.getTeam(gameId)
      );
      state.setOptimizationField(
        this.props.optimization.id,
        'gameList',
        filteredGameList,
        true
      );

      // Filter out any overrides that don't belong to a player in the playerList
      const overridePlayerIds = Object.keys(overrideData);
      const filteredOverrides = {};
      for (let i = 0; i < overridePlayerIds.length; i++) {
        if (playerIds.includes(overridePlayerIds[i])) {
          filteredOverrides[overridePlayerIds[i]] =
            overrideData[overridePlayerIds[i]];
        }
      }
      state.setOptimizationField(
        this.props.optimization.id,
        'overrideData',
        filteredOverrides,
        true
      );

      */

      // Be sure the server has our optimization details before it tries to run the optimization
      await state.sync();

      let body = JSON.stringify({
        optimizationId: this.props.optimization.id,
      });
      let response = await state.request(
        'POST',
        'server/start-optimization',
        body
      );
      if (response.status === 204 || response.status === 200) {
        dialog.show_notification('Sent start request.');

        // Do a sync, since the call succeeded, the server has updated the optimization's status on it's end
        await state.sync();
        buttonDiv.classList.remove('disabled');
        return;
      } else if (response.status === 403) {
        dialog.show_notification(
          <div>
            You must be logged in to run a lineup simulation. Please{' '}
            <a href="/menu/login">Login </a> or{' '}
            <a href="/menu/signup">Signup</a>.
          </div>
        );
      } else if (response.status === -1) {
        dialog.show_notification(
          'The network is offline. Try again when you have an internet connection.'
        );
      } else {
        // Make sure email validation works
        // Make sure links show up in optimization dialogs
        if (
          response.body.error &&
          response.body.error === 'EMAIL_NOT_VERIFIED'
        ) {
          dialog.show_notification(
            <div>
              The 'send me an email...' checkbox was checked but the email
              address associated with this account has not been verified. Please
              verify your email at <a href="/account">softball.app/account</a>)
              or uncheck the box.
            </div>
          );
        } else {
          dialog.show_notification(
            'Something went wrong. ' +
              response.status +
              ' ' +
              JSON.stringify(response.body)
          );
        }
      }
      buttonDiv.classList.remove('disabled');
      buttonDiv.innerHTML = 'Start Simulation';
    }.bind(this);
  }

  componentWillUnmount() {
    this.disableAutoSync();
  }

  componentDidUpdate() {
    this.onRenderUpdateOrMount();
  }

  componentDidMount() {
    this.onRenderUpdateOrMount();

    this.skipClickDelay = function (e) {
      e.preventDefault();
      e.target.click();
    };

    this.setAriaAttr = function (el, ariaType, newProperty) {
      el.setAttribute(ariaType, newProperty);
    };
    this.setAccordionAria = function (el1, el2, expanded) {
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

    this.switchAccordion = function (index, e) {
      e.preventDefault();
      const accordionTitle =
        e.currentTarget.parentNode.parentNode.nextElementSibling;
      const accordionContent = e.currentTarget;
      const accordionChevron = e.currentTarget.children[0];
      if (accordionTitle.classList.contains('is-collapsed')) {
        this.setAccordionAria(accordionContent, accordionTitle, 'true');
        state.editQueryObject(ACCORDION_QUERY_PARAM_PREFIX + index, true);
      } else {
        this.setAccordionAria(accordionContent, accordionTitle, 'false');
        state.editQueryObject(ACCORDION_QUERY_PARAM_PREFIX + index, null);
      }
      accordionContent.classList.toggle('is-collapsed');
      accordionContent.classList.toggle('is-expanded');
      accordionTitle.classList.toggle('is-collapsed');
      accordionTitle.classList.toggle('is-expanded');
      accordionChevron.classList.toggle('chevronExpanded');

      accordionTitle.classList.toggle('animateIn');
    };

    // Attach listeners to the accordion (and click if necessary)
    // TODO eww, this is gross and incompatible with tests
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

      // Open the accordions indicated by the query params
      if (queryObject[ACCORDION_QUERY_PARAM_PREFIX + i] === 'true') {
        accordionToggles[i].click();
      }
    }

    // Get optimizer info, tested to 300 calls, seems to work okay
    let prom = [];
    let optimizerIds = SharedLib.commonUtils.merge(
      state.getAccountOptimizersList(),
      state.getUsedOptimizers()
    );
    for (let i = 0; i < optimizerIds.length; i++) {
      prom.push(
        network.request('GET', 'server/optimizer-definition/' + optimizerIds[i])
      );
    }

    Promise.all(prom).then((values) => {
      values = values.map((v) => v.body);
      // Convert optimizer data array to an object
      let optData = {};
      for (let i = 0; i < values.length; i++) {
        let opt = values[i];
        optData[opt.id] = opt;
      }

      this.setState({
        optimizerData: optData,
      });
    });
  }

  renderOptimizationPage(optimization) {
    let isInNotStartedState =
      optimization.status ===
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.NOT_STARTED;

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

    const displayPlayers = [];
    const playerIds = JSON.parse(optimization.playerList);
    const teamIds = JSON.parse(optimization.teamList);
    const overrideData = JSON.parse(optimization.overrideData);

    const stats = state.getActiveStatsForAllPlayers(
      overrideData,
      playerIds,
      teamIds
    );
    for (let i = 0; i < playerIds.length; i++) {
      const displayPlayer = {};
      Object.assign(displayPlayer, stats[playerIds[i]]);

      const existingOverride = overrideData[playerIds[i]];
      if (existingOverride) {
        displayPlayer.isOverride = true;
      } else {
        displayPlayer.isOverride = false;
      }

      const player = state.getPlayer(playerIds[i]);
      if (player) {
        displayPlayer.name = player.name;
      } else {
        displayPlayer.name = '<Player was deleted>';
      }
      displayPlayer.playerId = playerIds[i];
      displayPlayers.push(displayPlayer);
    }

    for (let i = 0; i < displayPlayers.length; i++) {
      playerTable.push(
        <tr
          key={'row' + i}
          className={displayPlayers[i].isOverride ? 'overridden' : undefined}
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
    const allTeams = state.getLocalState().teams;
    const teamsCheckboxes = [];
    const selectedTeams = JSON.parse(optimization.teamList);
    const selectedTeamsSet = new Set(selectedTeams);
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
          <label key={team.name + 'checkboxLabel' + i}>
            <input
              key={team.name + 'checkbox'}
              type="checkbox"
              onChange={this.handleTeamCheckboxClick.bind(this, team)}
              checked={selectedTeamsSet.has(team.id)}
              style={{ marginRight: '5px' }}
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
        const team = state.getTeam(selectedTeams[i]);
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
              disabled={true}
              style={{ marginRight: '5px' }}
            />
            {teamName}
          </label>
        );
      }
    }

    // TODO: can we avoid parsing this each time we need it?
    let resultData = JSON.parse(optimization.resultData);

    // Remaining time (if necessary)
    let remainingTime = false;
    if (
      optimization.status ===
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS
    ) {
      if (resultData && resultData.estimatedTimeRemainingMs) {
        let timeInfo = `Approximately ${SharedLib.commonUtils.secondsToString(
          resultData.estimatedTimeRemainingMs / 1000
        )} remaining`;
        remainingTime = <div id="remainingTime">{timeInfo}</div>;
      } else {
        remainingTime = (
          <div id="remainingTime">{resultData.estimatedTimeRemainingMs}</div>
        );
        console.log('Result');
        console.log(resultData);
      }
    }

    // Spinner (if necessary)
    let spinner = false;
    if (
      optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS ||
      optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES ||
      optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSING
    ) {
      spinner = (
        <div>
          <div ref={this.pieTimer} id="pie-timer" className="pie-timer hidden">
            <div className="pie-mask" />
          </div>
        </div>
      );
    }

    // Status messages
    let statusMessage = undefined;
    if (optimization.statusMessage) {
      statusMessage = optimization.statusMessage;
    } else if (
      optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.IN_PROGRES &&
      resultData &&
      resultData.countCompleted != undefined &&
      resultData.countTotal != undefined
    ) {
      statusMessage = `${resultData.countCompleted} of ${
        resultData.countTotal
      } (${((resultData.countCompleted / resultData.countTotal) * 100).toFixed(
        1
      )}%)`;
    }

    return (
      <div className="accordionContainer">
        <div className="text-div">
          Status:{' '}
          {
            SharedLib.constants.OPTIMIZATION_STATUS_ENUM_INVERSE[
              optimization.status
            ]
          }
          <br />
          {statusMessage}
          {remainingTime}
          {spinner}
        </div>
        <div className="accordion">
          <dl>
            <dt>
              <div
                id="accordion-players"
                aria-expanded="false"
                aria-controls="accordion1"
                className="accordion-title accordionTitle"
                style={{ cursor: 'pointer' }}
              >
                <div className="js-accordionTrigger">
                  <img
                    src="/server/assets/chevron-right.svg"
                    alt=">"
                    className="chevron"
                  />
                  <NoSelect>Players</NoSelect>
                </div>
              </div>
            </dt>
            <dd
              className="accordion-content accordionItem is-collapsed"
              id="accordion1"
              aria-hidden="true"
            >
              <div id="player-accordion-content">
                <table className="playerTable">
                  <tbody>{playerTable}</tbody>
                </table>
                {optimization.status ===
                SharedLib.constants.OPTIMIZATION_STATUS_ENUM.NOT_STARTED ? (
                  <div
                    id="edit-players"
                    className="edit-button button confirm-button"
                    onClick={this.handleAddPlayerClick}
                  >
                    + Add/Remove Players
                  </div>
                ) : (
                  false // Don't show add/remove button for optimizations that have already started
                )}
              </div>
            </dd>
            <dt>
              <div
                id="accordion-games"
                aria-expanded="false"
                aria-controls="accordion2"
                className="accordion-title accordionTitle"
                style={{ cursor: 'pointer' }}
              >
                <div className="js-accordionTrigger">
                  <img
                    src="/server/assets/chevron-right.svg"
                    alt=">"
                    className="chevron"
                  />
                  <NoSelect>Games</NoSelect>
                </div>
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
                id="accordion-options"
                aria-controls="accordion3"
                className="accordion-title accordionTitle"
                style={{ cursor: 'pointer' }}
              >
                <div className="js-accordionTrigger">
                  <img
                    src="/server/assets/chevron-right.svg"
                    alt=">"
                    className="chevron"
                  />
                  <NoSelect>Simulation Options</NoSelect>
                </div>
              </div>
            </dt>
            <dd
              className="accordion-content accordionItem is-collapsed"
              id="accordion3"
              aria-hidden="true"
            >
              <div id="simulationOptionsMenu">
                <fieldset style={{ padding: '5px' }} className="group">
                  <legend className="group-legend" style={{ color: 'black' }}>
                    Standard Options
                  </legend>
                  <StandardOptions
                    disabled={
                      optimization.status !==
                      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
                    }
                    optimizationId={optimization.id}
                    lineupType={optimization.lineupType}
                    selectedOptimizerId={optimization.optimizerType}
                    optimizerData={this.state.optimizerData}
                  ></StandardOptions>
                </fieldset>
                <fieldset style={{ padding: '5px' }} className="group">
                  <legend className="group-legend" style={{ color: 'black' }}>
                    Optimizer Parameters
                  </legend>
                  <CustomOptions
                    disabled={
                      optimization.status !==
                      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
                    }
                    optimizationId={optimization.id}
                    selectedOptimizerId={optimization.optimizerType}
                    optimizerData={this.state.optimizerData}
                  ></CustomOptions>
                </fieldset>
              </div>
            </dd>
            {this.renderResultsAccordion(optimization)}
          </dl>
        </div>
        {this.renderFooter(optimization)}
      </div>
    );
  }

  renderResultsAccordion(optimization) {
    let resultsStyle = {};
    if (
      optimization.status ===
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
    ) {
      resultsStyle = { display: 'none' };
    }
    return (
      <div style={resultsStyle}>
        <dt>
          <div
            id="accordion-results"
            aria-expanded="false"
            aria-controls="accordion4"
            className="accordion-title accordionTitle"
            style={{ cursor: 'pointer' }}
          >
            <div className="js-accordionTrigger">
              <img
                src="/server/assets/chevron-right.svg"
                alt=">"
                className="chevron"
              />
              <NoSelect>Results</NoSelect>
            </div>
            {/*
            <div className="icon-button">
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
          id="accordion4"
          aria-hidden="true"
        >
          <div id="result-accordion-content">
            {console.log('RESULT', JSON.parse(optimization.resultData))}
            {SharedLib.commonOptimizationResults.getResultsAsJsx(
              optimization.resultData,
              optimization.inputSummaryData
            )}
          </div>
        </dd>
      </div>
    );
  }

  renderFooter(optimization) {
    let emailCheckboxDisabled;
    let toggleButtonText;
    let toggleButtonHandler;
    let showToggleButton = true;
    let estimatedTime = false;

    if (
      optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.NOT_STARTED ||
      optimization.status === SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ERROR
    ) {
      toggleButtonText =
        optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ERROR
          ? 'Restart Simulation '
          : 'Start Simulation';
      emailCheckboxDisabled = false;
      toggleButtonHandler = this.handleStartClick.bind(this);

      if (optimization.customOptionsData) {
        let estimatedTimeInSeconds = 0;
        estimatedTime = `(Estimated Completion Time: ${SharedLib.commonUtils.secondsToString(
          estimatedTimeInSeconds
        )})`;
      } else {
        estimatedTime = `(Estimated Completion Time: N/A)`;
      }
    } else if (
      optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.IN_PROGRESS ||
      optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.ALLOCATING_RESOURCES
    ) {
      toggleButtonText = 'Pause Simulation';
      emailCheckboxDisabled = false;
      toggleButtonHandler = this.handlePauseClick.bind(this);
    } else if (
      optimization.status ===
      SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSED
    ) {
      toggleButtonText = 'Resume Simulation';
      emailCheckboxDisabled = false;
      toggleButtonHandler = this.handleStartClick.bind(this);
    } else if (
      optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.PAUSING ||
      optimization.status ===
        SharedLib.constants.OPTIMIZATION_STATUS_ENUM.COMPLETE
    ) {
      showToggleButton = false;
    }

    let toggleButton = showToggleButton ? (
      <div>
        <div>{estimatedTime}</div>
        <div
          ref={this.toggleOptimizationButtonRef}
          id="toggle-optimization-button"
          className={'edit-button button confirm-button'}
          onClick={toggleButtonHandler}
        >
          {toggleButtonText}
        </div>
      </div>
    ) : (
      false
    );

    return (
      <div id="footer">
        <label>
          <input
            type="checkbox"
            onChange={this.handleSendEmailCheckbox}
            checked={optimization.sendEmail}
            disabled={emailCheckboxDisabled}
          />
          Send me an email when the simulation is complete.
        </label>
        {toggleButton}
      </div>
    );
  }

  render() {
    let optimization = state.getOptimization(this.props.optimization.id);
    return (
      <Card title={optimization.name}>
        {this.renderOptimizationPage(optimization)}
      </Card>
    );
  }
}
