import React from 'react';
import state from 'state';
import dialog from 'dialog';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import { setRoute } from 'actions/route';

export default class CardVerifyEmail extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.token = props.token;

    this.validateEmail = async function () {
      let body = {
        token: this.token,
      };

      let response = await state.request(
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
        dialog.show_notification(message, function () {
          setRoute(redirect);
          state.sync();
        });
      } else if (response.status === 404) {
        dialog.show_notification(
          <div>
            We were unable to verify your email. The token may have expired. Try{' '}
            <a href="/account">resending the validation email</a>.
          </div>,
          function () {
            setRoute('/menu');
          }
        );
      } else {
        dialog.show_notification(
          `We were unable to verify your email. ${
            response.body ? response.body.message : ''
          }`,
          function () {
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
    return (
      <div style={{ padding: '15px' }}>
        <img
          id="score-spinner"
          src="/assets/spinner.gif"
          style={{ visibility: 'unset' }}
        />
        {' Verifying email... '}
      </div>
    );
  }

  render() {
    return (
      <div>
        <div className="card-title">
          <LeftHeaderButton />
          <div className="card-title-text-with-arrow">Email Verification</div>
          <RightHeaderButton />
        </div>
        <div className="card-body">{this.renderPage()}</div>
      </div>
    );
  }
}
