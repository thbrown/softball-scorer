"use strict";

const DOM = require("react-dom-factories");
const React = require("react");

const css = require("css");
const expose = require("./expose");

const CardStats = require("card-stats");
const CardGameList = require("card-game-list");
const RightHeaderButton = require("component-right-header-button");

let tab = "games";

module.exports = class CardTeam extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    tab = props.tab || tab;

    this.handleBackClick = function() {
      expose.set_state("main", {
        page: "/teams"
      });
    };

    this.handleTabClick = function(t) {
      tab = t;
      expose.set_state("main", {
        page: `/teams/${this.props.team.id}/${tab}`
      });
    }.bind(this);
  }

  render() {
    let subcard = "";
    if (tab === "stats") {
      subcard = React.createElement(CardStats, { team: this.props.team });
    } else if (tab === "games") {
      subcard = React.createElement(CardGameList, { team: this.props.team });
    }

    return DOM.div(
      {
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
            className: "card-title-tab-container",
            style: {}
          },
          DOM.div(
            {
              onClick: this.handleTabClick.bind(this, "stats"),
              style: {
                width: "50%",
                borderBottom:
                  tab === "stats"
                    ? "5px solid " + css.colors.TEXT_LIGHT
                    : "none"
              }
            },
            "Stats"
          ),
          DOM.div(
            {
              onClick: this.handleTabClick.bind(this, "games"),
              style: {
                width: "50%",
                borderBottom:
                  tab === "games"
                    ? "5px solid " + css.colors.TEXT_LIGHT
                    : "none"
              }
            },
            "Games"
          )
        ),
        React.createElement(RightHeaderButton, {})
      ),
      subcard
    );
  }
};
