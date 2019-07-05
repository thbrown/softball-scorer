"use strict";

const DOM = require("react-dom-factories");

const css = require("css");
const dialog = require("dialog");
const expose = require("./expose");
const state = require("state");

const LeftHeaderButton = require("component-left-header-button");
const RightHeaderButton = require("component-right-header-button");

module.exports = class CardTeamList extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.handleTeamClick = function(team) {
      expose.set_state("main", {
        page: `/teams/${team.id}`
      });
    };

    this.handleEditClick = function(team, ev) {
      expose.set_state("main", {
        page: `/teams/${team.id}/edit`,
        isNew: false
      });
      ev.stopPropagation();
    };

    this.handleCreateClick = function() {
      let team = state.addTeam("");
      expose.set_state("main", {
        page: `/teams/${team.id}/edit`,
        isNew: true
      });
    };
  }

  renderTeamList() {
    const s = state.getLocalState();
    let elems = s.teams.map(team => {
      return DOM.div(
        {
          team_id: team.id,
          key: "team" + team.id,
          className: "list-item",
          onClick: this.handleTeamClick.bind(this, team),
          style: {
            display: "flex",
            justifyContent: "space-between"
          }
        },
        DOM.div(
          {
            className: "prevent-overflow"
          },
          team.name
        ),
        DOM.div(
          {
            style: {}
          },
          DOM.img({
            src: "/server/assets/edit.svg",
            alt: "edit",
            className: "list-button",
            onClick: this.handleEditClick.bind(this, team),
            alt: "edit"
          })
        )
      );
    });

    elems.push(
      DOM.div(
        {
          key: "newteam",
          className: "list-item add-list-item",
          onClick: this.handleCreateClick
        },
        "+ Add New Team"
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
        React.createElement(LeftHeaderButton, {}),
        DOM.div(
          {
            className: "prevent-overflow card-title-text-with-arrow"
          },
          "Teams"
        ),
        React.createElement(RightHeaderButton, {})
      ),
      DOM.div(
        {
          className: "card-body"
        },
        this.renderTeamList()
      )
    );
  }
};
