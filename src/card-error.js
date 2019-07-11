import React from 'react';
import DOM from 'react-dom-factories';
import expose from './expose';

import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';

export default class CardError extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};
  }

  render() {
    return DOM.div(
      {
        className: 'card',
      },
      DOM.div(
        {
          className: 'card-title',
        },
        React.createElement(LeftHeaderButton, {}),
        DOM.div(
          {
            className: 'prevent-overflow card-title-text-with-arrow',
          },
          'Error'
        ),
        React.createElement(RightHeaderButton, {})
      ),
      DOM.div(
        {
          className: "card-body",
          style: {
            padding: '20px',
          },
        },
        this.props.message
      )
    );
  }
};
