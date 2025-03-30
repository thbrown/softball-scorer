import React from 'react';
import expose from 'expose';
import { getGlobalState } from 'state';
import dialog from 'dialog';
import Draggable from 'react-draggable';
import { setRoute } from 'actions/route';
import css from 'css';
import IconButton from '../elements/icon-button';
import HrTitle from 'elements/hr-title';
import { Game, PlateAppearance, Player, Team } from 'shared-lib/types';

// Enum for player tile render options
const FULL_EDIT = 'fullEdit';
const PARTIAL_EDIT = 'partialEdit';
const NO_EDIT = 'noEdit';

const SIMULATION_TEXT = 'Estimating Lineup Score...';
const PLAYER_TILE_HEIGHT = 43;

interface CardLineupProps {
  game: Game;
  team: Team;
}

const hideHighlights = (skipTransition: boolean) => {
  const highlights = Array.from(
    document.getElementsByClassName('highlight')
  ) as HTMLDivElement[];
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
  const elem = document.getElementById('highlight' + i);
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

const getInds = (game: Game, elem: HTMLElement, index: number) => {
  const deltaY = parseInt(elem.style.transform.slice(15)) - 15;
  const diff = Math.floor(deltaY / PLAYER_TILE_HEIGHT) + 1;
  let highlight_index = index + diff;
  if (diff >= 0) {
    highlight_index++;
  }
  if (highlight_index <= -1) {
    highlight_index = 0;
  }
  if (highlight_index > game.lineup.length) {
    highlight_index = game.lineup.length;
  }
  let new_position_index = highlight_index;
  if (diff >= 0) {
    new_position_index--;
  }
  return { highlight_index, new_position_index };
};

export default class CardLineup extends React.Component {
  scoreSpinnerRef: React.RefObject<HTMLImageElement>;
  scoreTextRef: React.RefObject<HTMLDivElement>;
  locked: boolean;
  props: CardLineupProps;
  simWorker: Worker | undefined;

  constructor(props: CardLineupProps) {
    super(props);
    this.state = {};

    // Refs
    this.scoreSpinnerRef = React.createRef();
    this.scoreTextRef = React.createRef();

    this.locked =
      this.locked || props.game.plateAppearances.length > 0 ? true : false;
  }
  clamp = function (num, min, max) {
    return num <= min ? min : num >= max ? max : num;
  };

  handleRemoveClick = function (player, ev) {
    dialog.show_confirm(
      'Do you want to remove "' + player.name + '" from the lineup?',
      () => {
        this.simulateLineup();
        getGlobalState().removePlayerFromLineup(this.props.game.id, player.id);
      }
    );
    ev.stopPropagation();
  };

  handleCreateClick = function () {
    setRoute(
      `/teams/${this.props.team.id}/games/${this.props.game.id}/player-select`
    );
  }.bind(this);

  handleBoxClick = function (plateAppearanceId) {
    setRoute(
      `/teams/${this.props.team.id}/games/${this.props.game.id}/lineup/plateAppearances/${plateAppearanceId}`
    );
  }.bind(this);

  handleNewPlateAppearanceClick = function (player: Player, game_id: string) {
    const plateAppearance = getGlobalState().addPlateAppearance(
      player.id,
      game_id
    );
    setRoute(
      `/teams/${this.props.team.id}/games/${this.props.game.id}/lineup/plateAppearances/${plateAppearance.id}?isNew=true`
    );
  }.bind(this);

  handleDragStart = function (player, index) {
    this.setState({
      dragging: true,
    });
    const elem = document.getElementById('lineup_' + player.id);
    if (elem) {
      elem.style['z-index'] = 100;
      elem.style.position = 'absolute';
      elem.style.width = '90%';
    }
    this.handleDrag(player, index, true);
  };

  handleDragStop = function (player, index) {
    this.setState({
      dragging: false,
    });
    hideHighlights(true);
    const elem = document.getElementById('lineup_' + player.id);
    if (elem) {
      elem.style['z-index'] = 'inherit';
      elem.style.position = 'inherit';
      elem.style['margin-top'] = '5px';
      elem.style.width = 'inherit';

      const { new_position_index } = getInds(this.props.game, elem, index);
      getGlobalState().updateLineup(
        this.props.game.id,
        player.id,
        new_position_index
      );
    }

    this.simulateLineup();
  };

  handleDrag = function (player, index, skipTransition) {
    hideHighlights(skipTransition);

    const elem = document.getElementById('lineup_' + player.id);
    if (elem) {
      const { highlight_index } = getInds(this.props.game, elem, index);
      showHighlight(highlight_index, skipTransition);

      // This fixes and issue that causes the element, while being dragged, to jump up the
      // width of a tile when the highlighted div above it in the dom was expanded
      if (highlight_index < index) {
        elem.style['margin-top'] = `-${PLAYER_TILE_HEIGHT}px`;
      } else {
        elem.style['margin-top'] = null;
      }
    }
  };

  handleLockToggle = function () {
    this.locked = !this.locked;
    expose.set_state('main', {
      render: true,
    });
  }.bind(this);

  handleCreateOptimization = function () {
    dialog.show_confirm(
      `This will take you to a page for setting up and running an "Optimization" for this lineup. After your optimization is done running, you can import the optimized lineup into this game by pressing "Import Lineup From Optimization".`,
      () => {
        const optimization = getGlobalState().addOptimization(
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
  handlePreventTouchmoveWhenDragging = function (event) {
    if (this.state.dragging) {
      event.preventDefault();
    }
  };

  simulateLineup() {
    // Stop existing web workers
    if (this.simWorker) {
      this.simWorker.terminate();
    }

    const workerUrl = new URL(
      'web-workers/simulation-worker.js',
      window.location.origin
    );
    this.simWorker = new Worker(workerUrl);
    this.simWorker.onmessage = function (e) {
      const data = JSON.parse(e.data);
      const elem = this.scoreTextRef.current;
      elem.innerHTML = `Estimated Score: ${data.score.toFixed(3)} runs (took ${
        data.time
      }ms)`;

      this.scoreSpinnerRef.current.style.visibility = 'hidden';
    }.bind(this);

    // Tell web worker to start computing lineup estimated score
    const scoreSpinner = this.scoreSpinnerRef.current;
    if (scoreSpinner) {
      scoreSpinner.style.visibility = 'unset';
    }

    const simulatedScoreDiv = this.scoreTextRef.current;
    if (simulatedScoreDiv) {
      simulatedScoreDiv.innerHTML = SIMULATION_TEXT;
    }

    const lineup: (string | null)[][] = [];
    for (let i = 0; i < this.props.game.lineup.length; i++) {
      const plateAppearances: PlateAppearance[] =
        getGlobalState().getPlateAppearancesForPlayerOnTeam(
          this.props.game.lineup[i],
          this.props.team.id
        );
      const hits: (string | null)[] = [];
      for (let j = 0; j < plateAppearances.length; j++) {
        hits.push(plateAppearances[j].result);
      }
      const hitterData: Record<string, unknown> = {};
      hitterData.historicHits = hits;
      lineup.push(hits);
    }

    const message = {
      iterations: 1000000,
      innings: 7,
      lineup,
    };
    this.simWorker.postMessage(JSON.stringify(message));
  }

  getUiTextForLockButton() {
    if (this.locked) {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconButton
            src="/assets/padlock.svg"
            alt=""
            invert
            style={{
              height: '18px',
              paddingTop: '2px',
            }}
          />
          <span>Lineup Order Locked</span>
        </div>
      );
    } else {
      return (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <IconButton
            src="/assets/padlock-open.svg"
            alt=""
            invert
            style={{
              height: '18px',
              paddingTop: css.spacing.xxSmall,
            }}
          />
          <span>Lineup Order Unlocked</span>
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
    if (this.simWorker) {
      this.simWorker.terminate();
      window.document.body.removeEventListener(
        'touchmove',
        this.handlePreventTouchmoveWhenDragging.bind(this),
        {
          passive: false,
        } as EventListenerOptions
      );
    }
  }

  renderPlateAppearanceBoxes(player, plateAppearances, editable) {
    const pas = plateAppearances.map((pa, i) => {
      pa = pa || {};

      const didPlayerScore = getGlobalState().didPlayerScoreThisInning(pa.id);
      const isLastPaOfInning = getGlobalState().isLastPaOfInning(pa.id, 'game');

      const resultElement = isLastPaOfInning ? (
        <b>{pa.result || ''}</b>
      ) : (
        <>{pa.result || ''}</>
      );

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
          style={{ backgroundColor: didPlayerScore ? 'lightblue' : undefined }}
        >
          <span className="no-select">{resultElement}</span>
        </div>
      );
    });

    if (editable === FULL_EDIT || editable === PARTIAL_EDIT) {
      pas.push(
        <div
          id={'newPa-' + player.id}
          key={'newPa' + player.id}
          className="lineup-box"
          onClick={this.handleNewPlateAppearanceClick.bind(
            this,
            player,
            this.props.game.id,
            this.props.team.id
          )}
        >
          <div style={{ backgroundColor: css.colors.PRIMARY_LIGHT }}>
            <span className="no-select">+</span>
          </div>
        </div>
      );
    }

    return <div className="plate-appearance-list">{pas}</div>;
  }

  renderLineupScore() {
    return (
      <div id="score" key="score" className="lineup-score">
        <img
          id="score-spinner"
          ref={this.scoreSpinnerRef}
          src="/assets/spinner.gif"
          style={{ visibility: 'unset' }}
        ></img>
        <div
          id="score-text"
          ref={this.scoreTextRef}
          className="lineup-score-text"
        >
          {SIMULATION_TEXT}
        </div>
      </div>
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
      return (
        <div className="page-error">
          &apos;Lineup: No game, team, or lineup exists.&apos;
        </div>
      );
    }

    let pageElems: React.JSX.Element[] = [];

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
            <div
              key={'highlight' + i}
              id={'highlight' + i}
              className="highlight"
              style={{ visibility: 'hidden' }}
            ></div>
          );
          acc.push(next);
          return acc;
        }, [] as React.JSX.Element[])
    );

    pageElems.push(
      <div
        id={'highlight' + this.props.game.lineup.length}
        key={'highlight' + this.props.game.lineup.length}
        className="highlight"
        style={{ visibility: 'hidden' }}
      ></div>
    );

    pageElems.push(
      <div
        id="newPlayer"
        key="newplayer"
        className="primary-button button"
        onClick={this.handleCreateClick}
      >
        + Add/Remove Players
      </div>
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

    const showOptLineupButton =
      this.props.game.plateAppearances.length === 0 &&
      this.props.game.lineup.length > 0;
    const showImportOptLineupButton =
      this.props.game.plateAppearances.length === 0 &&
      getGlobalState().getAllOptimizations().length > 0;
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

    return <div id="list-container">{pageElems}</div>;
  }

  renderNonLineupAtBats() {
    const pageElems: React.JSX.Element[] = [];

    // Find all plate appearances that don't belong to a player in the lineup
    const allPlateAppearances = getGlobalState().getPlateAppearancesForGame(
      this.props.game.id
    );
    const nonLineupPlateAppearances = allPlateAppearances.filter(
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
      pageElems.push(<hr></hr>);
      pageElems.push(
        <div className="background-text">
          Players with plate appearances who are not in the lineup
        </div>
      );

      // Get unique player ids
      const playersIdsNotInLineupWithPlateAppearances = {};
      nonLineupPlateAppearances.forEach((value) => {
        playersIdsNotInLineupWithPlateAppearances[value.playerId] = true;
      });

      const playersIdsNotInLineup = Object.keys(
        playersIdsNotInLineupWithPlateAppearances
      );
      playersIdsNotInLineup.forEach((playerId) => {
        getGlobalState().getPlateAppearancesForPlayerInGame(
          playerId,
          this.props.game.id
        );
        pageElems.push(
          this.renderPlayerTile(playerId, this.props.game.id, null, NO_EDIT)
        );
      });
    }

    return <div>{pageElems}</div>;
  }

  renderPlayerTile(
    playerId: string,
    gameId: string,
    index: number | null,
    editable: string
  ) {
    const player = getGlobalState().getPlayer(playerId);
    const plateAppearances =
      getGlobalState().getPlateAppearancesForPlayerInGame(playerId, gameId);
    const elems: React.JSX.Element[] = [];
    if (editable === FULL_EDIT) {
      elems.push(
        <div key="handle" className="player-drag-handle">
          {/* We are using an inline svg here because using an image tag messes with react draggable handle on desktops */}
          <div>
            <svg
              style={{
                width: '24px',
                height: '24px',
                margin: '-10px',
                marginTop: 'unset',
              }}
              viewBox="0 0 24 24"
            >
              <path d="M9,3H11V5H9V3M13,3H15V5H13V3M9,7H11V9H9V7M13,7H15V9H13V7M9,11H11V13H9V11M13,11H15V13H13V11M9,15H11V17H9V15M13,15H15V17H13V15M9,19H11V21H9V19M13,19H15V21H13V19Z" />
            </svg>
          </div>
        </div>
      );
    }
    elems.push(
      <div
        key="name"
        style={
          this.locked
            ? { width: '25%', transform: 'translateY(1px)' }
            : { width: '85%', transform: 'translateY(1px)' }
        }
        className="player-name prevent-overflow"
      >
        {player.name}
      </div>
    );
    elems.push(
      <div key="boxes" className="plate-appearance-list-container">
        {this.renderPlateAppearanceBoxes(player, plateAppearances, editable)}
      </div>
    );

    if (editable === FULL_EDIT) {
      elems.push(
        <img
          id={'remove-' + playerId}
          key="del"
          src="/assets/remove.svg"
          className="lineup-row-button"
          style={{
            paddingTop: '20px',
            paddingBottom: '20px',
            marginLeft: '0',
            marginRight: '-8px',
            filter: 'invert(1)',
          }}
          onClick={this.handleRemoveClick.bind(this, player)}
        ></img>
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
        <div
          key={'lineup_' + player.id}
          id={'lineup_' + player.id}
          className={'lineup-row'}
        >
          {elems}
        </div>
      );
    } else {
      return (
        <div
          id={'lineup_' + player.id}
          key={'lineup_' + player.id}
          className={'lineup-row'}
        >
          {elems}
        </div>
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
