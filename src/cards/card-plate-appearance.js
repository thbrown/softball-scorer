import React from 'react';
import dialog from 'dialog';
import Draggable from 'react-draggable';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import results from 'plate-appearance-results';
import state from 'state';
import WalkupSong from 'component-walkup-song';
import { normalize, distance } from 'utils/functions';
import { goBack } from 'actions/route';
import { makeStyles } from 'css/helpers';
import css from 'css';

const LOCATION_DENOMINATOR = 32767;

const BALLFIELD_MAX_WIDTH = 500;

const PLAYER_LOCATION_SIZE = 48;

const useStyles = makeStyles((theme) => ({
  buttonRow: {
    display: 'flex',
    justifyContent: 'space-around',
    margin: '4px',
  },
  button: {
    cursor: 'default',
    padding: '12px',
    color: theme.colors.TEXT_DARK,
    border: `2px solid ${theme.colors.SECONDARY}`,
    borderRadius: '4px',
    textAlign: 'center',
    fontSize: '18px',
    width: '48px',
    margin: '2px',
    [`@media (max-width:${theme.breakpoints.sm})`]: {
      fontSize: '16px',
      padding: '6px',
      margin: '0px',
    },
  },
  buttonSelected: {
    color: theme.colors.TEXT_LIGHT,
    backgroundColor: theme.colors.SECONDARY,
  },
}));

// Locations of the bases (from the upper left of teh image in px) while the image is full sized
const BASE_COORDINATES = {
  '1B': { top: 375, left: 352 },
  '2B': { top: 277, left: 246 },
  '3B': { top: 375, left: 145 },
  Scored: { top: 473, left: 247 },
  Out: { top: 410, left: 55 },
};

class CardPlateAppearance extends React.Component {
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
    };

    this.isNew = props.isNew;

    const buildPlateAppearance = () => {
      const pa = JSON.parse(JSON.stringify(props.plateAppearance));
      pa.result = this.state.paResult;
      pa.location = {};
      pa.location.x = this.state.paLocationX;
      pa.location.y = this.state.paLocationY;
      return pa;
    };

    this.homeOrBack = function () {
      const newPa = buildPlateAppearance();
      if (
        props.isNew &&
        JSON.stringify(newPa) === JSON.stringify(props.plateAppearance)
      ) {
        // TODO: this re-renders the page (since it no longer exists an error gets logged)
        // then goes back immediately. This should be cleaned up after we figure out out
        // back button philosophy. This problem also exists on other pages
        // (teams, games, players) but it happens silently so we don't notice
        this.props.remove();
      } else {
        this.props.replace(newPa);
      }
    }.bind(this);

    this.handleConfirmClick = () => {
      const newPa = buildPlateAppearance();
      this.props.replace(newPa);
      goBack();
    };

    this.handleCancelClick = function () {
      goBack();
      if (props.isNew) {
        this.props.remove();
      }
    }.bind(this);

    this.handleDeleteClick = function () {
      dialog.show_confirm(
        'Are you sure you want to delete this plate appearance?',
        () => {
          goBack();
          this.props.remove();
        }
      );
    }.bind(this);

    this.handleButtonClick = function (result) {
      this.setState({
        paResult: result,
      });
    };

    this.handleToggleResultOptions = function () {
      let update = this.state.resultOptionsPage === 0 ? 1 : 0;
      this.setState({
        resultOptionsPage: update,
      });
    };

    this.handleDragStart = function (ev) {
      var element = document.getElementById('baseball');
      element.classList.remove('pulse-animation');
      this.setState({
        dragging: true,
      });
    };

    this.handleDragStop = function () {
      // lame way to make this run after the mouseup event
      setTimeout(() => {
        let new_x = Math.floor(
          ((this.mx - 10) / Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH)) *
            LOCATION_DENOMINATOR
        );
        let new_y = Math.floor(
          ((this.my - 10) / Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH)) *
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
    this.handlePreventTouchmoveWhenDragging = function (event) {
      if (this.state.dragging) {
        event.preventDefault();
      }
    };

    this.baseRefs = {
      '1B': React.createRef(),
      '2B': React.createRef(),
      '3B': React.createRef(),
      Scored: React.createRef(),
      Out: React.createRef(),
    };

    this.getClosestBase = function (xCoord, yCoord, adjBaseCoordinates) {
      let candidates = {
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
        Scored: {
          dist: distance(
            xCoord,
            yCoord,
            adjBaseCoordinates['Scored'].left,
            adjBaseCoordinates['Scored'].top
          ),
          ref: this.baseRefs['Scored'],
        },
        Out: {
          dist: distance(
            xCoord,
            yCoord,
            adjBaseCoordinates['Out'].left,
            adjBaseCoordinates['Out'].top
          ),
          ref: this.baseRefs['Out'],
        },
      };

      // Return the first one
      let minEntry = { dist: 999999999 };
      for (let entry in candidates) {
        if (candidates[entry].dist < minEntry.dist) {
          minEntry = candidates[entry];
        }
      }
      return minEntry.ref;
    };

    this.onPlayerDrag = function (
      adjustedBaseCoords,
      mouseEvent,
      draggableData
    ) {
      // Un-highlight all base locations
      for (let entry in this.baseRefs) {
        this.baseRefs[entry].current.classList.remove(
          'player-location-highlight'
        );
      }

      // Highlight the closest base location
      let ref = this.getClosestBase(
        draggableData.x,
        draggableData.y,
        adjustedBaseCoords
      );
      ref.current.classList.add('player-location-highlight');
    }.bind(this);
  }

  componentDidMount() {
    window.document.body.addEventListener(
      'touchmove',
      this.handlePreventTouchmoveWhenDragging.bind(this),
      {
        passive: false,
      }
    );

    this.onmouseup = (ev) => {
      let ballfield = document.getElementById('ballfield');

      if (ev.changedTouches) {
        this.mx = ev.changedTouches[0].pageX - ballfield.offsetLeft;
        this.my =
          ev.changedTouches[0].pageY -
          ballfield.offsetTop -
          48; /* headerSize */
      } else {
        this.mx = ev.clientX - ballfield.offsetLeft;
        this.my = ev.clientY - ballfield.offsetTop - 48; /* headerSize */
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

      if (this.mx > parseInt(ballfield.style.width)) {
        this.mx = parseInt(ballfield.style.width);
      }
    };

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
      this.handlePreventTouchmoveWhenDragging.bind(this),
      {
        passive: false,
      }
    );

    window.removeEventListener('mouseup', this.onmouseup);
    window.removeEventListener('touchend', this.onmouseup);
  }

  renderButtonList() {
    if (!this.props.player || !this.props.plateAppearance) {
      return (
        <div className="page-error">
          'PlateAppearance: No game or team or player or PlateAppearance
          exists.'
        </div>
      );
    }

    let visibleOptions =
      this.state.resultOptionsPage === 0
        ? results.getFirstPage()
        : results.getSecondPage();

    let elems = visibleOptions.map((result, i) => {
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
        onClick={this.handleToggleResultOptions.bind(this)}
      >
        <span className="no-select">...</span>
      </div>
    );

    return (
      <div>
        <div className={this.props.classes.classes.buttonRow}>
          {elems.slice(0, elems.length / 2)}
        </div>
        <div className={this.props.classes.classes.buttonRow}>
          {elems.slice(elems.length / 2, elems.length)}
        </div>
      </div>
    );
  }

  renderField(imageSrcForCurrentPa) {
    // Update base coordinates (so they are correct when the image is re-sized)
    let adjBaseCoordinates = JSON.parse(JSON.stringify(BASE_COORDINATES));
    for (let base in BASE_COORDINATES) {
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

    let indicators = [];

    // Add the indicators for all plate appearances for this player,
    // the current plate appearance will be displayed in a different color
    this.props.plateAppearances.forEach((value) => {
      let x = -1;
      let y = -1;
      let imageSrc = '/server/assets/baseball.svg';

      if (value.id === this.props.plateAppearance.id) {
        x = this.state.paLocationX;
        y = this.state.paLocationY;
        imageSrc = imageSrcForCurrentPa;
      } else {
        x = value.location ? value.location.x : null;
        y = value.location ? value.location.y : null;
      }

      let new_x = Math.floor(
        normalize(
          x,
          0,
          LOCATION_DENOMINATOR,
          0,
          Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH)
        )
      );
      let new_y = Math.floor(
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

    let runnerObjects = (
      <div>
        <Draggable
          //style={{ top: '-300px', left: '300px', position: 'absolute' }}
          onDrag={this.onPlayerDrag.bind(this, adjBaseCoordinates)}
        >
          <div
            style={{
              position: 'absolute',
              color: 'black',
              marginLeft: -64,
              marginTop: -50,
            }}
            className="triangle-border"
          >
            Lauren B
          </div>
        </Draggable>
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
          className="player-location"
        >
          <div>1B</div>
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
          className="player-location"
        >
          <div>2B</div>
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
          className="player-location"
        >
          <div>3B</div>
        </div>
        <div
          ref={this.baseRefs['Scored']}
          style={{
            top: `${adjBaseCoordinates['Scored'].top}px`,
            left: `${adjBaseCoordinates['Scored'].left}px`,
            marginLeft: -PLAYER_LOCATION_SIZE / 2,
            marginTop: -PLAYER_LOCATION_SIZE / 2,
            width: PLAYER_LOCATION_SIZE,
            height: PLAYER_LOCATION_SIZE,
          }}
          className="player-location"
        >
          <div>Scored</div>
        </div>
        <div
          ref={this.baseRefs['Out']}
          style={{
            top: `${adjBaseCoordinates['Out'].top}px`,
            left: `${adjBaseCoordinates['Out'].left}px`,
            marginLeft: -PLAYER_LOCATION_SIZE / 2,
            marginTop: -PLAYER_LOCATION_SIZE / 2,
            width: PLAYER_LOCATION_SIZE,
            height: PLAYER_LOCATION_SIZE,
          }}
          className="player-location"
        >
          <div>Out</div>
        </div>
      </div>
    );

    return (
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
        {runnerObjects}
        <img
          draggable={true}
          src="/server/assets/ballfield2.png"
          alt="ballfield"
          style={{
            width: '100%',
          }}
        ></img>
        {indicators}
      </div>
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
        onStart={this.handleDragStart.bind(this)}
        onStop={this.handleDragStop.bind(this)}
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
          }}
        ></img>
      </Draggable>
    );
  }

  renderActionsButtons() {
    let buttons = [];
    let confirm = (
      <img
        id="pa-confirm"
        key="confirm"
        src="/server/assets/check.svg"
        alt="confirm"
        className="plate-appearance-card-actions"
        onClick={this.handleConfirmClick}
      ></img>
    );
    buttons.push(confirm);

    let cancel = (
      <img
        id="pa-cancel"
        key="cancel"
        src="/server/assets/cancel.svg"
        alt="cancel"
        className="plate-appearance-card-actions"
        onClick={this.handleCancelClick}
      ></img>
    );
    buttons.push(cancel);

    if (!this.props.isNew) {
      let trash = (
        <img
          id="pa-delete"
          key="delete"
          src="/server/assets/delete.svg"
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
    return (
      <WalkupSong
        songLink={this.props.player.song_link}
        songStart={this.props.player.song_start}
        width={48}
        height={48}
      ></WalkupSong>
    );
  }

  render() {
    let imageSrcForCurrentPa = results
      .getNoHitResults()
      .includes(this.state.paResult)
      ? '/server/assets/baseball-out.svg'
      : '/server/assets/baseball-hit.svg';
    return (
      <div
        className="card"
        style={{
          position: 'relative',
        }}
      >
        <div className="card-title">
          <LeftHeaderButton onClick={this.homeOrBack}></LeftHeaderButton>
          <div className="prevent-overflow card-title-text-with-arrow">
            {this.props.player.name}
          </div>
          <RightHeaderButton onClick={this.homeOrBack}></RightHeaderButton>
        </div>
        <div
          className="card-body"
          style={{
            maxWidth: BALLFIELD_MAX_WIDTH + 'px',
          }}
        >
          {this.renderButtonList()}
          {this.renderField(imageSrcForCurrentPa)}
          <div
            style={{
              backgroundColor: css.colors.PRIMARY_LIGHT,
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <div
              style={{
                paddingRight: '24px',
              }}
            >
              {this.renderBaseball(imageSrcForCurrentPa)}
            </div>
            {this.renderActionsButtons()}
            <div
              style={{
                paddingRight: '24px',
              }}
            >
              {this.renderWalkupSong()}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

const CardPlateAppearanceWrapper = (props) => {
  const classes = useStyles();
  return <CardPlateAppearance {...props} classes={classes} />;
};

export default CardPlateAppearanceWrapper;
