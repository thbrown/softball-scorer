"use strict";

const expose = require("./expose");
const DOM = require("react-dom-factories");

const state = require("state");

module.exports = class LeftHeaderButton extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.handleButtonPress = function() {
      if (props.onPress) {
        props.onPress();
      }
      history.back();
    };
  }

  render() {
    return DOM.img({
      src: "/server/assets/back.svg",
      className: "back-arrow",
      onClick: this.handleButtonPress,
      alt: "back"
    });
  }
};
