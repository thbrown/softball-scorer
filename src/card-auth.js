"use strict";

const expose = require("./expose");
const DOM = require("react-dom-factories");

const network = require("network.js");
const dialog = require("dialog");
const state = require("state");

const RightHeaderButton = require("component-right-header-button");

module.exports = class CardAuth extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.handleBackClick = function() {
      history.back();
    };

    this.handleSignupClick = function() {
      expose.set_state("main", {
        page: "/menu/signup"
      });
    };

    this.handlePasswordResetClick = function() {
      // TODO: pre-populate dialog with the email address that was already entered
      // let email = document.getElementById( 'email' );
      // email.value
      dialog.show_input(
        "To reset your password, please enter your email address",
        async email => {
          console.log("Email", email);
          if (email === undefined || email.trim().length === 0) {
            dialog.show_notification("You must specify an email.");
            return;
          }

          let body = JSON.stringify({
            email: email
          });

          // TODO: loading icon
          let response = await network.request(
            "POST",
            "server/account/reset-password-request",
            body
          );
          if (response.status === 204) {
            dialog.show_notification(
              "Password reset email has been sent to the email provided."
            );
          } else {
            dialog.show_notification(
              "Failed to send password reset email: " + response.body.message
            );
          }
        }
      );
    };

    this.handleSubmitClick = async function() {
      // Disable the button
      if (this.blocked) {
        return;
      }
      this.blocked = true;

      // Turn on the spinner
      let spinner = document.getElementById("submit-spinner");
      spinner.style.display = "initial";

      try {
        let email = document.getElementById("email");
        let password = document.getElementById("password");

        if (email.value && password.value) {
          let body = JSON.stringify({
            email: email.value,
            password: password.value
          });

          let response = await network.request(
            "POST",
            "server/account/login",
            body
          );

          if (response.status === 204) {
            // Don't clear the db state if the user re-logs into the same account
            if (state.getActiveUser() !== email.value) {
              state.resetState();
              state.setActiveUser(email.value);
            } else {
              state.resetSyncState();
            }

            let status = await state.sync();
            if (status === 200) {
              console.log("Done with sync");
              expose.set_state("main", {
                page: "/menu",
                render: true
              });
            } else {
              dialog.show_notification(
                "An error occured while attempting sync: " + status
              );
            }
          } else if (response.status === 400) {
            dialog.show_notification("Invalid login");
          } else {
            dialog.show_notification(
              "Could not login. Error code: " + response.status
            );
          }
        } else {
          let map = {
            Email: email.value,
            Password: password.value
          };
          let missingFields = Object.keys(map).filter(field => {
            return !map[field];
          });
          dialog.show_notification(
            "Please fill out the following required fields: " +
              missingFields.join(", ")
          );
        }
      } finally {
        this.blocked = false;
        spinner.style.display = "none";
      }
    }.bind(this);
  }

  renderAuthInterface() {
    return DOM.div(
      {
        className: "auth-input-container"
      },
      DOM.input({
        key: "email",
        id: "email",
        className: "auth-input",
        placeholder: "Email",
        type: "email"
      }),
      DOM.input({
        key: "password",
        id: "password",
        className: "auth-input",
        placeholder: "Password",
        type: "password"
      }),
      this.renderButtons()
    );
  }

  renderButtons() {
    return [
      DOM.div(
        {
          key: "submit",
          id: "submit",
          className: "button confirm-button",
          style: {
            width: "auto",
            margin: "10px"
          },
          onClick: this.handleSubmitClick
        },
        DOM.img({
          id: "submit-spinner",
          src: "/server/assets/spinner.gif",
          style: {
            display: "none",
            marginRight: "6px"
          }
        }),
        "Submit"
      ),
      DOM.hr({
        key: "divider",
        style: {
          margin: "16px"
        }
      }),
      DOM.div(
        {
          key: "alternateButtons"
        },
        DOM.div(
          {
            key: "signup",
            id: "signup",
            className: "button confirm-button",
            style: {
              width: "auto",
              margin: "10px"
            },
            onClick: this.handleSignupClick
          },
          "Create Account"
        ),
        DOM.div(
          {
            key: "passwordReset",
            id: "passwordReset",
            className: "button confirm-button",
            style: {
              width: "auto",
              margin: "10px"
            },
            onClick: this.handlePasswordResetClick
          },
          "Reset Password"
        )
      )
    ];
  }

  render() {
    return DOM.div(
      {
        style: {}
      },
      DOM.div(
        {
          className: "card-title"
        },
        DOM.img({
          src: "/server/assets/back.svg",
          className: "back-arrow",
          onClick: this.handleBackClick,
          alt: "back"
        }),
        DOM.div(
          {
            className: "card-title-text-with-arrow"
          },
          "Login"
        ),
        React.createElement(RightHeaderButton, {})
      ),
      this.renderAuthInterface()
    );
  }
};
