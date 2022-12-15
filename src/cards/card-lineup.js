import React from 'react';
import DOM from 'react-dom-factories';
import expose from 'expose';
import state from 'state';
import dialog from 'dialog';
import Draggable from 'react-draggable';
import { setRoute } from 'actions/route';
import css from 'css';
import IconButton from '../elements/icon-button';
import HrTitle from 'elements/hr-title';

// Enum for player tile render options
const FULL_EDIT = 'fullEdit';
const PARTIAL_EDIT = 'partialEdit';
const NO_EDIT = 'noEdit';

const SIMULATION_TEXT = 'Estimating Lineup Score...';
const PLAYER_TILE_HEIGHT = 43;

export default class CardLineup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    // Refs
    this.scoreSpinnerRef = React.createRef();
    this.scoreTextRef = React.createRef();

    this.locked =
      this.locked || this.props.game.plateAppearances.length > 0 ? true : false;

    const hideHighlights = (skipTransition) => {
      let highlights = document.getElementsByClassName('highlight');
      for (let i = 0; i < highlights.length; i++) {
        if (skipTransition) {
          highlights[i].classList.add('no-transition');
        }
        highlights[i].style.visibility = 'hidden';
        highlights[i].style.height = '0px';
        if (skipTransition) {
          // highlights[i].offsetHeight; // Trigger a reflow, otherwise transitions will still occur
          highlights[i].classList.remove('no-transition');
        }
      }
    };

    const showHighlight = (i, skipTransition) => {
      let elem = document.getElementById('highlight' + i);
      if (elem) {
        if (skipTransition) {
          elem.classList.add('no-transition');
        }
        elem.style.visibility = 'visible';
        elem.style.height = `${PLAYER_TILE_HEIGHT + 2}px`;
        if (skipTransition) {
          // elem.offsetHeight; // Trigger a reflow, otherwise transitions will still occur
          elem.classList.remove('no-transition');
        }
      }
    };

    const getInds = (elem, index) => {
      const deltaY = parseInt(elem.style.transform.slice(15)) - 15;
      const diff = Math.floor(deltaY / PLAYER_TILE_HEIGHT) + 1;
      let highlight_index = index + diff;
      if (diff >= 0) {
        highlight_index++;
      }
      if (highlight_index <= -1) {
        highlight_index = 0;
      }
      if (highlight_index > this.props.game.lineup.length) {
        highlight_index = this.props.game.lineup.length;
      }
      let new_position_index = highlight_index;
      if (diff >= 0) {
        new_position_index--;
      }
      return { highlight_index, new_position_index };
    };

    this.clamp = function (num, min, max) {
      return num <= min ? min : num >= max ? max : num;
    };

    this.handleRemoveClick = function (player, ev) {
      dialog.show_confirm(
        'Do you want to remove "' + player.name + '" from the lineup?',
        () => {
          this.simulateLineup();
          state.removePlayerFromLineup(this.props.game.lineup, player.id);
        }
      );
      ev.stopPropagation();
    };

    this.handleCreateClick = function () {
      setRoute(
        `/teams/${this.props.team.id}/games/${this.props.game.id}/player-select`
      );
    }.bind(this);

    this.handleBoxClick = function (plateAppearanceId) {
      setRoute(
        `/teams/${this.props.team.id}/games/${this.props.game.id}/lineup/plateAppearances/${plateAppearanceId}`
      );
    }.bind(this);

    this.handleNewPlateAppearanceClick = function (player, game_id, team_id) {
      let plateAppearance = state.addPlateAppearance(
        player.id,
        game_id,
        team_id
      );
      setRoute(
        `/teams/${this.props.team.id}/games/${this.props.game.id}/lineup/plateAppearances/${plateAppearance.id}?isNew=true`
      );
    }.bind(this);

    this.handleDragStart = function (player, index) {
      this.setState({
        dragging: true,
      });
      let elem = document.getElementById('lineup_' + player.id);
      elem.style['z-index'] = 100;
      elem.style.position = 'absolute';
      this.handleDrag(player, index, true);
    };

    this.handleDragStop = function (player, index) {
      this.setState({
        dragging: false,
      });
      hideHighlights(true);
      let elem = document.getElementById('lineup_' + player.id);
      elem.style['z-index'] = 1;
      elem.style.position = null;
      elem.style['margin-top'] = null;
      const { new_position_index } = getInds(elem, index);
      state.updateLineup(this.props.game.lineup, player.id, new_position_index);

      this.simulateLineup();
    };

    this.handleDrag = function (player, index, skipTransition) {
      hideHighlights(skipTransition);
      const elem = document.getElementById('lineup_' + player.id);
      const { highlight_index } = getInds(elem, index);
      showHighlight(highlight_index, skipTransition);

      // This fixes and issue that causes the element, while being dragged, to jump up the
      // width of a tile when the highlighted div above it in the dom was expanded
      if (highlight_index < index) {
        elem.style['margin-top'] = `-${PLAYER_TILE_HEIGHT}px`;
      } else {
        elem.style['margin-top'] = null;
      }
    };

    this.handleLockToggle = function () {
      this.locked = !this.locked;
      expose.set_state('main', {
        render: true,
      });
    }.bind(this);

    this.handleCreateOptimization = function () {
      dialog.show_confirm(
        `This will take you to a page for setting up and running an "Optimization" for this lineup. After your optimization is done running, you can import the optimized lineup into this game by pressing "Import Lineup From Optimization".`,
        () => {
          const optimization = state.addOptimization(
            `Optimize lineup vs ${this.props.game.opponent}`,
            JSON.parse(JSON.stringify(this.props.game.lineup)),
            JSON.parse(JSON.stringify([this.props.team.id])),
            this.props.game.lineupType
          );
          setRoute(
            `/optimizations/${optimization.id}?acc0=true&acc1=true&acc2=true`
          ); //edit?isNew=true
        }
      );
    }.bind(this);

    // Prevent ios from scrolling while dragging
    this.handlePreventTouchmoveWhenDragging = function (event) {
      if (this.state.dragging) {
        event.preventDefault();
      }
    };
  }

  simulateLineup() {
    // Stop existing web workers
    if (this.simWorker) {
      this.simWorker.terminate();
    }

    let workerUrl = new URL(
      'service-workers/simulation-worker.js',
      window.location.origin
    );
    this.simWorker = new Worker(workerUrl);
    this.simWorker.onmessage = function (e) {
      let data = JSON.parse(e.data);
      let elem = this.scoreTextRef.current;
      elem.innerHTML = `Estimated Score: ${data.score.toFixed(3)} runs (took ${
        data.time
      }ms)`;

      let scoreSpinner = this.scoreSpinnerRef.current;
      scoreSpinner.style.visibility = 'hidden';
    }.bind(this);

    // Tell web worker to start computing lineup estimated score
    let scoreSpinner = this.scoreSpinnerRef.current;
    scoreSpinner.style.visibility = 'unset';

    let simulatedScoreDiv = this.scoreTextRef.current;
    simulatedScoreDiv.innerHTML = SIMULATION_TEXT;

    let lineup = [];
    for (let i = 0; i < this.props.game.lineup.length; i++) {
      let plateAppearances = state.getPlateAppearancesForPlayerOnTeam(
        this.props.game.lineup[i],
        this.props.team.id
      );
      let hits = [];
      for (let j = 0; j < plateAppearances.length; j++) {
        hits.push(plateAppearances[j].result);
      }
      let hitterData = {};
      hitterData.historicHits = hits;
      lineup.push(hits);
    }

    let message = {};
    message.iterations = 1000000;
    message.innings = 7;
    message.lineup = lineup;
    this.simWorker.postMessage(JSON.stringify(message));
  }

  getUiTextForLockButton() {
    if (this.locked) {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <IconButton
            src="/assets/padlock.svg"
            alt=""
            invert
            style={{
              width: '18px',
            }}
          />
          <span
            style={{
              marginLeft: '4px',
            }}
          >
            Lineup Order Locked
          </span>
        </div>
      );
    } else {
      return (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <IconButton
            src="/assets/padlock-open.svg"
            alt=""
            invert
            style={{
              width: '18px',
            }}
          />
          <span
            style={{
              marginLeft: '4px',
            }}
          >
            Lineup Order Unlocked
          </span>
        </div>
      );
    }
  }

  disableTouchAction() {
    Array.prototype.forEach.call(
      document.getElementsByClassName('lineup-row'),
      (elem) => {
        elem.style['touch-action'] = 'none';
      }
    );
  }

  enableTouchAction() {
    Array.prototype.forEach.call(
      document.getElementsByClassName('lineup-row'),
      (elem) => {
        elem.style['touch-action'] = null;
      }
    );
  }

  componentDidMount() {
    this.simulateLineup();
    window.document.body.addEventListener(
      'touchmove',
      this.handlePreventTouchmoveWhenDragging.bind(this),
      {
        passive: false,
      }
    );
  }

  componentWillUnmount() {
    this.simWorker.terminate();
    window.document.body.removeEventListener(
      'touchmove',
      this.handlePreventTouchmoveWhenDragging.bind(this),
      {
        passive: false,
      }
    );
  }

  renderPlateAppearanceBoxes(player, plateAppearances, editable) {
    let pas = plateAppearances.map((pa, i) => {
      pa = pa || {};

      let className = 'lineup-box-beginning';
      if (editable === NO_EDIT && i === plateAppearances.length - 1) {
        className = 'lineup-box';
      }

      return (
        <div
          id={'pa-' + pa.id}
          key={`box${i}`}
          onClick={this.handleBoxClick.bind(this, pa.id)}
          className={className}
        >
          <span className="no-select">{pa.result || ''}</span>
        </div>
      );
    });

    if (editable === FULL_EDIT || editable === PARTIAL_EDIT) {
      pas = pas.concat([
        DOM.div(
          {
            id: 'newPa-' + player.id,
            key: 'newPa' + player.id,
            onClick: this.handleNewPlateAppearanceClick.bind(
              this,
              player,
              this.props.game.id,
              this.props.team.id
            ),
            className: 'lineup-box',
          },
          DOM.div(
            {
              style: {
                backgroundColor: css.colors.PRIMARY_LIGHT,
              },
            },
            <span className="no-select">+</span>
          )
        ),
      ]);
    }

    return DOM.div(
      {
        className: 'plate-appearance-list',
      },
      pas
    );
  }

  renderLineupScore() {
    return DOM.div(
      {
        id: 'score',
        key: 'score',
        className: 'lineup-score',
      },
      DOM.img({
        id: 'score-spinner',
        ref: this.scoreSpinnerRef,
        src: '/assets/spinner.gif',
        style: {
          visibility: 'unset',
        },
      }),
      DOM.div(
        {
          id: 'score-text',
          ref: this.scoreTextRef,
          className: 'lineup-score-text',
        },
        SIMULATION_TEXT
      )
    );
  }

  renderLineupPlayerList() {
    if (!this.props.game || !this.props.team) {
      console.log(
        'game:',
        this.props.game,
        'team:',
        this.props.team,
        'lineup:',
        !this.props.game.lineup
      );
      return DOM.div(
        { className: 'page-error' },
        'Lineup: No game, team, or lineup exists.'
      );
    }

    let pageElems = [];

    if (this.props.game.lineup.length === 0) {
      pageElems = pageElems.concat(
        <div key="no-players-notice" className="background-text">
          There are currently no players in this lineup, add some by clicking
          the button below.
        </div>
      );
    }
    pageElems = pageElems.concat(
      this.props.game.lineup
        .map((playerId, index) => {
          let renderType = FULL_EDIT;
          if (this.locked) {
            renderType = PARTIAL_EDIT;
          }
          return this.renderPlayerTile(
            playerId,
            this.props.game.id,
            index,
            renderType
          );
        })
        .reduce((acc, next, i) => {
          acc.push(
            DOM.div({
              key: 'highlight' + i,
              id: 'highlight' + i,
              className: 'highlight',
              style: {
                visibility: 'hidden',
              },
            })
          );
          acc.push(next);
          return acc;
        }, [])
    );

    pageElems.push(
      DOM.div({
        id: 'highlight' + this.props.game.lineup.length,
        key: 'highlight' + this.props.game.lineup.length,
        className: 'highlight',
        style: {
          visibility: 'hidden',
        },
      })
    );

    pageElems.push(
      DOM.div(
        {
          id: 'newPlayer',
          key: 'newplayer',
          // className: 'list-item add-list-item',
          className: 'primary-button button',
          onClick: this.handleCreateClick,
        },
        '+ Add/Remove Players'
      )
    );

    if (this.props.game.lineup.length !== 0) {
      pageElems.push(
        <div
          id="lock"
          key="lock"
          className="list-button button"
          onClick={this.handleLockToggle}
        >
          {this.getUiTextForLockButton()}
        </div>
      );
    }

    let showOptLineupButton =
      this.props.game.plateAppearances.length === 0 &&
      this.props.game.lineup.length > 0;
    let showImportOptLineupButton =
      this.props.game.plateAppearances.length === 0 &&
      state.getAllOptimizations().length > 0;
    if (showOptLineupButton || showImportOptLineupButton) {
      pageElems.push(
        <HrTitle key="optimization" title="Optimization"></HrTitle>
      );
    }

    if (showOptLineupButton) {
      pageElems.push(
        <div
          id="opt"
          key="opt"
          className="list-button button"
          onClick={this.handleCreateOptimization}
        >
          Optimize Lineup...
        </div>
      );
    }

    if (showImportOptLineupButton) {
      pageElems.push(
        <div
          id="import"
          key="import"
          className="list-button button"
          onClick={() => {
            setRoute(
              `/teams/${this.props.team.id}/games/${this.props.game.id}/import`
            );
          }}
        >
          Import Lineup From Optimization
        </div>
      );
    }

    return DOM.div({ id: 'list-container' }, pageElems);
  }

  renderNonLineupAtBats() {
    let pageElems = [];

    // Find all plate appearances that don't belong to a player in the lineup
    let allPlateAppearances = state.getPlateAppearancesForGame(
      this.props.game.id
    );
    let nonLineupPlateAppearances = allPlateAppearances.filter(
      (plateAppearance) => {
        let value = true;
        this.props.game.lineup.forEach((playerInLineupId) => {
          if (playerInLineupId === plateAppearance.playerId) {
            value = false; // TODO: how can we break out of this loop early?
          }
        });
        return value;
      }
    );

    if (nonLineupPlateAppearances.length !== 0) {
      pageElems.push(DOM.hr());
      pageElems.push(
        <div className="background-text">
          Players with plate appearances who are not in the lineup
        </div>
      );

      // Get unique player ids
      let playersIdsNotInLineupWithPlateAppearances = {};
      nonLineupPlateAppearances.forEach((value) => {
        playersIdsNotInLineupWithPlateAppearances[value.playerId] = true;
      });

      let playersIdsNotInLineup = Object.keys(
        playersIdsNotInLineupWithPlateAppearances
      );
      playersIdsNotInLineup.forEach((playerId) => {
        state.getPlateAppearancesForPlayerInGame(playerId, this.props.game.id);
        pageElems.push(
          this.renderPlayerTile(playerId, this.props.game.id, null, NO_EDIT)
        );
      });
    }

    return DOM.div({}, pageElems);
  }

  renderPlayerTile(playerId, gameId, index, editable) {
    const player = state.getPlayer(playerId);
    const plateAppearances = state.getPlateAppearancesForPlayerInGame(
      playerId,
      gameId
    );
    let elems = [];
    if (editable === FULL_EDIT) {
      elems.push(
        DOM.div(
          {
            key: 'handle',
            className: 'player-drag-handle',
          },
          // We are using an inline svg here because using an image tag messes with react draggable handle on desktops
          <div>
            <svg
              style={{
                width: '24px',
                height: '24px',
                margin: '-10px',
              }}
              viewBox="0 0 24 24"
            >
              <path d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z" />
            </svg>
          </div>
        )
      );
    }
    elems.push(
      DOM.div(
        {
          key: 'name',
          className: 'player-name prevent-overflow',
        },
        player.name
      )
    );
    elems.push(
      DOM.div(
        {
          key: 'boxes',
          className: 'plate-appearance-list-container',
        },
        this.renderPlateAppearanceBoxes(player, plateAppearances, editable)
      )
    );

    if (editable === FULL_EDIT) {
      elems.push(
        DOM.img({
          id: 'remove-' + playerId,
          key: 'del',
          src: '/assets/remove.svg',
          className: 'lineup-row-button',
          style: {
            paddingTop: '20px',
            paddingBottom: '20px',
            marginLeft: '0',
            marginRight: '-8px',
            filter: 'invert(1)',
          },
          onClick: this.handleRemoveClick.bind(this, player),
        })
      );
    }

    if (editable === FULL_EDIT) {
      return React.createElement(
        Draggable,
        {
          key: 'lineup-draggable' + player.id,
          axis: 'y',
          handle: '.player-drag-handle',
          position: { x: 0, y: 0 },
          grid: [1, 1],
          onStart: this.handleDragStart.bind(this, player, index),
          onStop: this.handleDragStop.bind(this, player, index),
          onDrag: this.handleDrag.bind(this, player, index, false),
        },
        DOM.div(
          {
            key: 'lineup_' + player.id,
            id: 'lineup_' + player.id,
            className: 'lineup-row',
          },
          elems
        )
      );
    } else {
      return DOM.div(
        {
          id: 'lineup_' + player.id,
          key: 'lineup_' + player.id,
          className: 'lineup-row',
        },
        elems
      );
    }
  }

  render() {
    return (
      <div>
        {this.renderLineupScore()}
        {this.renderLineupPlayerList()}
        {this.renderNonLineupAtBats()}
      </div>
    );
  }
}
