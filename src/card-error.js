"use strict";

const DOM = require("react-dom-factories");
const FileSaver = require("file-saver");

const expose = require("./expose");

const RightHeaderButton = require("component-right-header-button");

module.exports = class CardError extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.handleBackClick = function() {
      history.back();
    };
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
          "Error"
        ),
        React.createElement(RightHeaderButton, {
          showBlogLink: true
        })
      ),
      DOM.div(
        {
          style: {
            padding: "20px"
          }
        },
        this.props.message
      )
    );
  }
};
