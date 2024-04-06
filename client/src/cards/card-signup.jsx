import React from 'react';
import { getGlobalState } from 'state';
import dialog from 'dialog';
import Card from 'elements/card';
import CardSection from 'elements/card-section';
import config from 'config';
import { setRoute } from 'actions/route';

export default class CardSignup extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.recapchaId = {};
    this.submitButton = React.createRef();
    this.submitButtonSpinner = React.createRef();

    this.handleSubmitClick = async function () {
      let email = document.getElementById('email');
      let password = document.getElementById('password');
      let passwordConfirm = document.getElementById('password-confirm');
      let recapchaResult =
        config.recapcha.sitekey == null
          ? 'dummy'
          : window.grecaptcha.getResponse(this.recapchaId);

      if (
        !email.value ||
        !password.value ||
        !passwordConfirm.value ||
        !recapchaResult
      ) {
        let map = {
          Email: email.value,
          Password: password.value,
          'Confirm Password': passwordConfirm.value,
          reCAPTCHA: recapchaResult,
        };
        let missingFields = Object.keys(map).filter((field) => {
          return !map[field];
        });
        dialog.show_notification(
          'Okay Please fill out the following required fields: ' +
            missingFields.join(', ')
        );
        return;
      }

      if (!this.validateEmail(email.value)) {
        dialog.show_notification('You entered an invalid email address');
        return;
      }

      if (password.value !== passwordConfirm.value) {
        dialog.show_notification('Passwords do not match');
        return;
      }

      // Disable button
      this.submitButton.current.classList.add('disabled');
      this.submitButtonSpinner.current.classList.remove('gone');

      // TODO: logout existing account before we can signup a new one (menu button is disabled, but user can still access this page via url)

      let body = {
        email: email.value,
        password: password.value,
        reCAPCHA: recapchaResult,
      };
      let response = await getGlobalState().request(
        'POST',
        'server/account/signup',
        JSON.stringify(body)
      );
      if (response.status === 204) {
        // Clear db state if the data in the app is from another account, otherwise the newly signed up account will now own that data
        if (getGlobalState().getActiveUser()) {
          getGlobalState().resetState();
        } else {
          getGlobalState().resetSyncState();
        }
        getGlobalState().setActiveUser(email.value);

        dialog.show_notification(
          <div>
            Thank you for creating an account on Softball.app! You have been
            logged in. To enable all softball.app features, please verify your
            email by clicking the activation link in the welcome email sent to{' '}
            {email.value}. This link will expire after 24 hours.
          </div>,
          function () {
            setRoute('/menu');
          }
        );
      } else {
        dialog.show_notification(
          `There was a problem creating your account ${response.status} - ${response.body.message}`
        );
        console.log(response);
      }

      this.submitButton.current.classList.remove('disabled');
      this.submitButtonSpinner.current.classList.add('gone');
    };

    this.showRecapcha = function () {
      showRecapchaInternal();
    };

    let showRecapchaInternal = function () {
      if (
        typeof grecaptcha !== 'undefined' &&
        window.grecaptcha &&
        window.grecaptcha.render
      ) {
        this.recapchaId = window.grecaptcha.render('recapcha', {
          sitekey:
            config.recapcha.sitekey ??
            '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI',
        });

        // Apparently CSP and reCAPCHA are a disaster in Chrome. Because we can't get the styling from Google, we'll just hide the annoying box that shows up. That's the styling we care about most.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=546106
        let box = document.getElementById('g-recaptcha-response');
        if (box) {
          box.hidden = true;
        }
      } else {
        setTimeout(function () {
          showRecapchaInternal();
        }, 500);
      }
    }.bind(this);
  }

  componentDidMount() {
    let queryObject = getGlobalState().getQueryObj();
    let emailParam = queryObject.email;
    if (emailParam) {
      document.getElementById('email').value = decodeURIComponent(emailParam);
    }
    this.showRecapcha();
  }

  validateEmail(email) {
    var re =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return re.test(String(email).toLowerCase());
  }

  renderAuthInterface() {
    return (
      <div className="auth-input-container">
        <input
          key="email"
          id="email"
          className="auth-input"
          placeholder="Email"
          type="email"
        />
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
        <div id="recapcha" style={{ marginTop: '10px' }}></div>
        {this.renderSubmitButton()}
      </div>
    );
  }

  renderSubmitButton() {
    const toRender = [];
    if (!getGlobalState().getActiveUser()) {
      toRender.push(
        <div
          key="info"
          style={{
            marginTop: '10px',
          }}
        >
          Any data you have entered so far will be available in your new account
        </div>
      );
    } else {
      toRender.push(
        <div
          key="info"
          style={{
            marginTop: '10px',
          }}
        >
          Another account&apos;`s data is loaded locally. Any data you see here
          will not be available in your new account.
        </div>
      );
    }

    toRender.push(
      <div
        key="submit"
        id="submit"
        className="button primary-button"
        onClick={this.handleSubmitClick.bind(this)}
        style={{
          marginLeft: '0',
        }}
        ref={this.submitButton}
      >
        <img
          id="score-spinner"
          src="/assets/spinner.gif"
          className="gone"
          style={{
            visibility: 'unset',
            paddingRight: '10px',
          }}
          ref={this.submitButtonSpinner}
        />{' '}
        Submit
      </div>
    );

    return toRender;
  }

  render() {
    return (
      <Card title="Signup">
        <CardSection isCentered="true">
          <div className="card-body">{this.renderAuthInterface()}</div>
        </CardSection>
      </Card>
    );
  }
}
