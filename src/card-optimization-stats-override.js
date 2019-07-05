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
        outs: document.getElementById("outs").value,
        singles: document.getElementById("1b").value,
        doubles: document.getElementById("2b").value,
        triples: document.getElementById("3b").value,
        homeruns: document.getElementById("hr").value
      };
    }.bind(this);

    this.homeOrBack = function() {
      let newOverride = buildOverride();
      let allOverrides = JSON.parse(props.optimization.overrideData);
      allOverrides[props.player.id] = newOverride;
      state.setOptimizationField(
        props.optimization.id,
        "overrideData",
        allOverrides,
        true
      );
    };

    this.handleConfirmClick = function() {
      this.homeOrBack();
      goBack();
    }.bind(this);

    this.handleCancelClick = function() {
      goBack();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        'Are you sure you want to delete this stat override for player "' +
          props.player.name +
          '"?',
        () => {
          let allOverrides = JSON.parse(props.optimization.overrideData);
          delete allOverrides[props.player.id];
          state.setOptimizationField(
            props.optimization.id,
            "overrideData",
            allOverrides,
            true
          );
          goBack();
        }
      );
    }.bind(this);

    this.handleOutsChange = function() {}.bind(this);

    this.handle1BChange = function() {}.bind(this);

    this.handle2BChange = function() {}.bind(this);

    this.handle3BChange = function() {}.bind(this);

    this.handleHrChange = function() {}.bind(this);
  }

  componentDidMount() {}

  renderOverridePlayerStats(existingOverride) {
    if (
      this.props.optimization.status !==
      state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
    ) {
      return DOM.div(
        {
          className: "auth-input-container"
        },
        "This page is only available when optimization status is NOT_STARTED. Status is currently " +
          state.OPTIMIZATION_STATUS_ENUM_INVERSE[this.props.optimization.status]
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
            type: "number",
            maxLength: "50",
            onChange: this.handleOutsChange.bind(this),
            defaultValue: existingOverride ? existingOverride.outs : 0
          })
        ],
        [
          React.createElement(FloatingInput, {
            key: "1b",
            id: "1b",
            label: "1B",
            type: "number",
            maxLength: "50",
            onChange: this.handle1BChange.bind(this),
            defaultValue: existingOverride ? existingOverride.singles : 0
          })
        ],
        [
          React.createElement(FloatingInput, {
            key: "2b",
            id: "2b",
            label: "2B",
            type: "number",
            maxLength: "50",
            onChange: this.handle2BChange.bind(this),
            defaultValue: existingOverride ? existingOverride.doubles : 0
          })
        ],
        [
          React.createElement(FloatingInput, {
            key: "3b",
            id: "3b",
            label: "3B",
            type: "number",
            maxLength: "50",
            onChange: this.handle3BChange.bind(this),
            defaultValue: existingOverride ? existingOverride.triples : 0
          })
        ],
        [
          React.createElement(FloatingInput, {
            key: "hr",
            id: "hr",
            label: "HR",
            type: "number",
            maxLength: "50",
            onChange: this.handleHrChange.bind(this),
            defaultValue: existingOverride ? existingOverride.homeruns : 0
          })
        ],
        this.renderSaveOptions(existingOverride)
      );
    }
  }

  renderSaveOptions(existingOverride) {
    // We don't need an isNew prop here because the override doesn't have an id as it can be described (for url purposes)
    // by a combination of the optimization id and the player id. So we'll just detemine whether or not it's new
    // based on the data inside the state.
    let isNew = false;
    if (existingOverride === undefined) {
      isNew = true;
    }

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

    if (!isNew) {
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
    // Get the existing override for this player in this optimization (if it exists)
    let existingOverride = JSON.parse(this.props.optimization.overrideData)[
      this.props.player.id
    ];

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
          "Override " + this.props.player.name
        ),
        React.createElement(RightHeaderButton, {
          onPress: this.homeOrBack
        })
      ),
      DOM.div(
        {
          className: "card-body"
        },
        this.renderOverridePlayerStats(existingOverride)
      )
    );
  }
};
