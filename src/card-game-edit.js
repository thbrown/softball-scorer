"use strict";

const React = require("react");
const DOM = require("react-dom-factories");

const expose = require("./expose");
const dialog = require("dialog");
const state = require("state");

const RightHeaderButton = require("component-right-header-button");

module.exports = class CardGameEdit extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.game = props.game;
    this.isNew = props.isNew;

    let gameCopy = JSON.parse(JSON.stringify(this.game));

    let returnToGamesListPage = function() {
      expose.set_state("main", {
        page: `/teams/${props.team.id}`
      });
    };

    this.handleBackClick = function() {
      state.replaceGame(props.game.id, props.team.id, gameCopy);
      history.back();
    };

    this.handleConfirmClick = function() {
      state.replaceGame(props.game.id, props.team.id, gameCopy);
      returnToGamesListPage();
    };

    this.handleCancelClick = function() {
      if (props.isNew) {
        state.removeGame(props.game.id, props.team.id);
      }
      returnToGamesListPage();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        'Are you sure you want to delete the game vs "' +
          props.game.opponent +
          '"?',
        () => {
          state.removeGame(props.game.id, props.team.id);
          returnToGamesListPage();
        }
      );
    };

    this.handleOpponentNameChange = function() {
      let newValue = document.getElementById("opponentName").value;
      gameCopy.opponent = newValue;
    };

    this.handleLineupTypeChange = function() {
      let newValue = document.getElementById("lineupType").value;
      gameCopy.lineupType = parseInt(newValue);
    };
  }

  componentDidMount() {
    // Setting value on the select box seems to lock the select box to the value we set. So we'll edit it here.
    document.getElementById("lineupType").value = this.game.lineupType;
  }

  renderGameEdit() {
    return DOM.div(
      {
        className: "auth-input-container"
      },
      [
        DOM.input({
          key: "opponentName",
          id: "opponentName",
          className: "auth-input", // TODO: make css name generic?
          placeholder: "Opponent",
          maxLength: "50",
          onChange: this.handleOpponentNameChange,
          defaultValue: this.game.opponent
        }),
        DOM.select(
          {
            key: "lineupType",
            id: "lineupType",
            className: "auth-input",
            onChange: this.handleLineupTypeChange,
            style: {
              marginTop: "8px"
            }
          },
          [
            DOM.option({ key: "normal", value: 1 }, "Normal"),
            DOM.option({ key: "alternate", value: 2 }, "Alternating Gender")
            //DOM.option({key:'noConsecutive',value: 3},'No Consecutive Females')
          ]
        )
      ],
      this.renderSaveOptions()
    );
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
            className: "card-title-text-with-arrow"
          },
          "Edit Game"
        ),
        React.createElement(RightHeaderButton, {})
      ),
      this.renderGameEdit()
    );
  }
};
