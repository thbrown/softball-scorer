"use strict";

const React = require("react");
const DOM = require("react-dom-factories");

const dialog = require("dialog");
const expose = require("./expose");
const state = require("state");

const FloatingInput = require("component-floating-input");
const LeftHeaderButton = require("component-left-header-button");
const RightHeaderButton = require("component-right-header-button");

module.exports = class CardOptimizationEdit extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.isNew = props.isNew;

    this.state = {
      optimizationName: props.optimization.name
    };

    let goBack = function() {
      history.back();
    };

    let buildOptimization = function() {
      let optimization = JSON.parse(JSON.stringify(props.optimization));
      optimization.name = this.state.optimizationName;
      return optimization;
    }.bind(this);

    this.homeOrBack = function() {
      let newOptimization = buildOptimization();
      if (
        props.isNew &&
        JSON.stringify(newOptimization) === JSON.stringify(props.optimization)
      ) {
        state.removeOptimization(props.optimization.id);
      } else {
        state.replaceOptimization(props.optimization.id, newOptimization);
      }
    };

    this.handleConfirmClick = function() {
      state.replaceOptimization(props.optimization.id, buildOptimization());
      goBack();
    }.bind(this);

    this.handleCancelClick = function() {
      if (props.isNew) {
        state.removeOptimization(props.optimization.id);
      }
      goBack();
    };

    this.handleDeleteClick = function() {
      dialog.show_confirm(
        'Are you sure you want to delete this optimization "' +
          this.state.optimizationName +
          '"?',
        () => {
          state.removeOptimization(props.optimization.id);
          goBack();
        }
      );
    }.bind(this);

    this.handleOptimizationNameChange = function() {
      this.setState({
        optimizationName: document.getElementById("optimizationName").value
      });
    }.bind(this);
  }

  componentDidMount() {}

  renderOptimizationEdit() {
    return DOM.div(
      {
        className: "auth-input-container"
      },
      [
        React.createElement(FloatingInput, {
          key: "optimizationName",
          id: "optimizationName",
          label: "Optimization name",
          onChange: this.handleOptimizationNameChange.bind(this),
          defaultValue: this.state.optimizationName
        })
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
      this.renderOptimizationEdit()
    );
  }
};
