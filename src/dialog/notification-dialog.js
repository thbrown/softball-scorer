import React from 'react';
import DOM from 'react-dom-factories';

export default class NotificationDialog extends React.Component {
  constructor(props) {
    super(props);

    this.handleConfirmClick = window.current_confirm = () => {
      this.props.hide();
      this.props.on_confirm();
    };
    window.current_cancel = window.current_confirm;
  }

  render() {
    return DOM.div(
      {
        className: 'dialog',
      },
      DOM.div(
        {
          className: 'dialog-text',
          style: { maxHeight: '70vh', overflow: 'auto' },
        },
        this.props.text
      ),
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
            'Got it'
          )
        )
      )
    );
  }
}
