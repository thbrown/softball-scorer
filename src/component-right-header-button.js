"use strict";

const expose = require("./expose");
const DOM = require("react-dom-factories");

module.exports = class RightHeaderButton extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.handleButtonPress = function() {
      if (props.showBlogLink) {
        window.open("https://blog.softball.app", "_blank");
      } else {
        expose.set_state("main", {
          page: "/menu"
        });
      }
    };
  }

  render() {
    let src = this.props.showBlogLink
      ? "/server/assets/logo192.png"
      : "/server/assets/home.svg";
    let alt = this.props.showBlogLink ? "blog" : "home";
    return DOM.img({
      src: src,
      className: "header-right",
      onClick: this.handleButtonPress,
      alt: alt
    });
  }
};
