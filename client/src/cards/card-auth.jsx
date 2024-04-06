import React from 'react';
import dialog from 'dialog';
import { getGlobalState } from 'state';
import { setRoute } from 'actions/route';
import Card from 'elements/card';
import Loading from 'elements/loading';

export default class CardAuth extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      logInInProgress: false,
      passwordResetInProgress: false,
    };

    this.handleSignupClick = function () {
      let emailValue = document.getElementById('username').value;
      if (emailValue) {
        setRoute(`/menu/signup?email=${encodeURIComponent(emailValue)}`);
      } else {
        setRoute('/menu/signup');
      }
    };

    this.handlePasswordResetClick = function () {
      let self = this;
      self.setState({
        passwordResetInProgress: true,
      });

      dialog.show_input(
        'To reset your password, please enter your email address.',
        async (email) => {
          try {
            if (email === undefined || email.trim().length === 0) {
              dialog.show_notification('You must specify an email.');
              return;
            }

            let body = JSON.stringify({
              email: email,
            });

            let response = await getGlobalState().request(
              'POST',
              'server/account/reset-password-request',
              body
            );

            if (response.status === 204) {
              dialog.show_notification(
                'Password reset email has been sent to the email provided.'
              );
            } else {
              dialog.show_notification(
                "Failed to send password reset email. Verify the email's validity and try again."
              );
            }
          } finally {
            self.setState({
              passwordResetInProgress: false,
            });
          }
        },
        async () => {
          self.setState({
            passwordResetInProgress: false,
          });
        },
        document.getElementById('username').value
      );
    }.bind(this);

    this.handleSubmitClick = async function (e) {
      e.preventDefault();

      // Disable the button
      this.setState({
        logInInProgress: true,
      });
      try {
        let email = document.getElementById('username');
        let password = document.getElementById('password');

        if (email.value && password.value) {
          let body = JSON.stringify({
            email: email.value,
            password: password.value,
          });

          // There is some data locally that's not associated with an account, ask if we should keep it
          let prompt = undefined;
          console.log('ACTIVE USER', getGlobalState().getActiveUser());
          if (
            getGlobalState().getActiveUser() === null &&
            getGlobalState().hasAnythingChanged()
          ) {
            prompt = new Promise(function (resolve) {
              dialog.show_yes_no_cancel(
                <div>
                  Would you like to keep the data you entered here while you
                  weren&apos;t logged in?
                  <div style={{ margin: '1rem' }}>
                    <div>
                      Selecting <b>no</b> will delete the local data
                      permanently.
                    </div>
                    <div>
                      Selecting <b>yes</b> will merge local data with your
                      account&apos;s data.
                    </div>
                  </div>
                </div>,
                () => {
                  resolve('KEEP');
                },
                () => {
                  resolve('REJECT');
                },
                () => {
                  resolve('CANCEL');
                }
              );
            });
          }
          let keepLocalChanges = await prompt;

          if (keepLocalChanges === 'CANCEL') {
            return;
          }

          let response = await getGlobalState().request(
            'POST',
            'server/account/login',
            body
          );

          if (response.status === 204) {
            if (
              getGlobalState().getActiveUser() === email.value ||
              (getGlobalState().getActiveUser() === null &&
                keepLocalChanges === 'KEEP')
            ) {
              // Don't clear the db state if the user re-logs into the same account OR requested that we keep unowned local changes
              getGlobalState().resetSyncState();
            } else {
              getGlobalState().resetState();
              getGlobalState().setActiveUser(email.value);
            }

            let status = await getGlobalState().sync();
            if (status === 200) {
              console.log('Done with sync');
              setRoute('/menu');
            } else {
              dialog.show_notification(
                'An error occurred while attempting sync: ' + status
              );
            }
          } else if (response.status === 400) {
            dialog.show_notification('Invalid login.');
          } else {
            dialog.show_notification(
              'Could not login. Error code: ' + response.status
            );
          }
        } else {
          let map = {
            Email: email.value,
            Password: password.value,
          };
          let missingFields = Object.keys(map).filter((field) => {
            return !map[field];
          });
          dialog.show_notification(
            'Please fill out the following required fields: ' +
              missingFields.join(', ')
          );
        }
      } finally {
        this.setState({
          logInInProgress: false,
        });
      }
    }.bind(this);
  }

  renderAuthInterface() {
    return (
      <div style={{ padding: '14px' }}>
        <form
          onSubmit={this.handleSubmitClick}
          className="page-width-input"
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-around',
            height: '145px',
            paddingBottom: '8px',
          }}
        >
          <input
            type="text"
            name="username"
            id="username"
            placeholder="Email"
            className="page-width-input"
            disabled={this.state.logInInProgress}
            autoComplete="username"
          />
          <input
            type="password"
            name="password"
            id="password"
            placeholder="Password"
            className="page-width-input"
            disabled={this.state.logInInProgress}
            autoComplete="current-password"
          />
          <button
            type="submit"
            className={`button primary-button page-width-input ${
              this.state.logInInProgress ? 'disabled' : null
            }`}
            style={{ width: '100%' }}
            disabled={this.state.logInInProgress}
            value="Log In"
          >
            Log In
            {this.state.logInInProgress ? (
              <Loading
                style={{ width: '30px', height: '20%', marginTop: '-28px' }}
                color="white"
              ></Loading>
            ) : undefined}
          </button>
        </form>
        <hr style={{ margin: '16px' }}></hr>
        <div>
          <button
            key="create-account"
            id="create-account"
            className="button list-button page-width-input"
            onClick={this.handleSignupClick}
          >
            Create Account
          </button>
          <button
            key="passwordReset"
            id="passwordReset"
            className="button list-button page-width-input"
            onClick={this.handlePasswordResetClick}
            disabled={this.state.passwordResetInProgress}
          >
            Reset Password
            {this.state.passwordResetInProgress ? (
              <Loading
                style={{ width: '30px', height: '20%', marginTop: '-28px' }}
              ></Loading>
            ) : undefined}
          </button>
        </div>
      </div>
    );
  }

  render() {
    return <Card title={'Login'}>{this.renderAuthInterface()}</Card>;
  }
}
