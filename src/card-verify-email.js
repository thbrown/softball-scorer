import React from 'react';
import DOM from 'react-dom-factories';
import expose from './expose';
import state from 'state';
import dialog from 'dialog';
import network from 'network';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import { setRoute } from 'actions/route';

export default class CardVerifyEmail extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.token = props.token;

    this.validateEmail = async function() {
      let body = {
        token: this.token,
      };

      let response = await network.request(
        'POST',
        `server/account/verify-email`,
        JSON.stringify(body)
      );

      if (response.status === 204) {
        let message = `Thank you. Your email address has been verified. Please sign in.`;
        let redirect = '/menu/login';
        if (state.isSessionValid()) {
          message = `Thank you. Your email address has been verified.`;
          redirect = '/menu';
        }
        dialog.show_notification(message, function() {
          setRoute(redirect);
        });
      } else if (response.status === 404) {
        dialog.show_notification(
          `We were unable to verify your email. The token may have expired. Try [resending the validation email](/account).`,
          function() {
            setRoute('/menu');
          }
        );
      } else {
        dialog.show_notification(
          `We were unable to verify your email. ${
            response.body ? response.body.message : ''
          }`,
          function() {
            setRoute('/menu');
          }
        );
      }
    }.bind(this);
  }

  componentDidMount() {
    this.validateEmail();
  }

  renderPage() {
    return DOM.div(
      {
        style: {
          padding: '15px',
        },
      },
      DOM.img({
        id: 'score-spinner',
        src: '/server/assets/spinner.gif',
        style: {
          visibility: 'unset',
        },
      }),
      ' Verifying email... '
    );
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
          'Email Verification'
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
