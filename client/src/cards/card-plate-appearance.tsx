import React, { useCallback, useMemo } from 'react';
import dialog from 'dialog';
import Draggable from 'react-draggable';
import results from 'plate-appearance-results';
import { getGlobalState } from 'state';
import WalkupSong from 'components/walkup-song';
import { normalize, distance, cleanObject } from 'utils/functions';
import { goBack } from 'actions/route';
import { makeStyles } from 'css/helpers';
import { setRoute } from 'actions/route';
import Card from 'elements/card';
import BallFieldSvg from 'components/ball-field-svg';
import { PlateAppearance } from 'shared-lib/types';

const LOCATION_DENOMINATOR = 32767;

const BALLFIELD_MAX_WIDTH = 500;

const PLAYER_LOCATION_SIZE = 48;

const RESULT_OPTIONS_DEFAULT = 0;
const RESULT_OPTIONS_EXTRA = 1;

const useStyles = makeStyles((theme) => ({
  buttonRow: {
    display: 'flex',
    justifyContent: 'flex-start',
    margin: '4px 10px',
  },
  buttonRowExtra: {
    display: 'flex',
    justifyContent: 'flex-start',
    margin: '4px 10px',
  },
  button: {
    cursor: 'default',
    padding: theme.spacing.medium,
    color: theme.colors.TEXT_DARK,
    border: `2px solid ${theme.colors.SECONDARY}`,
    background: theme.colors.WHITE,
    borderRadius: theme.borderRadius.small,
    textAlign: 'center',
    fontSize: theme.typography.size.large,
    width: '48px',
    margin: '2px',
    [`@media (max-width:${theme.breakpoints.sm})`]: {
      fontSize: theme.typography.size.medium,
      padding: '6px',
      margin: '0px',
    },
  },
  buttonSelected: {
    color: theme.colors.TEXT_LIGHT,
    backgroundColor: theme.colors.PRIMARY_DARK,
    borderColor: theme.colors.PRIMARY_DARK,
  },
}));

// Locations of the bases (from the upper left of the image in px) while the image is full sized
const BASE_COORDINATES = {
  '1B': { top: 375, left: 352 },
  '2B': { top: 277, left: 246 },
  '3B': { top: 375, left: 145 },
  scored: { top: 473, left: 247 },
  out: { top: 410, left: 55 },
};

class CardPlateAppearance extends React.Component<any, any> {
  isNew = false;
  mx: number | undefined;
  my: number | undefined;

  constructor(props) {
    super(props);
    this.state = {
      resultOptionsPage: 0,
      paResult: props.plateAppearance.result,
      paLocationX: props.plateAppearance.location
        ? props.plateAppearance.location.x
        : null,
      paLocationY: props.plateAppearance.location
        ? props.plateAppearance.location.y
        : null,
      runners: props.plateAppearance.runners,
      suspendTransition: false,
    };

    this.isNew = props.isNew;
  }

  buildPlateAppearance = () => {
    const pa = JSON.parse(JSON.stringify(this.props.plateAppearance));
    pa.result = this.state.paResult;
    pa.location = {};
    pa.location.x = this.state.paLocationX;
    pa.location.y = this.state.paLocationY;
    pa.runners = this.state.runners;
    return pa;
  };

  homeOrBack = () => {
    const newPa = this.buildPlateAppearance();
    if (
      this.props.isNew &&
      JSON.stringify(newPa) === JSON.stringify(this.props.plateAppearance)
    ) {
      // TODO: this re-renders the page (since it no longer exists an error gets logged)
      // then goes back immediately. This should be cleaned up after we figure out out
      // back button philosophy. This problem also exists on other pages
      // (teams, games, players) but it happens silently so we don't notice
      this.props.remove();
    } else {
      this.props.replace(newPa);
    }
  };

  handleConfirmClick = () => {
    const newPa = this.buildPlateAppearance();
    this.props.replace(newPa);
    goBack();
  };

  handleCancelClick = () => {
    goBack();
    if (this.props.isNew) {
      this.props.remove();
    }
  };

  handleDeleteClick = () => {
    dialog.show_confirm(
      'Are you sure you want to delete this plate appearance?',
      () => {
        goBack();
        this.props.remove();
      }
    );
  };

  handleButtonClick = (result) => {
    const isPreviousPaFirstPAOfInning =
      this.props.previousPlateAppearance === undefined ||
      this.props.previousPlateAppearance === null
        ? true
        : getGlobalState().isLastPaOfInning(
            this.props.previousPlateAppearance.id,
            this.props.origin
          );
    const previousRunners = isPreviousPaFirstPAOfInning
      ? {}
      : this.props.previousPlateAppearance?.runners ?? {};

    // Guess new state
    const newRunners = {};
    switch (result) {
      case '1B':
      case 'BB':
      case 'E':
        newRunners['1B'] = this.props.player.id;
        newRunners['2B'] = previousRunners['1B'];
        newRunners['3B'] = previousRunners['2B'];
        newRunners['scored'] = [previousRunners['3B']];
        break;
      case '2B':
        newRunners['2B'] = this.props.player.id;
        newRunners['3B'] = previousRunners['1B'];
        newRunners['scored'] = [previousRunners['2B'], previousRunners['3B']];
        break;
      case '3B':
        newRunners['3B'] = this.props.player.id;
        newRunners['scored'] = [
          previousRunners['1B'],
          previousRunners['2B'],
          previousRunners['3B'],
        ];
        break;
      case 'FC':
        // Hitter is out
        newRunners['1B'] = this.props.player.id;

        // The next runner is out
        if (previousRunners['1B'] !== undefined) {
          newRunners['out'] = [previousRunners['1B']];
          // Everybody else moves up a base
          if (previousRunners['2B'] !== undefined) {
            newRunners['3B'] = previousRunners['2B'];
          }
          if (previousRunners['3B'] !== undefined) {
            newRunners['scored'] = [previousRunners['3B']];
          }
        } else if (previousRunners['2B'] !== undefined) {
          newRunners['out'] = [previousRunners['2B']];
          // Everybody else moves up a base
          if (previousRunners['3B'] !== undefined) {
            newRunners['scored'] = [previousRunners['3B']];
          }
        } else if (previousRunners['3B'] !== undefined) {
          newRunners['out'] = [previousRunners['3B']];
        }
        break;
      case 'HRi':
      case 'HRo':
        newRunners['scored'] = [
          this.props.player.id,
          previousRunners['1B'],
          previousRunners['2B'],
          previousRunners['3B'],
        ];
        break;
      case 'SAC':
        newRunners['out'] = [this.props.player.id];
        if (previousRunners['1B'] !== undefined) {
          newRunners['2B'] = previousRunners['1B'];
        }
        if (previousRunners['2B'] !== undefined) {
          newRunners['3B'] = previousRunners['2B'];
        }
        if (previousRunners['3B'] !== undefined) {
          newRunners['scored'] = [previousRunners['3B']];
        }
        break;
      case 'DP':
        // First Out
        newRunners['out'] = [this.props.player.id];

        // Second Out
        if (previousRunners['1B'] !== undefined) {
          newRunners['out'].push(previousRunners['1B']);
          // Everybody else moves up a base
          if (previousRunners['2B'] !== undefined) {
            newRunners['3B'] = previousRunners['2B'];
          }
          if (previousRunners['3B'] !== undefined) {
            newRunners['scored'] = [previousRunners['3B']];
          }
        } else if (previousRunners['2B'] !== undefined) {
          newRunners['out'].push(previousRunners['2B']);
          // Everybody else moves up a base
          if (previousRunners['3B'] !== undefined) {
            newRunners['scored'] = [previousRunners['3B']];
          }
        } else if (previousRunners['3B'] !== undefined) {
          newRunners['out'].push(previousRunners['3B']);
        }
        break;
      case 'TP':
        // First Out
        newRunners['out'] = [this.props.player.id];

        // Second Out
        if (
          previousRunners['1B'] !== undefined &&
          previousRunners['2B'] !== undefined
        ) {
          newRunners['out'].push(previousRunners['1B']);
          newRunners['out'].push(previousRunners['2B']);
          newRunners['3B'] = previousRunners['3B'];
        } else if (
          previousRunners['1B'] !== undefined &&
          previousRunners['3B'] !== undefined
        ) {
          newRunners['out'].push(previousRunners['1B']);
          newRunners['out'].push(previousRunners['3B']);
        } else if (
          previousRunners['2B'] !== undefined &&
          previousRunners['3B'] !== undefined
        ) {
          newRunners['out'].push(previousRunners['2B']);
          newRunners['out'].push(previousRunners['3B']);
        } else {
          newRunners['1B'] = previousRunners['1B'];
          newRunners['2B'] = previousRunners['2B'];
          newRunners['3B'] = previousRunners['3B'];
        }
        break;
      case null:
        break;
      default:
        // TODO: move runners up in some cases?
        newRunners['out'] = [this.props.player.id];
        newRunners['1B'] = previousRunners['1B'];
        newRunners['2B'] = previousRunners['2B'];
        newRunners['3B'] = previousRunners['3B'];
        break;
    }

    // If the last out of the inning will occur during this PA, don't auto count any scored runs
    const cleanRunners = cleanObject(newRunners);
    const outsAtPreviousPa = this.props.previousPlateAppearance
      ? getGlobalState().getOutsAtPa(
          this.props.previousPlateAppearance.id,
          this.props.origin
        ) % 3
      : 0;
    const outsAtCurrentPa =
      outsAtPreviousPa + (cleanRunners['out'] ? cleanRunners['out'].length : 0);
    if (outsAtCurrentPa >= 3 && cleanRunners['scored']?.length === 1) {
      if (cleanRunners['3B'] === undefined) {
        cleanRunners['3B'] = cleanRunners['scored'][0];
        cleanRunners['scored'] = [];
      } else if (cleanRunners['2B'] === undefined) {
        cleanRunners['2B'] = cleanRunners['3B'];
        cleanRunners['3B'] = cleanRunners['scored'][0];
        cleanRunners['scored'] = [];
      } else if (cleanRunners['1B'] === undefined) {
        cleanRunners['1B'] = cleanRunners['2B'];
        cleanRunners['2B'] = cleanRunners['3B'];
        cleanRunners['3B'] = cleanRunners['scored'][0];
        cleanRunners['scored'] = [];
      } else {
        console.warn('Could not find a base for the runner!');
      }
    }

    this.setState({
      paResult: result,
      runners: cleanObject(cleanRunners),
    });
  };

  handleToggleResultOptions = () => {
    const update =
      this.state.resultOptionsPage === RESULT_OPTIONS_DEFAULT
        ? RESULT_OPTIONS_EXTRA
        : RESULT_OPTIONS_DEFAULT;
    this.setState({
      resultOptionsPage: update,
    });
  };

  handleDragStart = (ev) => {
    const element = document.getElementById('baseball');
    if (element) {
      element.classList.remove('pulse-animation');
    }
    this.setState({
      dragging: true,
    });
  };

  handleDragStop = (ev) => {
    // lame way to make this run after the mouseup event
    setTimeout(() => {
      const new_x = Math.floor(
        ((this.mx ?? 0 - 10) /
          Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH)) *
          LOCATION_DENOMINATOR
      );
      const new_y = Math.floor(
        ((this.my ?? 0 - 10) /
          Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH)) *
          LOCATION_DENOMINATOR
      );
      this.setState({
        dragging: false,
        paLocationX: new_x,
        paLocationY: new_y,
      });
    }, 1);
  };

  // Prevent ios from scrolling while dragging
  handlePreventTouchmoveWhenDragging = (event) => {
    if (this.state.dragging) {
      event.preventDefault();
    }
  };

  baseRefs = {
    '1B': React.createRef(),
    '2B': React.createRef(),
    '3B': React.createRef(),
    scored: React.createRef(),
    out: React.createRef(),
  } as any;

  getClosestBase(xCoord, yCoord, adjBaseCoordinates): any {
    const candidates = {
      '1B': {
        dist: distance(
          xCoord,
          yCoord,
          adjBaseCoordinates['1B'].left,
          adjBaseCoordinates['1B'].top
        ),
        ref: this.baseRefs['1B'],
      },
      '2B': {
        dist: distance(
          xCoord,
          yCoord,
          adjBaseCoordinates['2B'].left,
          adjBaseCoordinates['2B'].top
        ),
        ref: this.baseRefs['2B'],
      },
      '3B': {
        dist: distance(
          xCoord,
          yCoord,
          adjBaseCoordinates['3B'].left,
          adjBaseCoordinates['3B'].top
        ),
        ref: this.baseRefs['3B'],
      },
      scored: {
        dist: distance(
          xCoord,
          yCoord,
          adjBaseCoordinates['scored'].left,
          adjBaseCoordinates['scored'].top
        ),
        ref: this.baseRefs['scored'],
      },
      out: {
        dist: distance(
          xCoord,
          yCoord,
          adjBaseCoordinates['out'].left,
          adjBaseCoordinates['out'].top
        ),
        ref: this.baseRefs['out'],
      },
    };

    // Return the first one
    let minEntry = { dist: 999999999, ref: undefined };
    for (const entry in candidates) {
      if (candidates[entry].dist < minEntry.dist) {
        minEntry = candidates[entry];
      }
    }
    return minEntry.ref;
  }

  onPlayerDragStart = () => {
    // Un-hide all runner locations
    for (const entry in this.baseRefs) {
      this.baseRefs[entry].current.classList.remove('gone');
    }

    // Halt css transition for player draggables
    this.setState({
      suspendTransition: true,
    });
  };

  onPlayerDragStop = (
    adjustedBaseCoords,
    playerId,
    mouseEvent,
    draggableData
  ) => {
    // Hide all runner locations
    for (const entry in this.baseRefs) {
      this.baseRefs[entry].current.classList.add('gone');
    }

    // Determine new runner location
    const ref = this.getClosestBase(
      draggableData.x,
      draggableData.y,
      adjustedBaseCoords
    );
    const runnerLocation = ref?.current.getAttribute('id');

    // Move the runners and update the state!
    const newRunners = JSON.parse(JSON.stringify(this.state.runners));
    this.moveRunner(newRunners, playerId, runnerLocation);
    this.setState({
      runners: cleanObject(newRunners),
      suspendTransition: false,
    });
  };

  onPlayerDrag(adjustedBaseCoords, mouseEvent, draggableData) {
    // Un-highlight all runner locations
    for (const entry in this.baseRefs) {
      this.baseRefs[entry].current.classList.remove(
        'player-location-highlight'
      );
    }

    // Highlight the closest runner location
    const ref = this.getClosestBase(
      draggableData.x,
      draggableData.y,
      adjustedBaseCoords
    );
    ref.current.classList.add('player-location-highlight');
  }

  onmouseup = (ev) => {
    const ballfield = document.getElementById('ballfield');

    if (!ballfield) {
      return;
    }

    // accounts for scroll of the body
    const yOffset = -(
      document.getElementsByClassName('card')[0].scrollTop ?? 0
    );

    if (ev.changedTouches) {
      this.mx = ev.changedTouches[0].pageX - ballfield.offsetLeft;
      this.my =
        ev.changedTouches[0].pageY -
        ballfield.offsetTop -
        yOffset -
        48; /* headerSize */
    } else {
      this.mx = ev.clientX - ballfield.offsetLeft;
      this.my =
        ev.clientY - ballfield.offsetTop - yOffset - 48; /* headerSize */
    }

    if (this.mx < 0) {
      this.mx = 0;
    }

    if (this.my < 0) {
      this.my = 0;
    }

    // Dragging the ball 20px below cancels the location
    if (this.my > parseInt(ballfield.style.height) + 20) {
      this.my = undefined;
      this.mx = undefined;
    } else if (this.my > parseInt(ballfield.style.height)) {
      this.my = parseInt(ballfield.style.height);
    }

    if ((this.mx ?? 0) > parseInt(ballfield.style.width)) {
      this.mx = parseInt(ballfield.style.width);
    }
  };

  componentDidMount() {
    window.document.body.addEventListener(
      'touchmove',
      this.handlePreventTouchmoveWhenDragging,
      {
        passive: false,
      }
    );

    window.addEventListener('mouseup', this.onmouseup);
    window.addEventListener('touchend', this.onmouseup);

    // TODO: only apply this if there is no hit
    const elem = document.getElementById('baseball');
    if (elem) {
      elem.classList.add('pulse-animation');
    }
  }

  componentWillUnmount() {
    window.document.body.removeEventListener(
      'touchmove',
      this.handlePreventTouchmoveWhenDragging,
      {
        passive: false,
      } as any
    );

    window.removeEventListener('mouseup', this.onmouseup);
    window.removeEventListener('touchend', this.onmouseup);
  }

  moveRunner(runners, playerId, location) {
    if (playerId === undefined) {
      return;
    }

    // remove the player from its old location
    Object.keys(runners).forEach(function (key) {
      if (Array.isArray(runners[key])) {
        runners[key] = runners[key].filter((pid) => pid !== playerId);
        if (runners[key].length === 0) {
          delete runners[key];
        }
      } else {
        if (runners[key] === playerId) {
          delete runners[key];
        }
      }
    });

    // Move everybody in my way, the move me
    if (location === 'scored') {
      if (runners['scored'] === undefined) {
        runners['scored'] = [playerId];
      } else {
        runners['scored'].push(playerId);
      }
    } else if (location === 'out') {
      if (runners['out'] === undefined) {
        runners['out'] = [playerId];
      } else {
        runners['out'].push(playerId);
      }
    } else if (location === '1B') {
      this.moveRunner(runners, runners[location], '2B');
      runners[location] = playerId;
    } else if (location === '2B') {
      this.moveRunner(runners, runners[location], '3B');
      runners[location] = playerId;
    } else if (location === '3B') {
      this.moveRunner(runners, runners[location], 'scored');
      runners[location] = playerId;
    } else {
      console.error("Couldn't find loc", location);
    }
  }

  getRunnerDraggable(playerId, x, y, disabled, adjBaseCoordinates, opacity) {
    return (
      <Draggable
        onDrag={this.onPlayerDrag.bind(this, adjBaseCoordinates)}
        position={{ x: x + 1, y: y - 20 }}
        disabled={disabled}
        key={'dr-' + playerId + x}
        onStop={this.onPlayerDragStop.bind(this, adjBaseCoordinates, playerId)}
        onStart={this.onPlayerDragStart}
      >
        <div
          style={{
            position: 'absolute',
            color: 'black',
            marginLeft: -64,
            marginTop: -50,
            opacity: opacity,
            userSelect: 'none',
            transition: this.state.suspendTransition
              ? 'none'
              : 'transform 0.3s',
          }}
          className="triangle-border"
        >
          {getGlobalState().getPlayer(playerId).name}
        </div>
      </Draggable>
    );
  }

  renderButtonList() {
    if (!this.props.player || !this.props.plateAppearance) {
      return (
        <div className="page-error">
          PlateAppearance: No game or team or player or PlateAppearance exists.
        </div>
      );
    }

    const visibleOptions =
      this.state.resultOptionsPage === RESULT_OPTIONS_DEFAULT
        ? results.getFirstPage()
        : results.getSecondPage();

    const elems = visibleOptions.map((result, i) => {
      return (
        <div
          id={'result-' + result}
          key={`${i} ${result}`}
          className={
            this.props.classes.classes.button +
            (this.state.paResult === result
              ? ' ' + this.props.classes.classes.buttonSelected
              : '')
          }
          onClick={this.handleButtonClick.bind(this, result)}
        >
          <span className="no-select">{result}</span>
        </div>
      );
    });

    // Add the '...' button to access different PA results
    elems.push(
      <div
        id={'result-toggle'}
        key={`result-toggle`}
        className={this.props.classes.classes.button}
        onClick={this.handleToggleResultOptions}
      >
        <span className="no-select">...</span>
      </div>
    );

    return (
      <div>
        <div
          className={
            this.state.resultOptionsPage === RESULT_OPTIONS_DEFAULT
              ? this.props.classes.classes.buttonRow
              : this.props.classes.classes.buttonRowExtra
          }
        >
          {elems.slice(0, elems.length / 2)}
        </div>
        <div
          className={
            this.state.resultOptionsPage === RESULT_OPTIONS_DEFAULT
              ? this.props.classes.classes.buttonRow
              : this.props.classes.classes.buttonRowExtra
          }
        >
          {elems.slice(elems.length / 2, elems.length)}
        </div>
      </div>
    );
  }

  renderField(imageSrcForCurrentPa) {
    // Update base coordinates (so they are correct when the image is re-sized)
    const adjBaseCoordinates = JSON.parse(JSON.stringify(BASE_COORDINATES));
    for (const base in BASE_COORDINATES) {
      adjBaseCoordinates[base].left = Math.floor(
        normalize(
          BASE_COORDINATES[base].left,
          0,
          BALLFIELD_MAX_WIDTH,
          0,
          Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH)
        )
      );
      adjBaseCoordinates[base].top = Math.floor(
        normalize(
          BASE_COORDINATES[base].top,
          0,
          BALLFIELD_MAX_WIDTH,
          0,
          Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH)
        )
      );
    }

    const indicators: React.JSX.Element[] = [];

    // Add the indicators for all plate appearances for this player,
    // the current plate appearance will be displayed in a different color
    this.props.plateAppearances.forEach((value) => {
      let x = -1;
      let y = -1;
      let imageSrc = '/assets/baseball.svg';

      if (value.id === this.props.plateAppearance.id) {
        x = this.state.paLocationX;
        y = this.state.paLocationY;
        imageSrc = imageSrcForCurrentPa;
      } else {
        x = value.location ? value.location.x : null;
        y = value.location ? value.location.y : null;
      }

      const new_x = Math.floor(
        normalize(
          x,
          0,
          LOCATION_DENOMINATOR,
          0,
          Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH)
        )
      );
      const new_y = Math.floor(
        normalize(
          y,
          0,
          LOCATION_DENOMINATOR,
          0,
          Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH)
        )
      );

      if (value.location && x && y) {
        indicators.push(
          <img
            key={value.id}
            src={imageSrc}
            alt="previous result"
            style={{
              position: 'absolute',
              width: '20px',
              left: new_x + 'px',
              top: new_y + 'px',
            }}
          ></img>
        );
      }
    });

    const paId = this.props.plateAppearance.id;

    const isLastPAOfInning = getGlobalState().isLastPaOfInning(
      paId,
      this.props.origin,
      this.state.runners
    );
    const isPreviousPaTheFirstPAOfInning =
      this.props.previousPlateAppearance === undefined ||
      this.props.previousPlateAppearance === null
        ? true
        : getGlobalState().isLastPaOfInning(
            this.props.previousPlateAppearance.id,
            this.props.origin
          );

    // Determine runners object used to render
    const lastPaRunners = JSON.parse(
      JSON.stringify(this.props.previousPlateAppearance?.runners ?? {})
    );
    delete lastPaRunners['out'];
    delete lastPaRunners['scored'];

    const useLastPaRunners =
      Object.keys(this.state.runners).length === 0 &&
      !isPreviousPaTheFirstPAOfInning;

    const runners = useLastPaRunners ? lastPaRunners : this.state.runners;

    // Create a list of runner draggable
    const OLD_RUNNERS_OPACITY = '.3';
    const NEW_RUNNERS_OPACITY = '1';
    const runnerDraggables: React.JSX.Element[] = [];
    if (runners['1B'] !== undefined) {
      const coords = adjBaseCoordinates['1B'];
      runnerDraggables.push(
        this.getRunnerDraggable(
          runners['1B'],
          coords.left,
          coords.top,
          useLastPaRunners,
          adjBaseCoordinates,
          useLastPaRunners ? OLD_RUNNERS_OPACITY : NEW_RUNNERS_OPACITY
        )
      );
    }
    if (runners['2B'] !== undefined) {
      const coords = adjBaseCoordinates['2B'];
      runnerDraggables.push(
        this.getRunnerDraggable(
          runners['2B'],
          coords.left,
          coords.top,
          useLastPaRunners,
          adjBaseCoordinates,
          useLastPaRunners ? OLD_RUNNERS_OPACITY : NEW_RUNNERS_OPACITY
        )
      );
    }
    if (runners['3B'] !== undefined) {
      const coords = adjBaseCoordinates['3B'];
      runnerDraggables.push(
        this.getRunnerDraggable(
          runners['3B'],
          coords.left,
          coords.top,
          useLastPaRunners,
          adjBaseCoordinates,
          useLastPaRunners ? OLD_RUNNERS_OPACITY : NEW_RUNNERS_OPACITY
        )
      );
    }

    const STACK_OFFSET_X = -3;
    const STACK_OFFSET_Y = 9;

    if (runners['scored'] !== undefined) {
      const coords = adjBaseCoordinates['scored'];
      for (let i = 0; i < runners['scored'].length; i++) {
        runnerDraggables.push(
          this.getRunnerDraggable(
            runners['scored'][i],
            coords.left + STACK_OFFSET_X * i,
            coords.top + STACK_OFFSET_Y * i,
            i === runners['scored'].length - 1 ? useLastPaRunners : true,
            adjBaseCoordinates,
            useLastPaRunners ? OLD_RUNNERS_OPACITY : NEW_RUNNERS_OPACITY
          )
        );
      }
    }

    if (runners['out'] !== undefined) {
      const coords = adjBaseCoordinates['out'];
      for (let i = 0; i < runners['out'].length; i++) {
        runnerDraggables.push(
          this.getRunnerDraggable(
            runners['out'][i],
            coords.left + STACK_OFFSET_X * i + 20,
            coords.top + STACK_OFFSET_Y * i + 60,
            i === runners['out'].length - 1 ? useLastPaRunners : true,
            adjBaseCoordinates,
            useLastPaRunners ? OLD_RUNNERS_OPACITY : NEW_RUNNERS_OPACITY
          )
        );
      }
    }

    const runnerObjects = (
      <div>
        {runnerDraggables}
        <div
          ref={this.baseRefs['1B']}
          style={{
            top: `${adjBaseCoordinates['1B'].top}px`,
            left: `${adjBaseCoordinates['1B'].left}px`,
            marginLeft: -PLAYER_LOCATION_SIZE / 2,
            marginTop: -PLAYER_LOCATION_SIZE / 2,
            width: PLAYER_LOCATION_SIZE,
            height: PLAYER_LOCATION_SIZE,
          }}
          id="1B"
          className="player-location gone"
        >
          <div style={{ marginTop: '13px', marginLeft: '13px' }}>1B</div>
        </div>
        <div
          ref={this.baseRefs['2B']}
          style={{
            top: `${adjBaseCoordinates['2B'].top}px`,
            left: `${adjBaseCoordinates['2B'].left}px`,
            marginLeft: -PLAYER_LOCATION_SIZE / 2,
            marginTop: -PLAYER_LOCATION_SIZE / 2,
            width: PLAYER_LOCATION_SIZE,
            height: PLAYER_LOCATION_SIZE,
          }}
          id="2B"
          className="player-location gone"
        >
          <div style={{ marginTop: '13px', marginLeft: '13px' }}>2B</div>
        </div>
        <div
          ref={this.baseRefs['3B']}
          style={{
            top: `${adjBaseCoordinates['3B'].top}px`,
            left: `${adjBaseCoordinates['3B'].left}px`,
            marginLeft: -PLAYER_LOCATION_SIZE / 2,
            marginTop: -PLAYER_LOCATION_SIZE / 2,
            width: PLAYER_LOCATION_SIZE,
            height: PLAYER_LOCATION_SIZE,
          }}
          id="3B"
          className="player-location gone"
        >
          <div style={{ marginTop: '13px', marginLeft: '13px' }}>3B</div>
        </div>
        <div
          ref={this.baseRefs['scored']}
          style={{
            top: `${adjBaseCoordinates['scored'].top}px`,
            left: `${adjBaseCoordinates['scored'].left}px`,
            marginLeft: -PLAYER_LOCATION_SIZE / 2,
            marginTop: -PLAYER_LOCATION_SIZE / 2,
            width: PLAYER_LOCATION_SIZE,
            height: PLAYER_LOCATION_SIZE,
          }}
          id="scored"
          className="player-location gone"
        >
          <div
            style={{ marginTop: '14px', marginLeft: '12px', fontSize: '13px' }}
          >
            Run
          </div>
        </div>
        <div
          ref={this.baseRefs['out']}
          style={{
            top: `${adjBaseCoordinates['out'].top}px`,
            left: `${adjBaseCoordinates['out'].left}px`,
            marginLeft: -PLAYER_LOCATION_SIZE / 2,
            marginTop: -PLAYER_LOCATION_SIZE / 2,
            width: PLAYER_LOCATION_SIZE,
            height: PLAYER_LOCATION_SIZE,
          }}
          id="out"
          className="player-location gone"
        >
          <div
            style={{ marginTop: '16px', marginLeft: '13px', fontSize: '13px' }}
          >
            Out
          </div>
        </div>
      </div>
    );

    return (
      <>
        <div
          id="game-numbers"
          style={{
            position: 'relative',
            borderTop: '1px solid white',
            borderBottom: '1px solid white',
            width: Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH) + 'px',
            overflow: 'hidden',
          }}
        >
          <ScoreInfo
            paId={paId}
            plateAppearance={this.props.plateAppearance}
            runners={this.state.runners}
            origin={this.props.origin}
          />
        </div>
        <div
          id="ballfield"
          style={{
            position: 'relative',
            borderTop: '1px solid white',
            borderBottom: '1px solid white',
            width: Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH) + 'px',
            height: Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH) + 'px',
            overflow: 'hidden',
          }}
        >
          {/* Caution: Rendering anything above BallFieldSvg in this div might mess up spray chart y locations */}
          {runnerObjects}
          <BallFieldSvg />
          {indicators}
        </div>
      </>
    );
  }

  renderBaseball(imageSrcForCurrentPa) {
    return (
      <Draggable
        key="baseball"
        axis="both"
        allowAnyClick={true}
        position={{ x: 0, y: 0 }}
        grid={[1, 1]}
        onStart={this.handleDragStart}
        onStop={this.handleDragStop}
      >
        <img
          id="baseball"
          draggable={false}
          src={imageSrcForCurrentPa}
          alt="ball"
          className="plate-appearance-baseball"
          style={{
            touchAction: 'none',
            transform: 'translate(0px, 0px)',
            filter: `drop-shadow(rgba(0, 0, 0, 0.95) 0px 0px 8px)`,
          }}
        ></img>
      </Draggable>
    );
  }

  renderActionsButtons() {
    const buttons: React.JSX.Element[] = [];
    const confirm = (
      <img
        id="pa-confirm"
        key="confirm"
        src="/assets/check.svg"
        alt="confirm"
        className="plate-appearance-card-actions"
        onClick={this.handleConfirmClick}
      ></img>
    );
    buttons.push(confirm);

    const cancel = (
      <img
        id="pa-cancel"
        key="cancel"
        src="/assets/cancel.svg"
        alt="cancel"
        className="plate-appearance-card-actions"
        onClick={this.handleCancelClick}
      ></img>
    );
    buttons.push(cancel);

    if (!this.props.isNew) {
      const trash = (
        <img
          id="pa-delete"
          key="delete"
          src="/assets/delete.svg"
          alt="delete"
          className="plate-appearance-card-actions"
          onClick={this.handleDeleteClick}
        ></img>
      );
      buttons.push(trash);
    }

    return (
      <div
        id="options-buttons"
        style={{
          position: 'relative',
          display: 'flex',
          overflow: 'hidden',
        }}
      >
        {buttons}
      </div>
    );
  }

  renderWalkupSong() {
    const noSongClickHandler = () => {
      setRoute(`/players/${this.props.player.id}/edit`);
    };
    return (
      <WalkupSong
        songLink={this.props.player.songLink}
        songStart={this.props.player.songStart}
        noSongClickHandler={noSongClickHandler}
        width={48}
        height={48}
      ></WalkupSong>
    );
  }

  render() {
    const imageSrcForCurrentPa = results
      .getNoHitResults()
      .includes(this.state.paResult)
      ? '/assets/baseball-out.svg'
      : '/assets/baseball-hit.svg';

    return (
      <Card
        title={this.props.player.name}
        enableLeftHeader={true}
        enableRightHeader={true}
        leftHeaderProps={{
          onClick: this.homeOrBack,
        }}
        rightHeaderProps={{
          onClick: this.homeOrBack,
        }}
      >
        <div
          style={{
            maxWidth: BALLFIELD_MAX_WIDTH + 'px',
            backgroundColor: 'unset',
            background: 'unset',
            boxShadow: 'unset',
            margin: '0 auto',
          }}
        >
          {this.renderButtonList()}
          {this.renderField(imageSrcForCurrentPa)}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ paddingLeft: '18px' }}>
              {this.renderBaseball(imageSrcForCurrentPa)}
            </div>
            {this.renderActionsButtons()}
            <div style={{ paddingRight: '24px' }}>
              {this.renderWalkupSong()}
            </div>
          </div>
        </div>
      </Card>
    );
  }
}

const CardPlateAppearanceWrapper = (props) => {
  const classes = useStyles();
  return <CardPlateAppearance {...props} classes={classes} />;
};

type ScoreInfoProps = {
  paId: string;
  plateAppearance: PlateAppearance;
  runners: PlateAppearance['runners'];
  origin: string;
};

const ScoreInfo = (props: ScoreInfoProps) => {
  const { paId, plateAppearance, runners, origin } = props;

  const getScoreData = useCallback(() => {
    const runsFromThisSavedPa = plateAppearance.runners?.scored?.length ?? 0;
    const runsFromState = runners?.scored?.length ?? 0;
    const runsFromGame = getGlobalState().getUsScoreAtPa(paId, origin);
    const scoreUsAtPa = runsFromGame - runsFromThisSavedPa + runsFromState;

    const scoreThemAtPa = getGlobalState().getOverrideRunsAtPa(
      paId,
      origin
    ).them;

    const outsFromGame = getGlobalState().getOutsAtPa(paId, origin);
    const outsFromThisSavedPa = plateAppearance.runners?.out?.length ?? 0;
    const outsFromState = runners?.out?.length ?? 0;
    const outsAtPa = outsFromGame - outsFromThisSavedPa + outsFromState;

    const isLastPAOfInning = getGlobalState().isLastPaOfInning(paId, origin);
    const inning = Math.floor(outsAtPa / 3) + 1 - (isLastPAOfInning ? 1 : 0);
    const outsInInning = isLastPAOfInning ? 3 : outsAtPa % 3;

    return {
      scoreUsAtPa,
      scoreThemAtPa,
      outsAtPa,
      inning,
      outsInInning,
    };
  }, [paId, plateAppearance.runners, runners, origin]);

  if (origin === 'optimization') {
    return null;
  }

  const scoreData = getScoreData();

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-evenly',
        position: 'relative',
        height: '19px',
      }}
    >
      <div>Score: {`${scoreData.scoreUsAtPa}-${scoreData.scoreThemAtPa}`}</div>
      <div>Inning: {scoreData.inning}</div>
      <div>Outs: {scoreData.outsInInning}</div>
    </div>
  );
};

export default CardPlateAppearanceWrapper;
