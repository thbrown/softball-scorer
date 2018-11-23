"use strict";

const DOM = require("react-dom-factories");
const React = require("react");

const expose = require("./expose");
const css = require("css");

const CardLineup = require("card-lineup");
const CardScorer = require("card-scorer");
const RightHeaderButton = require("component-right-header-button");

const defaultTab = "lineup";

module.exports = class CardGame extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    let tab = props.tab || defaultTab;

    this.handleBackClick = function() {
      history.back();
    }.bind(this);

    this.handleTabClick = function(newTab) {
      expose.set_state("main", {
        page: `/teams/${this.props.team.id}/games/${
          this.props.game.id
        }/${newTab}`
      });
    }.bind(this);
  }

  render() {
    let tab = this.props.tab || defaultTab;
    let subcard = "";
    if (tab === "lineup") {
      subcard = React.createElement(CardLineup, {
        team: this.props.team,
        game: this.props.game
      });
    } else if (tab === "scorer") {
      subcard = React.createElement(CardScorer, {
        team: this.props.team,
        game: this.props.game
      });
    }

    return DOM.div(
      {
        style: {
          className: "card"
        }
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
            className: "card-title-tab-container"
          },
          DOM.div(
            {
              onClick: this.handleTabClick.bind(this, "lineup"),
              style: {
                width: "50%",
                borderBottom:
                  tab === "lineup"
                    ? "5px solid " + css.colors.TEXT_LIGHT
                    : "none"
              }
            },
            "Lineup"
          ),
          DOM.div(
            {
              onClick: this.handleTabClick.bind(this, "scorer"),
              style: {
                width: "50%",
                borderBottom:
                  tab === "scorer"
                    ? "5px solid " + css.colors.TEXT_LIGHT
                    : "none"
              }
            },
            "Scorer"
          )
        ),
        React.createElement(RightHeaderButton, {})
      ),
      subcard
    );
  }
};
