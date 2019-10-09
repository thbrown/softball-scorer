import React from 'react';
import DOM from 'react-dom-factories';
import expose from './expose';
import state from 'state';
import dialog from 'dialog';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import { setRoute } from 'actions/route';

export default class CardReset extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.token = props.token;

    this.promptForReset = async function() {
      console.log('HELLO2');
      dialog.show_confirm(
        'Would you like to reset your client? You will lose any changes that have not been synced.',
        () => {
          state.resetState();
          dialog.show_notification(
            "Your client has been reset. You will be redirected to the main menu. Once you've arived there, please refresh the page.",
            () => {
              setRoute('/menu');
            }
          );
        }
      );
    }.bind(this);
  }

  componentDidMount() {
    console.log('HELLO');
    this.promptForReset();
  }

  renderPage() {
    return DOM.div({
      style: {
        padding: '15px',
      },
    });
  }

  render() {
    return DOM.div(
      {
        style: {},
      },
      DOM.div(
        {
          className: 'card-title',
        },
        React.createElement(LeftHeaderButton, {}),
        DOM.div(
          {
            className: 'card-title-text-with-arrow',
          },
          'Reset'
        ),
        React.createElement(RightHeaderButton, {})
      ),
      DOM.div(
        {
          className: 'card-body',
        },
        this.renderPage()
      )
    );
  }
}
