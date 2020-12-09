import React from 'react';
import DOM from 'react-dom-factories';
import marked from 'marked';
marked.setOptions({
  sanitize: true,
});

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
      {},
      DOM.div(
        {
          className: 'dialog',
        },
        DOM.div({
          className: 'dialog-text',
          dangerouslySetInnerHTML: { __html: marked(this.props.text) },
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
              className: 'button confirm-button',
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
      ),
      DOM.div({
        className: 'overlay',
      })
    );
  }
}
