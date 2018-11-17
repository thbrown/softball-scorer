"use strict";

const expose = require("./expose");
const DOM = require("react-dom-factories");

module.exports = class RightHeaderButton extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.handleButtonPress = function() {
      // Do nothing for now
    };
  }

  render() {
    return DOM.img({
      src: "/server/assets/empty.svg",
      className: "header-right",
      onClick: this.handleButtonPress,
      alt: ""
    });
  }
};
