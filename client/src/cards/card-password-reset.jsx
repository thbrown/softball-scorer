import React from 'react';
import dialog from 'dialog';
import { getGlobalState } from 'state';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import { setRoute } from 'actions/route';

export default class CardPasswordReset extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};

    this.token = props.token;

    this.handleSubmitClick = async function () {
      const password = document.getElementById('password');
      const passwordConfirm = document.getElementById('password-confirm');

      if (!password.value || !passwordConfirm.value) {
        const map = {
          Password: password.value,
          'Confirm Password': passwordConfirm.value,
        };
        let missingFields = Object.keys(map).filter((field) => {
          return !map[field];
        });
        dialog.show_notification(
          'Please fill out the following required fields: ' +
            missingFields.join(', ')
        );
        return;
      }

      if (password.value !== passwordConfirm.value) {
        dialog.show_notification('Passwords do not match');
        return;
      }

      let body = {
        token: this.token,
        password: password.value,
      };

      let response = await getGlobalState().request(
        'POST',
        `server/account/reset-password`,
        JSON.stringify(body)
      );
      if (response.status === 204) {
        dialog.show_notification(
          `Success! Your password has been changed. Please login.`,
          function () {
            setRoute('/menu/login');
          }
        );
      } else if (response.status === 404) {
        dialog.show_notification(
          `Error! We were not able to change your password. The activation link may have expired. Please request another password reset.`,
          function () {
            setRoute('/menu/login');
          }
        );
      } else {
        dialog.show_notification(
          `Error! We were not able to change your password. Please request another password reset. ${
            response.body ? response.body.message : ''
          }`,
          function () {
            setRoute('/menu/login');
          }
        );
      }
    };
  }

  renderAuthInterface() {
    return (
      <div className="auth-input-container">
        <div className="text-div">
          Please complete the form to change your password
        </div>
        <input
          key="password"
          id="password"
          className="auth-input"
          placeholder="Password"
          type="password"
        />
        <input
          key="password-confirm"
          id="password-confirm"
          className="auth-input"
          placeholder="Confirm Password"
          type="password"
        />
        {this.renderSubmitButton()}
      </div>
    );
  }

  renderSubmitButton() {
    return (
      <div
        key="submit"
        id="submit"
        className="button primary-button"
        onClick={this.handleSubmitClick.bind(this)}
        style={{
          marginLeft: '0',
        }}
      >
        Submit
      </div>
    );
  }

  render() {
    return (
      <div>
        <div className="card-title">
          <LeftHeaderButton />
          <div style={{}}>Reset Password</div>
          <RightHeaderButton />
        </div>
        <div className="card-body">{this.renderAuthInterface()}</div>
      </div>
    );
  }
}
