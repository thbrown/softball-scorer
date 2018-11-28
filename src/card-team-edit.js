"use strict";

const DOM = require("react-dom-factories");
const React = require("react");

const css = require("css");
const dialog = require("dialog");
const expose = require("./expose");
const state = require("state");

const LeftHeaderButton = require("component-left-header-button");
const RightHeaderButton = require("component-right-header-button");

module.exports = class CardTeamEdit extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.team = props.team;
    this.isNew = props.isNew;

    let teamCopy = JSON.parse(JSON.stringify(this.team));

    let returnToTeamsListPage = function() {
      expose.set_state("main", {
        page: "/teams"
      });
    };

    this.homeOrBack = function() {
      if (
        props.isNew &&
        JSON.stringify(teamCopy) === JSON.stringify(props.team)
      ) {
        state.removeTeam(props.team.id);
      } else {
        state.replaceTeam(props.team.id, teamCopy);
      }
    };

    this.handleConfirmClick = function() {
      state.replaceTeam(props.team.id, teamCopy);
      returnToTeamsListPage();
    };

    this.handleCancelClick = function() {
      if (props.isNew) {
        state.removeTeam(props.team.id);
      }
      returnToTeamsListPage();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        `Are you sure you want to delete the team ${props.team.name}?`,
        () => {
          state.removeTeam(props.team.id);
          returnToTeamsListPage();
        }
      );
    };

    this.handleNameChange = function() {
      let newValue = document.getElementById("name").value;
      teamCopy.name = newValue;
    };
  }

  renderSaveOptions() {
    let buttons = [];

    buttons.push(
      DOM.div(
        {
          key: "confirm",
          className: "edit-button button confirm-button",
          onClick: this.handleConfirmClick
        },
        DOM.img({
          className: "edit-button-icon",
          src: "/server/assets/check.svg",
          alt: "back"
        }),
        DOM.span(
          {
            className: "edit-button-icon"
          },
          "Save"
        )
      )
    );

    buttons.push(
      DOM.div(
        {
          key: "cancel",
          className: "edit-button button cancel-button",
          onClick: this.handleCancelClick
        },
        DOM.img({
          className: "edit-button-icon",
          src: "/server/assets/cancel.svg"
        }),
        DOM.span(
          {
            className: "edit-button-icon"
          },
          "Cancel"
        )
      )
    );

    if (!this.isNew) {
      buttons.push(
        DOM.div(
          {
            key: "delete",
            className: "edit-button button cancel-button",
            onClick: this.handleDeleteClick
          },
          DOM.img({
            className: "edit-button-icon",
            src: "/server/assets/delete.svg"
          }),
          DOM.span(
            {
              className: "edit-button-icon"
            },
            "Delete"
          )
        )
      );
    }

    return DOM.div(
      {
        key: "saveOptions"
      },
      buttons
    );
  }

  renderTeamEdit() {
    return DOM.div(
      {
        className: "auth-input-container"
      },
      DOM.input({
        key: "teamName",
        id: "name",
        className: "auth-input", // TODO: make css name generic?
        placeholder: "Team Name",
        maxLength: "50",
        onChange: this.handleNameChange,
        defaultValue: this.team.name
      }),
      this.renderSaveOptions()
    );
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
        React.createElement(LeftHeaderButton, {
          onPress: this.homeOrBack
        }),
        DOM.div(
          {
            className: "prevent-overflow card-title-text-with-arrow"
          },
          "Edit Team"
        ),
        React.createElement(RightHeaderButton, {
          onPress: this.homeOrBack
        })
      ),
      this.renderTeamEdit()
    );
  }
};
