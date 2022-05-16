import React, { Component } from 'react';
import css from 'css';
import state from 'state';
import Card from 'elements/card';
import dialog from 'dialog';
import { setRoute } from 'actions/route';

export default class CardAccount extends Component {
  constructor(props) {
    super(props);
    this.state = {};

    // TODO: only render this button if email has not yet been validated
    this.handleEmailValidationClick = async function () {
      let buttonDiv = document.getElementById('email-validation');
      buttonDiv.classList.add('disabled');

      let response = await state.request(
        'POST',
        'server/account/send-verification-email'
      );
      let message;
      if (response.status === 204) {
        message = 'Email has been sent.';
      } else if (response.status === 400) {
        message = 'Email not sent, your email has already been validated.';
      } else if (response.status === -1) {
        message =
          'Email can not be sent while offline. Try again when you have a connection.';
      } else {
        message = `An unexpected error occurred. Response: ${JSON.stringify(
          response
        )}`;
      }
      buttonDiv.classList.remove('disabled');

      dialog.show_notification(message, function () {
        setRoute('/menu');
      });
    };
  }

  render() {
    return (
      <Card title="Account">
        <div
          id="email-validation"
          className="list-button button left"
          onClick={this.handleEmailValidationClick.bind(this)}
          style={{
            backgroundColor: css.colors.BG,
          }}
        >
          Re-send email validation email
        </div>
      </Card>
    );
  }
}
