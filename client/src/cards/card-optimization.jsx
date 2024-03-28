import React from 'react';
import Card from 'elements/card';
import { getGlobalState } from 'state';
import dialog from 'dialog';
import { setRoute } from 'actions/route';
import SharedLib from 'shared-lib';
import NoSelect from 'elements/no-select';
import StandardOptions from 'elements/optimizer-standard-options';
import CustomOptions from 'elements/optimizer-custom-options';
import network from 'network';
import Loading from 'elements/loading';
import css from 'css';
const colors = css.colors;
import Cooldown from 'components/cooldown';
import IconButton from '../elements/icon-button';
import { showEmailHelp } from 'utils/help-functions';

const OPTIMIZATION_STATUS_ENUM_INVERSE =
  SharedLib.constants.OPTIMIZATION_STATUS_ENUM_INVERSE;
const OPTIMIZATION_STATUS_ENUM = SharedLib.constants.OPTIMIZATION_STATUS_ENUM;
const PROGRESSING_OPTIMIZATION_STATUSES_ENUM =
  SharedLib.constants.PROGRESSING_OPTIMIZATION_STATUSES_ENUM;
const EDITABLE_OPTIMIZATION_STATUSES_ENUM =
  SharedLib.constants.EDITABLE_OPTIMIZATION_STATUSES_ENUM;
const STARTABLE_OPTIMIZATION_STATUSES_ENUM =
  SharedLib.constants.STARTABLE_OPTIMIZATION_STATUSES_ENUM;

const ACCORDION_QUERY_PARAM_PREFIX = 'acc';
const SYNC_DELAY_MS = 10000;

export default class CardOptimization extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      optimizerData: undefined,
      estimatedCompletionTimeSec: undefined,
      estimateError: undefined,
    };

    this.previousOptimizationStatus = undefined;

    this.cooldownRef = React.createRef();

    this.handleOverrideClick = function (playerId) {
      setRoute(`/optimizations/${props.optimization.id}/overrides/${playerId}`);
    }.bind(this);

    this.handleAddPlayerClick = function () {
      setRoute(`/optimizations/${props.optimization.id}/player-select`);
    }.bind(this);

    this.enableAutoSync = async function () {
      this.startAnimation();
      console.log('DISABLE AUTOSYNC', this.activeTime);
      clearTimeout(this.activeTime);
      this.activeTime = setTimeout(
        async function () {
          await getGlobalState().sync();
          this.enableAutoSync();
        }.bind(this),
        SYNC_DELAY_MS
      );
    }.bind(this);

    this.disableAutoSync = async function () {
      clearTimeout(this.activeTime);
    };

    this.startAnimation = () => {
      if (this?.cooldownRef?.current) {
        this.cooldownRef.current.startAnimation();
      } else {
        console.warn("Couldn't start animation", this.cooldownRef);
      }
    };

    this.onRenderUpdateOrMount = function () {
      // Setup
      let optimization = this.props.optimization;

      // Update Result and Player accordion heights, this is dynamic (thus gets overridden by an !important CSS property on accordion collapse)
      if (
        document.getElementById('accordion4') &&
        document.getElementById('accordion1')
      ) {
        document.getElementById('accordion4').style.maxHeight =
          document.getElementById('result-accordion-content').offsetHeight +
          'px';
        document.getElementById('accordion1').style.maxHeight =
          document.getElementById('player-accordion-content').offsetHeight +
          'px';
      }

      // Frequently perform syncs on this page to check for server updates to the optimization object
      // Only enable/disable auto sync if there is a change of status OR this is the first update
      if (
        this.previousOptimizationStatus === undefined ||
        this.previousOptimizationStatus !== optimization.status
      ) {
        this.previousOptimizationStatus = optimization.status;
        if (
          PROGRESSING_OPTIMIZATION_STATUSES_ENUM.has(optimization.status) ||
          optimization.pause
        ) {
          this.enableAutoSync();
          console.log('ENABLE AUTO SYNC, ID:', this.activeTime);
        } else {
          this.disableAutoSync();
          console.log('DISABLE AUTO SYNC, ID:', this.activeTime);
        }
      }
    };

    this.handleTeamCheckboxClick = function (team) {
      let parsedTeams = this.props.optimization.teamList;
      let newSet = new Set(parsedTeams);
      if (parsedTeams.includes(team.id)) {
        newSet.delete(team.id);
        getGlobalState().setOptimizationField(
          this.props.optimization.id,
          'teamList',
          Array.from(newSet)
        );
      } else {
        newSet.add(team.id);
        getGlobalState().setOptimizationField(
          this.props.optimization.id,
          'teamList',
          Array.from(newSet)
        );
      }
      this.handleEstimation();
    }.bind(this);

    this.areAllTeamsSelected = () => {
      const allTeams = getGlobalState().getLocalState().teams;
      const selectedTeams = this.props.optimization.teamList;
      return allTeams.every((team) => selectedTeams.includes(team.id));
    };

    this.handleTeamCheckboxAllClick = () => {
      const allTeams = getGlobalState().getLocalState().teams;
      if (this.areAllTeamsSelected()) {
        getGlobalState().setOptimizationField(
          this.props.optimization.id,
          'teamList',
          []
        );
      } else {
        getGlobalState().setOptimizationField(
          this.props.optimization.id,
          'teamList',
          [...allTeams.map((team) => team.id)]
        );
      }
      this.handleEstimation();
    };

    this.handleSendEmailCheckbox = function () {
      if (this.props.optimization.sendEmail) {
        getGlobalState().setOptimizationField(
          this.props.optimization.id,
          'sendEmail',
          false
        );
      } else {
        getGlobalState().setOptimizationField(
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
      const response = await getGlobalState().requestAuth(
        'POST',
        'server/pause-optimization',
        body
      );
      if (response.status === 204 || response.status === 200) {
        dialog.show_notification('Sent pause request.');
        // Do a sync, since the above call succeeded server has updated the optimization's status on it's end
        await getGlobalState().sync();
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
      console.log('START CLICK PRESSED');

      // Don't do anything if optimizerData isn't loaded
      if (!this.state.optimizerData) {
        dialog.show_notification(
          `Optimizations can't be run if optimizer data isn't loaded from the network, wait a few seconds then try again`
        );
        return;
      }

      // Disable button in the UI
      const buttonDiv = this.toggleOptimizationButtonRef.current;
      buttonDiv.innerHTML = 'Starting... (may take up to 30 seconds)';
      buttonDiv.classList.add('disabled');

      // Set custom options - Read and prep default optimizer options
      let optimizer = this.props.optimization.optimizerType;
      let optimizerOptions = this.state.optimizerData[optimizer].options;
      let mergedOptions = {};
      let optionsLookup = new Set();
      for (let option of optimizerOptions) {
        optionsLookup.add(option.longLabel);
        if (option.uiVisibility !== 'HIDDEN') {
          if (option.defaultValue !== undefined) {
            mergedOptions[option.longLabel] = option.defaultValue;
          }
        }
      }

      // Set custom options - Delete any options that are undefined, and merge default and supplied options
      let parsedCustomOptionsData = this.props.optimization.customOptionsData;
      for (let key in parsedCustomOptionsData) {
        if (parsedCustomOptionsData[key] !== undefined) {
          mergedOptions[key] = parsedCustomOptionsData[key];
        }
      }

      // Delete any custom options that aren't relevant to this optimizer (otherwise we'll get unrecognized argument errors)
      for (let key in mergedOptions) {
        if (!optionsLookup.has(key)) {
          delete mergedOptions[key];
        }
      }

      getGlobalState().setOptimizationField(
        this.props.optimization.id,
        'customOptionsData',
        mergedOptions
      );

      // Set inputSummaryData. For display purposes, keep a snapshot of the player's name and stats at the moment
      // the optimization was started. This protects us from future stat updates and player deletions.
      const playerIds = this.props.optimization.playerList;
      const teamIds = this.props.optimization.teamList;
      const overrideData = this.props.optimization.overrideData;
      const stats = getGlobalState().getActiveStatsForAllPlayers(
        overrideData,
        playerIds,
        teamIds
      );
      getGlobalState().setOptimizationField(
        this.props.optimization.id,
        'inputSummaryData',
        stats
      );

      // TODO: remove any zero-length override data arrays

      // Don't run optimizations if there are no players or if any players don't have an PA
      let inadequateData = false;
      for (let playerId of playerIds) {
        if (stats[playerId].plateAppearances === 0) {
          inadequateData = true;
          break;
        }
      }
      if (playerIds.length === 0) {
        dialog.show_notification(
          `Failed to start optimization: the players list must have at least one player.`
        );
        buttonDiv.classList.remove('disabled');
        buttonDiv.innerHTML = 'Start Simulation';
        return;
      }
      if (playerIds.length === 0 || inadequateData) {
        dialog.show_notification(
          `Failed to start optimization: all players in the lineup must have at least one plate appearance.`
        );
        buttonDiv.classList.remove('disabled');
        buttonDiv.innerHTML = 'Start Simulation';
        return;
      }

      // Be sure the server has our optimization details before it tries to run the optimization
      await getGlobalState().sync();

      let isUnpause =
        this.props.optimization.status === OPTIMIZATION_STATUS_ENUM.PAUSED;

      let body = JSON.stringify({
        optimizationId: this.props.optimization.id,
        unpause: isUnpause,
      });
      let response = await getGlobalState().requestAuth(
        'POST',
        'server/start-optimization',
        body,
        null,
        60000 // 1 minute timeout
      );
      if (response.status === 204 || response.status === 200) {
        dialog.show_notification('Sent start request.');

        // Do a sync, since the call succeeded, the server has updated the optimization's status on it's end
        await getGlobalState().sync();
        buttonDiv.classList.remove('disabled');
        return;
      } else if (response.status === 403) {
        dialog.show_notification(
          <div>
            You must be logged in to run a lineup optimization. Please{' '}
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

    let estimateDebounce = function (fn, delay) {
      let timer = 0;
      let isFetching = false;
      let controller = new AbortController();

      return {
        debounced: function () {
          // Set the estimation time to undefined
          this.setState({
            estimatedCompletionTimeSec: undefined,
          });

          // Cancel existing requests and send a new one
          clearTimeout(timer);

          if (isFetching) {
            isFetching = false;
            controller.abort();
          }
          controller = new AbortController();

          timer = setTimeout(() => {
            isFetching = true;
            fn(controller);
          }, delay);
        }.bind(this),
        cancel: function () {
          // Cancel existing requests and don't send any new ones
          clearTimeout(timer);

          if (isFetching) {
            isFetching = false;
            controller.abort();
          }
        },
      };
    }.bind(this);

    let handleEstimation = async function (controller) {
      // Only request a new completion time estimate if optimization status is startable
      let optimization = this.props.optimization;
      if (!STARTABLE_OPTIMIZATION_STATUSES_ENUM.has(optimization.status)) {
        this.setState({
          estimatedCompletionTimeSec: null,
        });
        return;
      }

      // Make sure the user is logged in
      if (!getGlobalState().isSessionValid()) {
        this.setState({
          estimatedCompletionTimeSec: null,
          estimateError:
            'You must be logged in to run a lineup optimization. Your session is invalid, it may have expired. Log in and try again.',
        });
        return;
      }

      // Make sure the app has an internet connection
      if (!getGlobalState().isOnline()) {
        this.setState({
          estimatedCompletionTimeSec: null,
          estimateError: 'Lineup optimizations are not available offline.',
        });
        return;
      }

      // Only request a new completion time estimate if there is at least one player in playerList
      if (optimization.playerList.length === 0) {
        this.setState({
          estimatedCompletionTimeSec: null,
          estimateError: 'No players selected',
        });
        return;
      }

      // Make sure each player has at least one PA
      for (let playerId of optimization.playerList) {
        let overridePAs = getGlobalState().getOptimizationOverridesForPlayer(
          optimization.id,
          playerId
        );
        let gamePAs = [];
        for (let teamId of optimization.teamList) {
          gamePAs.push(
            ...getGlobalState().getPlateAppearancesForPlayerOnTeam(
              playerId,
              teamId
            )
          );
        }
        let allPas = gamePAs.concat(overridePAs);
        allPas = allPas.filter((pa) => {
          return pa.result !== null && pa.result !== undefined;
        });
        if (allPas.length === 0) {
          let player = getGlobalState().getPlayer(playerId);
          this.setState({
            estimatedCompletionTimeSec: null,
            estimateError: `Player '${player.name}' is missing a plate appearance w/ a result. All players must have at least one scored plate appearance.`,
          });
          return;
        }
      }

      // Don't do anything if optimizerData isn't loaded
      if (!this.state.optimizerData) {
        this.setState({
          estimatedCompletionTimeSec: null,
        });
        return;
      }

      // Set custom options - Read and prep default optimizer options
      let optimizer = this.props.optimization.optimizerType;
      let optimizerOptions = this.state.optimizerData[optimizer].options;
      let mergedOptions = {};
      let optionsLookup = new Set();
      for (let option of optimizerOptions) {
        optionsLookup.add(option.longLabel);
        if (option.uiVisibility !== 'HIDDEN') {
          if (option.defaultValue !== undefined) {
            mergedOptions[option.longLabel] = option.defaultValue;
          }
        }
      }

      // Set custom options - Delete any options that are undefined, and merge default and supplied options
      let parsedCustomOptionsData = this.props.optimization.customOptionsData;
      for (let key in parsedCustomOptionsData) {
        if (parsedCustomOptionsData[key] !== undefined) {
          mergedOptions[key] = parsedCustomOptionsData[key];
        }
      }

      // Delete any custom options that aren't relevant to this optimizer (otherwise we'll get unrecognized argument errors)
      for (let key in mergedOptions) {
        if (!optionsLookup.has(key)) {
          delete mergedOptions[key];
        }
      }

      getGlobalState().setOptimizationField(
        this.props.optimization.id,
        'customOptionsData',
        mergedOptions
      );

      // Be sure the server has our optimization details before it tries to run the optimization
      await getGlobalState().sync();

      // Now send the actual request
      let body = JSON.stringify({
        optimizationId: this.props.optimization.id,
      });
      let response = await getGlobalState().requestAuth(
        'POST',
        'server/estimate-optimization',
        body,
        controller,
        60000 // Give it a full minute to estimate the time
      );
      if (response.status === 200) {
        try {
          let responseBody = response.body;
          console.log('ESTIMATION RESPONSE', response);
          console.log('ESTIMATION BODY', responseBody);
          let timeRemaining = responseBody?.estimatedTimeRemainingMs;
          console.log('ESTIMATED TIME REMAINING', timeRemaining);
          console.log(
            'ESTIMATED TIME REMAINING',
            `Approximately ${SharedLib.commonUtils.secondsToString(
              timeRemaining / 1000
            )} to complete`
          );
          this.setState({
            estimatedCompletionTimeSec: timeRemaining / 1000,
          });
        } catch (error) {
          console.log(
            'Something went wrong while reading estimate response ',
            error
          );
          this.setState({
            estimatedCompletionTimeSec: null,
            estimateError: error.message,
          });
        }
      } else if (response.status === undefined) {
        // This happens when a network request gets canceled, just ignore it
      } else {
        // Report estimation error to user
        console.log(
          'Something went wrong with the estimate ',
          response.status,
          response.body
        );
        this.setState({
          estimatedCompletionTimeSec: null,
          estimateError: 'Error: ' + response?.body?.message,
        });
      }
    }.bind(this);

    // Use the debounced version of the estimation function
    let deboucned = estimateDebounce(handleEstimation, 3000);
    this.handleEstimation = deboucned.debounced;
    this.cancelHandleEstimation = deboucned.cancel;
  }

  componentWillUnmount() {
    this.disableAutoSync();
    this.cancelHandleEstimation();
  }

  componentDidUpdate() {
    this.onRenderUpdateOrMount();
  }

  componentDidMount() {
    this.onRenderUpdateOrMount();

    if (
      STARTABLE_OPTIMIZATION_STATUSES_ENUM.has(this.props.optimization.status)
    ) {
      this.handleEstimation();
    } else {
      console.log('NOT STARTING ESTIMATE', this.props.optimization.status);
    }

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
        getGlobalState().editQueryObject(
          ACCORDION_QUERY_PARAM_PREFIX + index,
          true
        );
      } else {
        this.setAccordionAria(accordionContent, accordionTitle, 'false');
        getGlobalState().editQueryObject(
          ACCORDION_QUERY_PARAM_PREFIX + index,
          null
        );
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
    let queryObject = getGlobalState().getQueryObj();
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

      // Always show the results tab if status is COMPLETE
      if (
        this.props.optimization.status === OPTIMIZATION_STATUS_ENUM.COMPLETE &&
        i === 3
      ) {
        accordionToggles[3].click();
      }
    }

    // Get optimizer info, tested to 300 calls, seems to work okay
    let prom = [];
    let optimizerIds = SharedLib.commonUtils.merge(
      getGlobalState().getAccountOptimizersList(),
      getGlobalState().getUsedOptimizers()
    );
    for (let i = 0; i < optimizerIds.length; i++) {
      prom.push(
        network.request(
          'GET',
          'server/optimizer-definition/' + optimizerIds[i],
          null,
          60000 // 1 minute timeout
        )
      );
    }

    Promise.all(prom)
      .then((values) => {
        values = values.map((v) => v?.body).filter((v) => v?.length !== 0);

        // No data found, may be offline
        if (values.length == 0 || values.some((v) => v === undefined)) {
          return;
        }

        // Convert optimizer data array to an object
        let optData = {};
        for (let i = 0; i < values.length; i++) {
          let opt = values[i];
          optData[opt.id] = opt;
        }

        this.setState({
          optimizerData: optData,
        });
      })
      .catch((e) => console.warn('Error fetching optimizers:', e));
  }

  renderOptimizationPage(optimization) {
    let isOptEditable = EDITABLE_OPTIMIZATION_STATUSES_ENUM.has(
      optimization.status
    );

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
        {isOptEditable ? (
          <th width="48" />
        ) : (
          false // Don't show the last column for already started optimizations
        )}
      </tr>
    );

    const displayPlayers = [];
    const playerIds = optimization.playerList;
    const teamIds = optimization.teamList;
    const overrideData = optimization.overrideData;

    const stats = getGlobalState().getActiveStatsForAllPlayers(
      overrideData,
      playerIds,
      teamIds
    );
    for (let i = 0; i < playerIds.length; i++) {
      const displayPlayer = {};
      Object.assign(displayPlayer, stats[playerIds[i]]);

      const existingOverride = overrideData[playerIds[i]];
      if (existingOverride && existingOverride.length !== 0) {
        displayPlayer.isOverride = true;
      } else {
        displayPlayer.isOverride = false;
      }

      const player = getGlobalState().getPlayer(playerIds[i]);
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
          {isOptEditable ? (
            <td height="48">
              <img
                src="/assets/tune-black.svg"
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
    const allTeams = getGlobalState().getLocalState().teams;
    const teamsCheckboxes = [];
    const selectedTeams = optimization.teamList;
    const selectedTeamsSet = new Set(selectedTeams);
    if (isOptEditable) {
      // What if there are not games/teams selected?
      if (allTeams.length === 0) {
        teamsCheckboxes.push(
          <div style={{ padding: '8px' }}>
            <i key="no-games">You haven't scored any games yet!</i>
          </div>
        );
      }

      for (let i = 0; i < allTeams.length; i++) {
        let team = allTeams[allTeams.length - 1 - i]; // List teams in reverse order
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
        const team = getGlobalState().getTeam(selectedTeams[i]);
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

    let resultData = optimization.resultData;

    // Remaining time (if necessary)
    let remainingTime = false;
    if (optimization.status === OPTIMIZATION_STATUS_ENUM.IN_PROGRESS) {
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
    if (getGlobalState().isOnline() === false) {
      spinner = (
        <div style={{ fontSize: '17px', color: colors.DISABLED }}>
          Offline - reconnect to see progress
        </div>
      );
    } else if (
      PROGRESSING_OPTIMIZATION_STATUSES_ENUM.has(optimization.status) ||
      optimization.pause
    ) {
      spinner = (
        <Cooldown
          ref={this.cooldownRef}
          size={33}
          duration={SYNC_DELAY_MS}
          color={colors.PRIMARY}
          backgroundColor={colors.WHITE}
        ></Cooldown>
      );
    }

    // Status messages
    let statusMessage = undefined;
    if (optimization.statusMessage) {
      statusMessage = optimization.statusMessage;
    } else if (
      optimization.status === OPTIMIZATION_STATUS_ENUM.IN_PROGRES &&
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

    // Show bulk select/de-select if there are more than 4 teams
    const bulkSelectButton =
      getGlobalState().getLocalState().teams.length > 4 ? (
        <div
          className="button tertiary-button"
          onClick={this.handleTeamCheckboxAllClick}
          style={{
            width: '120px',
          }}
        >
          {this.areAllTeamsSelected() ? 'Deselect All' : 'Select All'}
        </div>
      ) : undefined;

    return (
      <div className="accordionContainer">
        <div className="text-div">
          Status:{' '}
          {OPTIMIZATION_STATUS_ENUM_INVERSE[optimization.status] +
            (optimization.pause ? ` - PAUSING` : '')}
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
                    src="/assets/chevron-right.svg"
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
                {isOptEditable ? (
                  <div
                    id="edit-players"
                    className="list-button button"
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
                    src="/assets/chevron-right.svg"
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
              style={{ paddingTop: '0px', paddingBottom: '0px' }}
            >
              <div id="gamesMenu">
                <div
                  style={{
                    display: 'flex',
                  }}
                >
                  {optimization.status === OPTIMIZATION_STATUS_ENUM.NOT_STARTED ? bulkSelectButton : undefined}
                </div>
                {teamsCheckboxes}
              </div>
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
                    src="/assets/chevron-right.svg"
                    alt=">"
                    className="chevron"
                  />
                  <NoSelect>Optimization Options</NoSelect>
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
                    disabled={!isOptEditable}
                    optimizationId={optimization.id}
                    lineupType={optimization.lineupType}
                    selectedOptimizerId={optimization.optimizerType}
                    optimizerData={this.state.optimizerData}
                    onChange={this.handleEstimation}
                  ></StandardOptions>
                </fieldset>
                <fieldset style={{ padding: '5px' }} className="group">
                  <legend className="group-legend" style={{ color: 'black' }}>
                    {optimization.optimizerType !== undefined &&
                    this.state.optimizerData
                      ? this.state.optimizerData[optimization.optimizerType]
                          ?.name
                      : 'Optimizer'}{' '}
                    Parameters
                  </legend>
                  <CustomOptions
                    disabled={!isOptEditable}
                    optimizationId={optimization.id}
                    selectedOptimizerId={optimization.optimizerType}
                    optimizerData={this.state.optimizerData}
                    onChange={this.handleEstimation}
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
    if (EDITABLE_OPTIMIZATION_STATUSES_ENUM.has(optimization.status)) {
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
                src="/assets/chevron-right.svg"
                alt=">"
                className="chevron"
              />
              <NoSelect>
                {optimization.status === OPTIMIZATION_STATUS_ENUM.COMPLETE
                  ? 'Final '
                  : 'Intermediate '}
                Results
              </NoSelect>
            </div>
          </div>
        </dt>
        <dd
          className="accordion-content accordionItem is-collapsed"
          id="accordion4"
          aria-hidden="true"
        >
          <div id="result-accordion-content">
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
    let disabled = false;

    if (!this.state.optimizerData) {
      if (getGlobalState().isOnline()) {
        toggleButtonText = 'Loading...';
      } else {
        toggleButtonText =
          'App is offline, try again when you have a connection';
      }
      disabled = true;
    } else if (
      optimization.pause ||
      optimization.status === OPTIMIZATION_STATUS_ENUM.COMPLETE
    ) {
      // Show nothing
      showToggleButton = false;
    } else if (STARTABLE_OPTIMIZATION_STATUSES_ENUM.has(optimization.status)) {
      let textLookup = {};
      textLookup[OPTIMIZATION_STATUS_ENUM.PAUSED] = 'Resume Optimization';
      textLookup[OPTIMIZATION_STATUS_ENUM.ERROR] = 'Restart Optimization';
      textLookup[undefined] = 'Start Optimization';

      toggleButtonText = textLookup[optimization.status];

      emailCheckboxDisabled = false;
      toggleButtonHandler = this.handleStartClick.bind(this);

      if (this.state.estimatedCompletionTimeSec === undefined) {
        // We have not received the estimate yet, show a spinner
        estimatedTime = (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div>(Estimated Completion Time: </div>
            <Loading
              style={{ display: 'inline-block', width: '17px', height: '2%' }}
            ></Loading>
            )
          </div>
        );
      } else if (this.state.estimatedCompletionTimeSec === null) {
        // We received the estimate response, but it was an error
        estimatedTime = (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div>(Estimated Completion Time: ⚠)</div>
            <div style={{ padding: '.5rem', color: colors.CANCEL }}>
              {this.state.estimateError}
            </div>
          </div>
        );
      } else {
        // We received the estimate, and it can be displayed
        estimatedTime = (
          <div>
            (Estimated Completion Time:{' '}
            {SharedLib.commonUtils.secondsToString(
              this.state.estimatedCompletionTimeSec
            )}
            )
          </div>
        );
      }
    } else if (
      PROGRESSING_OPTIMIZATION_STATUSES_ENUM.has(optimization.status)
    ) {
      toggleButtonText = 'Pause Optimization';
      emailCheckboxDisabled = true;
      toggleButtonHandler = this.handlePauseClick.bind(this);
      showToggleButton = true;
    }

    let toggleButton = showToggleButton ? (
      <div>
        <div>{estimatedTime}</div>
        <div
          ref={this.toggleOptimizationButtonRef}
          id="toggle-optimization-button"
          className={`button primary-button ${disabled ? 'disabled' : ''}`}
          onClick={toggleButtonHandler}
        >
          {toggleButtonText}
        </div>
      </div>
    ) : (
      false
    );

    let emailCheckbox = undefined;
    if (
      STARTABLE_OPTIMIZATION_STATUSES_ENUM.has(optimization.status) ||
      PROGRESSING_OPTIMIZATION_STATUSES_ENUM.has(optimization.status)
    ) {
      emailCheckbox = (
        <label
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            paddingLeft: '1rem',
            paddingRight: '1rem',
          }}
        >
          <input
            type="checkbox"
            onChange={this.handleSendEmailCheckbox}
            checked={optimization.sendEmail}
            disabled={
              emailCheckboxDisabled || !getGlobalState().isEmailValidated()
            }
            style={{
              transform: 'scale(1.2)',
            }}
          />
          <span
            style={{
              marginLeft: '4px',
              color: `${
                emailCheckboxDisabled || !getGlobalState().isEmailValidated()
                  ? colors.DISABLED
                  : colors.BLACK
              }`,
            }}
          >
            Send me an email when the simulation is complete.
          </span>
          {getGlobalState().isEmailValidated() ? null : (
            <IconButton
              alt="help"
              className="help-icon"
              src="/assets/help.svg"
              onClick={showEmailHelp}
              invert
            />
          )}
        </label>
      );
    }

    return (
      <div id="footer">
        {emailCheckbox}
        {toggleButton}
      </div>
    );
  }

  render() {
    let optimization = getGlobalState().getOptimization(
      this.props.optimization.id
    );
    return (
      <Card title={optimization.name}>
        {this.renderOptimizationPage(optimization)}
      </Card>
    );
  }
}
