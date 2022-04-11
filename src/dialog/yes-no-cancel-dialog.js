import React from 'react';
import DOM from 'react-dom-factories';

export default class YesNoCancelDialog extends React.Component {
  constructor(props) {
    super(props);

    this.handleYesClick = window.current_yes = () => {
      this.props.hide();
      this.props.on_yes();
    };

    this.handleNoClick = window.current_no = () => {
      this.props.hide();
      this.props.on_no();
    };

    this.handleCancelClick = window.current_cancel = () => {
      this.props.hide();
      this.props.on_cancel();
    };
  }

  render() {
    return DOM.div(
      {
        className: 'dialog',
      },
      DOM.div(
        {
          className: 'dialog-text',
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
            onClick: this.handleYesClick,
          },
          DOM.span(
            {
              className: 'no-select',
            },
            'Yes'
          )
        ),
        DOM.div(
          {
            className: 'button primary-button',
            onClick: this.handleNoClick,
          },
          DOM.span(
            {
              className: 'no-select',
            },
            'No'
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
    );
  }
}
