"use strict";

const React = require("react");
const expose = require("./expose");
const DOM = require("react-dom-factories");
const dialog = require("dialog");
const Draggable = require("react-draggable");

const css = require("css");
const state = require("state");

// Enum for player tile render options
const FULL_EDIT = "fullEdit";
const PARTIAL_EDIT = "partialEdit";
const NO_EDIT = "noEdit";

const SIMULATION_TEXT = "Estimating Lineup Score...";
const PLAYER_TILE_HEIGHT = 43;

module.exports = class CardLineup extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.locked =
      this.locked || this.props.game.plateAppearances.length > 0 ? true : false;

    const hideHighlights = () => {
      let highlights = document.getElementsByClassName("highlight");
      for (let i = 0; i < highlights.length; i++) {
        highlights[i].style.visibility = "hidden";
      }
    };

    const showHighlight = i => {
      let elem = document.getElementById("highlight" + i);
      if (elem) {
        elem.style.visibility = "visible";
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
      expose.set_state("main", {
        page: `/teams/${this.props.team.id}/games/${this.props.game.id}/player-selection`
      });
    }.bind(this);

    this.handleBoxClick = function(plateAppearanceId) {
      expose.set_state("main", {
        page: `/teams/${this.props.team.id}/games/${this.props.game.id}/lineup/plateAppearances/${plateAppearanceId}`,
        isNew: false
      });
    }.bind(this);

    this.handleNewPlateAppearanceClick = function(player, game_id, team_id) {
      let plateAppearance = state.addPlateAppearance(
        player.id,
        game_id,
        team_id
      );
      expose.set_state("main", {
        page: `/teams/${this.props.team.id}/games/${this.props.game.id}/lineup/plateAppearances/${plateAppearance.id}`,
        isNew: true
      });
    }.bind(this);

    this.handleDragStart = function(player) {
      this.setState({
        dragging: true
      });
      let elem = document.getElementById("lineup_" + player.id);
      elem.style["z-index"] = 100;
      elem.style.position = "absolute";
      document.getElementById("lineup-padding").style.display = "block";
    };

    this.handleDragStop = function(player, index) {
      this.setState({
        dragging: false
      });
      hideHighlights();
      let elem = document.getElementById("lineup_" + player.id);
      elem.style["z-index"] = 1;
      elem.style.position = null;
      document.getElementById("lineup-padding").style.display = "none";
      const { new_position_index } = getInds(elem, index);
      state.updateLineup(this.props.game.lineup, player.id, new_position_index);

      this.simulateLineup();
    };

    this.handleDrag = function(player, index) {
      hideHighlights();
      const elem = document.getElementById("lineup_" + player.id);
      const { highlight_index } = getInds(elem, index);
      showHighlight(highlight_index);
    };

    this.handleLockToggle = function() {
      let lockButton = document.getElementById("lock");
      this.locked = !this.locked;
      lockButton.textContent = this.getUiTextForLockButton();
      expose.set_state("main", {
        render: true
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
    // Stop existing web workers
    if (this.simWorker) {
      this.simWorker.terminate();
    }
    this.simWorker = new Worker("/server/simulation-worker");
    this.simWorker.onmessage = function(e) {
      let data = JSON.parse(e.data);
      let elem = document.getElementById("score-text");
      elem.innerHTML = `Estimated Score: ${data.score.toFixed(3)} runs (took ${
        data.time
      }ms)`;

      let scoreSpinner = document.getElementById("score-spinner");
      scoreSpinner.style.visibility = "hidden";
    };

    // Tell web worker to start computing lineup estimated score
    let scoreSpinner = document.getElementById("score-spinner");
    scoreSpinner.style.visibility = "unset";

    let simulatedScoreDiv = document.getElementById("score-text");
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
      return "Unlock";
    } else {
      return "Lock";
    }
  }

  disableTouchAction() {
    Array.prototype.forEach.call(
      document.getElementsByClassName("lineup-row"),
      elem => {
        elem.style["touch-action"] = "none";
      }
    );
  }

  enableTouchAction() {
    Array.prototype.forEach.call(
      document.getElementsByClassName("lineup-row"),
      elem => {
        elem.style["touch-action"] = null;
      }
    );
  }

  componentDidMount() {
    this.simulateLineup();
    window.document.body.addEventListener(
      "touchmove",
      this.handlePreventTouchmoveWhenDragging.bind(this),
      {
        passive: false
      }
    );
  }

  componentWillUnmount() {
    this.simWorker.terminate();
    window.document.body.removeEventListener(
      "touchmove",
      this.handlePreventTouchmoveWhenDragging.bind(this),
      {
        passive: false
      }
    );
  }

  renderPlateAppearanceBoxes(player, plateAppearances, editable) {
    let pas = plateAppearances.map((pa, i) => {
      pa = pa || {};
      return DOM.div(
        {
          key: "box" + i,
          onClick: this.handleBoxClick.bind(this, pa.id),
          className: "lineup-box"
        },
        DOM.div({}, pa.result || "")
      );
    });

    if (editable === FULL_EDIT || editable === PARTIAL_EDIT) {
      pas = pas.concat([
        DOM.div(
          {
            key: "newPa" + player.id,
            onClick: this.handleNewPlateAppearanceClick.bind(
              this,
              player,
              this.props.game.id,
              this.props.team.id
            ),
            className: "lineup-box"
          },
          DOM.div(
            {
              style: {
                backgroundColor: "#DDD"
              }
            },
            "+"
          )
        )
      ]);
    }

    return DOM.div(
      {
        className: "plate-appearance-list"
      },
      pas
    );
  }

  renderLineupScore() {
    return DOM.div(
      {
        id: "score",
        key: "score",
        className: "lineup-score"
      },
      DOM.img({
        id: "score-spinner",
        src: "/server/assets/spinner.gif",
        style: {
          visibility: "unset"
        }
      }),
      DOM.div(
        {
          id: "score-text",
          className: "lineup-score-text"
        },
        SIMULATION_TEXT
      )
    );
  }

  renderLineupPlayerList() {
    if (!this.props.game || !this.props.team) {
      console.log(
        "game:",
        this.props.game,
        "team:",
        this.props.team,
        "lineup:",
        !this.props.game.lineup
      );
      return DOM.div(
        { className: "page-error" },
        "Lineup: No game, team, or lineup exist."
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
              key: "highlight" + i,
              id: "highlight" + i,
              className: "highlight",
              style: {
                visibility: "hidden"
              }
            })
          );
          acc.push(next);
          return acc;
        }, [])
    );

    pageElems.push(
      DOM.div({
        id: "highlight" + this.props.game.lineup.length,
        key: "highlight" + this.props.game.lineup.length,
        className: "highlight",
        style: {
          visibility: "hidden"
        }
      })
    );

    pageElems.push(
      DOM.div(
        {
          key: "newplayer",
          className: "list-item add-list-item",
          onClick: this.handleCreateClick
        },
        "+ Add Player"
      )
    );

    pageElems.push(
      DOM.div(
        {
          id: "lock",
          key: "lock",
          className: "list-item add-list-item",
          onClick: this.handleLockToggle
        },
        this.getUiTextForLockButton()
      )
    );

    pageElems.unshift(
      DOM.div({
        key: "lineup-padding",
        id: "lineup-padding",
        style: {
          display: "none",
          height: "4px"
        }
      })
    );

    return DOM.div({}, pageElems);
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
              textAlign: "center",
              fontSize: "21px"
            }
          },
          "Players with plate appearances who are not in the lineup"
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
            key: "handle",
            className: "player-drag-handle"
          },
          DOM.img({
            src: "/server/assets/drag-handle.png",
            style: {
              height: "24px"
            }
          })
        )
      );
    }
    elems.push(
      DOM.div(
        {
          key: "name",
          className: "player-name prevent-overflow"
        },
        player.name
      )
    );
    elems.push(
      DOM.div(
        {
          key: "boxes",
          className: "plate-appearance-list-container"
        },
        this.renderPlateAppearanceBoxes(player, plateAppearances, editable)
      )
    );

    if (editable === FULL_EDIT) {
      elems.push(
        DOM.img({
          key: "del",
          src: "/server/assets/remove.svg",
          className: "lineup-row-button",
          style: {
            paddingTop: "20px",
            paddingBottom: "20px",
            marginLeft: "0",
            marginRight: "-8px"
          },
          onClick: this.handleRemoveClick.bind(this, player)
        })
      );
    }

    if (editable === FULL_EDIT) {
      return React.createElement(
        Draggable,
        {
          key: "lineup-draggable" + player.id,
          axis: "y",
          handle: ".player-drag-handle",
          //defaultPosition: { x: 0, y: 0 },
          position: { x: 0, y: 0 },
          grid: [1, 1],
          onStart: this.handleDragStart.bind(this, player),
          onStop: this.handleDragStop.bind(this, player, index),
          onDrag: this.handleDrag.bind(this, player, index)
        },
        DOM.div(
          {
            key: "lineup_" + player.id,
            id: "lineup_" + player.id,
            className: "lineup-row"
          },
          elems
        )
      );
    } else {
      return DOM.div(
        {
          id: "lineup_" + player.id,
          key: "lineup_" + player.id,
          className: "lineup-row"
        },
        elems
      );
    }
  }

  render() {
    return DOM.div(
      {
        className: "card",
        style: {
          marginTop: "10px"
        }
      },
      DOM.div(
        {
          className: "card-body"
        },
        this.renderLineupScore(),
        this.renderLineupPlayerList(),
        this.renderNonLineupAtBats()
      )
    );
  }
};
