"use strict";

const DOM = require("react-dom-factories");

const css = require("css");
const dialog = require("dialog");
const expose = require("./expose");
const state = require("state");

const RightHeaderButton = require("component-right-header-button");

module.exports = class CardPlayerList extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.handleBackClick = function() {
      history.back();
    };

    this.handlePlayerClick = function(player) {
      expose.set_state("main", {
        page: `/players/${player.id}`
      });
    };

    this.handleEditClick = function(player, ev) {
      expose.set_state("main", {
        page: `/players/${player.id}/edit`,
        isNew: false
      });
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      let player = state.addPlayer("", "M");
      expose.set_state("main", {
        page: `/players/${player.id}/edit`,
        isNew: true
      });
    };

    this.playerNameComparator = function(a, b) {
      if (a.name.toLowerCase() < b.name.toLowerCase()) {
        return -1;
      }
      if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1;
      }
      return 0;
    };
  }

  renderPlayerList() {
    const s = state.getLocalState();
    let elems = s.players
      .slice()
      .sort(this.playerNameComparator)
      .map(player => {
        return DOM.div(
          {
            player_id: player.id,
            key: "player" + player.id,
            className: "list-item",
            onClick: this.handlePlayerClick.bind(this, player),
            style: {
              display: "flex",
              justifyContent: "space-between"
            }
          },
          DOM.div(
            {
              className: "prevent-overflow"
            },
            player.name
          ),
          DOM.div(
            {
              style: {}
            },
            DOM.img({
              src: "/server/assets/edit.svg",
              alt: "edit",
              className: "list-button",
              onClick: this.handleEditClick.bind(this, player),
              alt: "edit"
            })
          )
        );
      });

    elems.push(
      DOM.div(
        {
          key: "newplayer",
          className: "list-item add-list-item",
          onClick: this.handleCreateClick
        },
        "+ Add New Player"
      )
    );

    return DOM.div({}, elems);
  }

  render() {
    return DOM.div(
      {
        className: "card",
        style: {}
      },
      DOM.div(
        {
          className: "card-title"
        },
        DOM.img({
          src: "/server/assets/back.svg",
          className: "back-arrow",
          onClick: this.handleBackClick,
          alt: "back"
        }),
        DOM.div(
          {
            className: "prevent-overflow card-title-text-with-arrow"
          },
          "Players"
        ),
        React.createElement(RightHeaderButton, {})
      ),
      this.renderPlayerList()
    );
  }
};
