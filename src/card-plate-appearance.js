"use strict";

const DOM = require("react-dom-factories");
const Draggable = require("react-draggable");
const React = require("react");

const css = require("css");
const dialog = require("dialog");
const expose = require("./expose");
const results = require("plate-appearance-results");
const state = require("state");

const LeftHeaderButton = require("component-left-header-button");
const RightHeaderButton = require("component-right-header-button");
const WalkupSong = require("component-walkup-song");

const LOCATION_DENOMINATOR = 32767;

const BALLFIELD_MAX_WIDTH = 500;

const normalize = function(x, A, B, C, D) {
  return C + ((x - A) * (D - C)) / (B - A);
};

module.exports = class CardPlateAppearance extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {
      paResult: props.plateAppearance.result,
      paLocationX: props.plateAppearance.location
        ? props.plateAppearance.location.x
        : null,
      paLocationY: props.plateAppearance.location
        ? props.plateAppearance.location.y
        : null
    };

    this.isNew = props.isNew;

    let buildPlateAppearance = function() {
      let pa = JSON.parse(JSON.stringify(props.plateAppearance));
      pa.result = this.state.paResult;
      pa.location = {};
      pa.location.x = this.state.paLocationX;
      pa.location.y = this.state.paLocationY;
      return pa;
    }.bind(this);

    this.homeOrBack = function() {
      let newPa = buildPlateAppearance();
      if (
        props.isNew &&
        JSON.stringify(newPa) === JSON.stringify(props.plateAppearance)
      ) {
        // TODO: this re-renders the page (since it no longer exists an error gets logged) then goes back immidataly. This should be cleaned up after we figure out out back button phylsophy
        // This problem also exists on other pages (teams, games, players) but it happens silently so we don't notice
        state.removePlateAppearance(props.plateAppearance.id, props.game.id);
      } else {
        state.replacePlateAppearance(
          props.plateAppearance.id,
          props.game.id,
          props.team.id,
          newPa
        );
      }
    };

    this.handleConfirmClick = function() {
      state.replacePlateAppearance(
        props.plateAppearance.id,
        props.game.id,
        props.team.id,
        buildPlateAppearance()
      );
      history.back();
    };

    this.handleCancelClick = function() {
      if (props.isNew) {
        state.removePlateAppearance(props.plateAppearance.id, props.game.id);
      }
      history.back();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        "Are you sure you want to delete this plate appearance?",
        () => {
          state.removePlateAppearance(props.plateAppearance.id, props.game.id);
          history.back();
        }
      );
    };

    this.handleButtonClick = function(result) {
      this.setState({
        paResult: result
      });
    };

    this.handleDragStart = function(ev) {
      var element = document.getElementById("baseball");
      element.classList.remove("pulse-animation");
      this.setState({
        dragging: true
      });
    };

    this.handleDragStop = function() {
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
          paLocationY: new_y
        });
      }, 1);
    };

    // Prevent ios from scrolling while dragging
    this.handlePreventTouchmoveWhenDragging = function(event) {
      if (this.state.dragging) {
        event.preventDefault();
      }
    };
  }

  componentDidMount() {
    window.document.body.addEventListener(
      "touchmove",
      this.handlePreventTouchmoveWhenDragging.bind(this),
      {
        passive: false
      }
    );

    this.onmouseup = ev => {
      let ballfield = document.getElementById("ballfield");

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

      // Draging the ball 20px below cancels the location
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

    window.addEventListener("mouseup", this.onmouseup);
    window.addEventListener("touchend", this.onmouseup);

    // TODO: only apply this if there is no hit
    var element = document.getElementById("baseball");
    element.classList.add("pulse-animation");
  }

  componentWillUnmount() {
    window.document.body.removeEventListener(
      "touchmove",
      this.handlePreventTouchmoveWhenDragging.bind(this),
      {
        passive: false
      }
    );

    window.removeEventListener("mouseup", this.onmouseup);
    window.removeEventListener("touchend", this.onmouseup);
  }

  renderButtonList() {
    if (
      !this.props.game ||
      !this.props.team ||
      !this.props.player ||
      !this.props.plateAppearance
    ) {
      return DOM.div(
        { className: "page-error" },
        "PlateAppearance: No game or team or player or PlateAppearance exists."
      );
    }

    let elems = results.getAllResults().map((result, i) => {
      return DOM.div(
        {
          key: i + " " + result,
          className: "result-button",
          onClick: this.handleButtonClick.bind(this, result),
          style: {
            backgroundColor:
              this.state.paResult === result ? css.colors.SECONDARY : null
          }
        },
        result
      );
    });

    return DOM.div(
      {},
      DOM.div(
        {
          style: {
            display: "flex",
            justifyContent: "space-around",
            margin: "4px"
          }
        },
        elems.slice(0, elems.length / 2)
      ),
      DOM.div(
        {
          style: {
            display: "flex",
            justifyContent: "space-around",
            margin: "4px"
          }
        },
        elems.slice(elems.length / 2, elems.length)
      )
    );
  }

  renderField(imageSrcForCurrentPa) {
    let indicators = [];

    // Add the indicators for all plate appearances for this player, the current plate appearance will be displayed in a different color
    this.props.plateAppearances.forEach(value => {
      let x = -1;
      let y = -1;
      let imageSrc = "/server/assets/baseball.svg";

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
          DOM.img({
            key: value.id,
            src: imageSrc,
            alt: "previous result",
            style: {
              position: "absolute",
              width: "20px",
              left: new_x + "px",
              top: new_y + "px"
            }
          })
        );
      }
    });

    return DOM.div(
      {
        id: "ballfield",
        style: {
          position: "relative",
          borderTop: "1px solid white",
          borderBottom: "1px solid white",
          width: Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH) + "px",
          height: Math.min(window.innerWidth, BALLFIELD_MAX_WIDTH) + "px",
          overflow: "hidden"
        }
      },
      DOM.img({
        draggable: true,
        src: "/server/assets/ballfield2.png",
        alt: "ballfield",
        style: {
          width: "100%"
        }
      }),
      indicators
    );
  }

  renderBaseball(imageSrcForCurrentPa) {
    return React.createElement(
      Draggable,
      {
        key: "baseball",
        axis: "both",
        allowAnyClick: true,
        position: { x: 0, y: 0 },
        grid: [1, 1],
        onStart: this.handleDragStart.bind(this),
        onStop: this.handleDragStop.bind(this)
      },
      DOM.img({
        id: "baseball",
        draggable: false,
        src: imageSrcForCurrentPa,
        alt: "ball",
        className: "plate-appearance-baseball",
        style: {
          touchAction: "none",
          transform: "translate(0px, 0px)"
        }
      })
    );
  }

  renderActionsButtons() {
    let buttons = [];
    let confirm = DOM.img({
      key: "confirm",
      src: "/server/assets/check.svg",
      onClick: this.handleConfirmClick,
      alt: "confirm",
      className: "plate-appearance-card-actions"
    });
    buttons.push(confirm);

    let cancel = DOM.img({
      key: "cancel",
      src: "/server/assets/cancel.svg",
      onClick: this.handleCancelClick,
      alt: "cancel",
      className: "plate-appearance-card-actions"
    });
    buttons.push(cancel);

    if (!this.props.isNew) {
      let trash = DOM.img({
        key: "delete",
        src: "/server/assets/delete.svg",
        onClick: this.handleDeleteClick,
        alt: "delete",
        className: "plate-appearance-card-actions"
      });
      buttons.push(trash);
    }

    return DOM.div(
      {
        id: "options-buttons",
        style: {
          position: "relative",
          display: "flex",
          overflow: "hidden"
        }
      },
      buttons
    );
  }

  renderWalkupSong() {
    return React.createElement(WalkupSong, {
      songLink: this.props.player.song_link,
      songStart: this.props.player.song_start,
      width: 48,
      height: 48
    });
  }

  render() {
    let imageSrcForCurrentPa = results
      .getNoHitResults()
      .includes(this.state.paResult)
      ? "/server/assets/baseball-out.svg"
      : "/server/assets/baseball-hit.svg";
    return DOM.div(
      {
        className: "card",
        style: {
          position: "relative"
        }
      },
      DOM.div(
        {
          className: "card-title",
          style: {}
        },
        React.createElement(LeftHeaderButton, {
          onPress: this.homeOrBack
        }),
        DOM.div(
          {
            className: "prevent-overflow card-title-text-with-arrow"
          },
          this.props.player.name
        ),
        React.createElement(RightHeaderButton, {
          onPress: this.homeOrBack
        })
      ),
      DOM.div(
        {
          className: "card-body",
          style: {
            maxWidth: BALLFIELD_MAX_WIDTH + "px"
          }
        },

        this.renderButtonList(),
        this.renderField(imageSrcForCurrentPa),
        DOM.div(
          {
            style: {
              display: "flex",
              justifyContent: "space-between"
            }
          },
          DOM.div(
            {
              style: {
                paddingLeft: "24px"
              }
            },
            this.renderBaseball(imageSrcForCurrentPa)
          ),
          this.renderActionsButtons(),
          DOM.div(
            {
              style: {
                paddingRight: "24px"
              }
            },
            this.renderWalkupSong()
          )
        )
      )
    );
  }
};
