import React from 'react';
import DOM from 'react-dom-factories';

export default class InputDialog extends React.Component {
  constructor(props) {
    super(props);

    this.handleInputChange = (ev) => {
      this.setState({
        value: ev.target.value,
      });
    };

    this.state = {
      value: undefined,
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
    document.getElementById('InputDialog-input').focus();
    if (this.props.startingValue) {
      document.getElementById(
        'InputDialog-input'
      ).value = this.props.startingValue;
      this.setState({
        value: this.props.startingValue,
      });
    }
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
            className: 'dialog',
          },
          DOM.div(
            {
              className: 'dialog-text',
            },
            this.getNodeOrDefaultText()
          ),
          DOM.textarea({
            id: 'InputDialog-input',
            onChange: this.handleInputChange,
            placeholder: this.getNodeOrDefaultText(),
            className: 'dialog-input-box',
            style: {
              whiteSpace: this.props.whiteSpace ? 'pre' : '',
              height: this.props.node ? '360px' : '36px',
            },
          }),
          DOM.div(
            {
              style: {
                display: 'flex',
                justifyContent: 'flex-end',
              },
            },
            DOM.div(
              {
                className: 'button primary-button',
                onClick: this.handleConfirmClick,
              },
              DOM.span(
                {
                  className: 'no-select',
                },
                'Submit'
              )
            ),
            DOM.div(
              {
                className: 'button cancel-button',
                onClick: this.handleCancelClick,
              },
              DOM.span(
                {
                  className: 'no-select',
                },
                'Cancel'
              )
            )
          )
        )
      ),
      DOM.div({
        className: 'overlay',
      })
    );
  }
}
