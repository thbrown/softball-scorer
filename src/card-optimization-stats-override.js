"use strict";

const React = require("react");
const DOM = require("react-dom-factories");

const dialog = require("dialog");
const expose = require("./expose");
const state = require("state");

const FloatingInput = require("component-floating-input");
const LeftHeaderButton = require("component-left-header-button");
const RightHeaderButton = require("component-right-header-button");

module.exports = class CardOptimizationStatsOverride extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.state = {};

    let goBack = function() {
      history.back();
    };

    let buildOverride = function() {
      return {
        Outs: document.getElementById("outs").value,
        "1B": document.getElementById("1b").value,
        "2B": document.getElementById("2b").value,
        "3B": document.getElementById("3b").value,
        HR: document.getElementById("hr").value
      };
    }.bind(this);

    this.homeOrBack = function() {
      let newOverride = buildOverride();
      state.putOverride(props.optimization.id, props.player.id, newOverride);
    };

    this.handleConfirmClick = function() {
      this.homeOrBack();
    }.bind(this);

    this.handleCancelClick = function() {
      goBack();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        'Are you sure you want to delete this stat override for player "' +
          this.props.player.name +
          '"?',
        () => {
          state.putOverride(props.optimization.id, props.player.id, null);
          goBack();
        }
      );
    }.bind(this);

    this.handelOutsChange = function() {}.bind(this);

    this.handel1BChange = function() {}.bind(this);

    this.handel2BChange = function() {}.bind(this);

    this.handel3BChange = function() {}.bind(this);

    this.handelHrChange = function() {}.bind(this);

    // We don't need an isNew prop here because the override doesn't have an id can be described (for url purposes)
    // By a combination of the optimization id and the player id. So we'll just detemine wheter or not it's new
    // based on the props. TODO: In principle, should this be ouside the constructor in case proprs change?
    this.isNew = false;
    if (
      props.optimization.inclusions.staging.overrides[props.player.id] ===
      undefined
    ) {
      this.isNew = true;
    }
  }

  componentDidMount() {}

  renderOverridePlayerStats() {
    if (props.optimization.status !== state.SYNC_STATUS_ENUM.IN_PROGRESS) {
      return DOM.div(
        {
          className: "auth-input-container"
        },
        "This page is not avilable while optization has status " +
          state.SYNC_STATUS_ENUM.IN_PROGRESS[props.optimization.status]
      );
    } else {
      return DOM.div(
        {
          className: "auth-input-container"
        },
        [
          React.createElement(FloatingInput, {
            key: "outs",
            id: "outs",
            label: "Outs",
            onChange: this.handleOutsChange.bind(this),
            defaultValue: 0
          })
        ],
        [
          React.createElement(FloatingInput, {
            key: "1b",
            id: "1b",
            label: "1B",
            onChange: this.handle1BChange.bind(this),
            defaultValue: 0
          })
        ],
        [
          React.createElement(FloatingInput, {
            key: "2b",
            id: "2b",
            label: "2B",
            onChange: this.handle2BChange.bind(this),
            defaultValue: 0
          })
        ],
        [
          React.createElement(FloatingInput, {
            key: "3b",
            id: "3b",
            label: "3B",
            onChange: this.handle3BChange.bind(this),
            defaultValue: 0
          })
        ],
        [
          React.createElement(FloatingInput, {
            key: "hr",
            id: "hr",
            label: "HR",
            onChange: this.handleHRChange.bind(this),
            defaultValue: 0
          })
        ],
        this.renderSaveOptions()
      );
    }
  }

  renderSaveOptions() {
    let buttons = [];

    buttons.push(
      DOM.div(
        {
          key: "confirm",
          className: "edit-button button confirm-button",
          // TODO - Make this a component and fix the style there with CSS.
          style: {
            marginLeft: "0",
            marginRight: "0"
          },
          onClick: this.handleConfirmClick
        },
        DOM.img({
          className: "edit-button-icon",
          src: "/server/assets/check.svg"
        }),
        "Save"
      )
    );

    buttons.push(
      DOM.div(
        {
          key: "cancel",
          className: "edit-button button cancel-button",
          // TODO - Make this a component and fix the style there with CSS.
          style: {
            marginLeft: "0",
            marginRight: "0"
          },
          onClick: this.handleCancelClick
        },
        DOM.img({
          className: "edit-button-icon",
          src: "/server/assets/cancel.svg"
        }),
        "Cancel"
      )
    );

    if (!this.isNew) {
      buttons.push(
        DOM.div(
          {
            key: "delete",
            className: "edit-button button cancel-button",
            // TODO - Make this a component and fix the style there with CSS.
            style: {
              marginLeft: "0",
              marginRight: "0"
            },
            onClick: this.handleDeleteClick
          },
          DOM.img({
            className: "edit-button-icon",
            src: "/server/assets/delete.svg"
          }),
          "Delete"
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
        React.createElement(LeftHeaderButton, {
          onPress: this.homeOrBack
        }),
        DOM.div(
          {
            className: "card-title-text-with-arrow"
          },
          "Edit Optimization"
        ),
        React.createElement(RightHeaderButton, {
          onPress: this.homeOrBack
        })
      ),
      this.renderOverridePlayerStats()
    );
  }
};
