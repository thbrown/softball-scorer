"use strict";

const React = require("react");
const DOM = require("react-dom-factories");

module.exports = class InputDialog extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      value: this.getNodeOrDefaultText()
    };

    this.handleInputChange = ev => {
      this.setState({
        value: ev.target.value
      });
    };
    this.handleConfirmClick = window.current_confirm = () => {
      this.props.hide();
      this.props.on_confirm(this.state.value);
    };

    this.handleCancelClick = window.current_cancel = () => {
      this.props.hide();
    };
  }

  componentDidMount() {
    document.getElementById("InputDialog-input").focus();
  }

  getNodeOrDefaultText() {
    if (this.props.node) {
      return this.props.node.content;
    } else if (this.props.default_text) {
      return this.props.default_text;
    }
    return undefined;
  }

  render() {
    return DOM.div(
      {},
      DOM.div(
        {},
        DOM.div(
          {
            className: "dialog"
          },
          DOM.div(
            {
              className: "dialog-text"
            },
            this.getNodeOrDefaultText()
          ),
          DOM.textarea({
            id: "InputDialog-input",
            onChange: this.handleInputChange,
            placeholder: this.state.value,
            className: "dialog-input-box",
            style: {
              whiteSpace: this.props.whiteSpace ? "pre" : "",
              height: this.props.node ? "360px" : "36px"
            }
          }),
          DOM.div(
            {
              style: {
                display: "flex",
                justifyContent: "flex-end"
              }
            },
            DOM.div(
              {
                className: "button confirm-button",
                onClick: this.handleConfirmClick
              },
              DOM.span(
                {
                  className: "no-select"
                },
                "Submit"
              )
            ),
            DOM.div(
              {
                className: "button cancel-button",
                onClick: this.handleCancelClick
              },
              DOM.span(
                {
                  className: "no-select"
                },
                "Cancel"
              )
            )
          )
        )
      ),
      DOM.div({
        className: "overlay"
      })
    );
  }
};
