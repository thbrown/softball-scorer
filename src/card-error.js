"use strict";

const DOM = require("react-dom-factories");
const FileSaver = require("file-saver");

const expose = require("./expose");

const LeftHeaderButton = require("component-left-header-button");
const RightHeaderButton = require("component-right-header-button");

module.exports = class CardError extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};
  }

  render() {
    return DOM.div(
      {
        className: "card"
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
          "Error"
        ),
        React.createElement(RightHeaderButton, {})
      ),
      DOM.div(
        {
          className: "card-body",
          style: {
            padding: "20px"
          }
        },
        this.props.message
      )
    );
  }
};
