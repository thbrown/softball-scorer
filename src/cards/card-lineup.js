import React from 'react';
import DOM from 'react-dom-factories';
import expose from 'expose';
import state from 'state';
import dialog from 'dialog';
import Draggable from 'react-draggable';
import { setRoute } from 'actions/route';

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

    this.locked =
      this.locked || this.props.game.plateAppearances.length > 0 ? true : false;

    const hideHighlights = skipTransition => {
      let highlights = document.getElementsByClassName('highlight');
      for (let i = 0; i < highlights.length; i++) {
        if (skipTransition) {
          highlights[i].classList.add('no-transition');
        }
        highlights[i].style.visibility = 'hidden';
        highlights[i].style.height = '0px';
        if (skipTransition) {
          highlights[i].offsetHeight; // Trigger a reflow, otherwise transitions will still occur
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
          elem.offsetHeight; // Trigger a reflow, otherwise transitions will still occur
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

    this.clamp = function(num, min, max) {
      return num <= min ? min : num >= max ? max : num;
    };

    this.handleRemoveClick = function(player, ev) {
      dialog.show_confirm(
        'Do you want to remove "' + player.name + '" from the lineup?',
        () => {
          this.simulateLineup();
          state.removePlayerFromLineup(this.props.game.lineup, player.id);
        }
      );
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      setRoute(
        `/teams/${this.props.team.id}/games/${this.props.game.id}/player-selection`
      );
    }.bind(this);

    this.handleBoxClick = function(plateAppearanceId) {
      setRoute(
        `/teams/${this.props.team.id}/games/${this.props.game.id}/lineup/plateAppearances/${plateAppearanceId}`
      );
    }.bind(this);

    this.handleNewPlateAppearanceClick = function(player, game_id, team_id) {
      let plateAppearance = state.addPlateAppearance(
        player.id,
        game_id,
        team_id
      );
      setRoute(
        `/teams/${this.props.team.id}/games/${this.props.game.id}/lineup/plateAppearances/${plateAppearance.id}?isNew=true`
      );
    }.bind(this);

    this.handleDragStart = function(player, index) {
      this.setState({
        dragging: true,
      });
      let elem = document.getElementById('lineup_' + player.id);
      elem.style['z-index'] = 100;
      elem.style.position = 'absolute';
      this.handleDrag(player, index, true);
    };

    this.handleDragStop = function(player, index) {
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

    this.handleDrag = function(player, index, skipTransition) {
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

    this.handleLockToggle = function() {
      let lockButton = document.getElementById('lock');
      this.locked = !this.locked;
      lockButton.textContent = this.getUiTextForLockButton();
      expose.set_state('main', {
        render: true,
      });
    }.bind(this);

    // Prevent ios from scrolling while dragging
    this.handlePreventTouchmoveWhenDragging = function(event) {
      if (this.state.dragging) {
        event.preventDefault();
      }
    };
  }

  simulateLineup() {
    // web workers don't work in tests
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Stop existing web workers
    if (this.simWorker) {
      this.simWorker.terminate();
    }
    this.simWorker = new Worker('/server/simulation-worker');
    this.simWorker.onmessage = function(e) {
      let data = JSON.parse(e.data);
      let elem = document.getElementById('score-text');
      elem.innerHTML = `Estimated Score: ${data.score.toFixed(3)} runs (took ${
        data.time
      }ms)`;

      let scoreSpinner = document.getElementById('score-spinner');
      scoreSpinner.style.visibility = 'hidden';
    };

    // Tell web worker to start computing lineup estimated score
    let scoreSpinner = document.getElementById('score-spinner');
    scoreSpinner.style.visibility = 'unset';

    let simulatedScoreDiv = document.getElementById('score-text');
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
      return 'Unlock';
    } else {
      return 'Lock';
    }
  }

  disableTouchAction() {
    Array.prototype.forEach.call(
      document.getElementsByClassName('lineup-row'),
      elem => {
        elem.style['touch-action'] = 'none';
      }
    );
  }

  enableTouchAction() {
    Array.prototype.forEach.call(
      document.getElementsByClassName('lineup-row'),
      elem => {
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
    // web workers don't work in tests
    if (process.env.NODE_ENV !== 'test') {
      this.simWorker.terminate();
    }
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
      return (
        <div
          id={'pa-' + pa.id}
          key={`box${i}`}
          onClick={this.handleBoxClick.bind(this, pa.id)}
          className="lineup-box"
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
                backgroundColor: '#DDD',
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
        src: '/server/assets/spinner.gif',
        style: {
          visibility: 'unset',
        },
      }),
      DOM.div(
        {
          id: 'score-text',
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
        'Lineup: No game, team, or lineup exist.'
      );
    }

    let pageElems = [];

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
          className: 'list-item add-list-item',
          onClick: this.handleCreateClick,
        },
        '+ Add Player'
      )
    );

    pageElems.push(
      DOM.div(
        {
          id: 'lock',
          key: 'lock',
          className: 'list-item add-list-item',
          onClick: this.handleLockToggle,
        },
        this.getUiTextForLockButton()
      )
    );

    return DOM.div({ id: 'list-container' }, pageElems);
  }

  renderNonLineupAtBats() {
    let pageElems = [];

    // Find all plate appearances that don't belong to a player in the lineup
    let allPlateAppearances = state.getPlateAppearancesForGame(
      this.props.game.id
    );
    let nonLineupPlateAppearances = allPlateAppearances.filter(
      plateAppearance => {
        let value = true;
        this.props.game.lineup.forEach(playerInLineupId => {
          if (playerInLineupId === plateAppearance.player_id) {
            value = false; // TODO: how can we break out of this loop early?
          }
        });
        return value;
      }
    );

    if (nonLineupPlateAppearances.length !== 0) {
      pageElems.push(DOM.hr());
      pageElems.push(
        DOM.div(
          {
            style: {
              textAlign: 'center',
              fontSize: '21px',
            },
          },
          'Players with plate appearances who are not in the lineup'
        )
      );

      // Get unique player ids
      let playersIdsNotInLineupWithPlateAppearances = {};
      nonLineupPlateAppearances.forEach(value => {
        playersIdsNotInLineupWithPlateAppearances[value.player_id] = true;
      });

      let playersIdsNotInLineup = Object.keys(
        playersIdsNotInLineupWithPlateAppearances
      );
      playersIdsNotInLineup.forEach(playerId => {
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
                fill: 'white',
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
          src: '/server/assets/remove.svg',
          className: 'lineup-row-button',
          style: {
            paddingTop: '20px',
            paddingBottom: '20px',
            marginLeft: '0',
            marginRight: '-8px',
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
    return DOM.div(
      {
        className: 'card',
        style: {
          marginTop: '10px',
        },
      },
      DOM.div(
        {
          className: 'card-body',
        },
        this.renderLineupScore(),
        this.renderLineupPlayerList(),
        this.renderNonLineupAtBats()
      )
    );
  }
}
