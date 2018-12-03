"use strict";

const expose = require("./expose");
const DOM = require("react-dom-factories");

module.exports = class FloatingInput extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};
  }

  componentDidMount() {
    const floatContainer = document.getElementById(this.props.id + "container");

    if (floatContainer.querySelector("input").value) {
      floatContainer.classList.add("active");
    }

    const handleFocus = e => {
      const target = e.target;
      target.parentNode.classList.add("active");
    };

    const handleBlur = e => {
      const target = e.target;
      if (!target.value) {
        target.parentNode.classList.remove("active");
      }
      target.removeAttribute("placeholder");
    };

    const floatField = floatContainer.querySelector("input");
    floatField.addEventListener("focus", handleFocus);
    floatField.addEventListener("blur", handleBlur);
  }

  render() {
    return DOM.div(
      {
        key: this.props.id + "container",
        id: this.props.id + "container",
        className: "float-container"
      },
      DOM.label({}, this.props.label),
      DOM.input({
        id: this.props.id,
        type: this.props.type ? this.props.type : "text",
        min: this.props.min,
        step: this.props.step,
        maxLength: "50",
        onChange: this.props.onChange,
        defaultValue: this.props.defaultValue
      })
    );
  }
};
