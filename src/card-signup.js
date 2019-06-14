"use strict";

const DOM = require("react-dom-factories");

const config = require("config");
const dialog = require("dialog");
const expose = require("./expose");
const network = require("network.js");
const state = require("state");

const LeftHeaderButton = require("component-left-header-button");
const RightHeaderButton = require("component-right-header-button");

module.exports = class CardSignup extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};
    this.recapchaId = {};

    this.handleSubmitClick = async function() {
      let email = document.getElementById("email");
      let password = document.getElementById("password");
      let passwordConfirm = document.getElementById("passwordConfirm");
      let recapchaResult = grecaptcha.getResponse(this.recapchaId);

      if (
        !email.value ||
        !password.value ||
        !passwordConfirm.value ||
        !recapchaResult
      ) {
        let map = {
          Email: email.value,
          Password: password.value,
          "Confirm Password": passwordConfirm.value,
          reCAPTCHA: recapchaResult
        };
        let missingFields = Object.keys(map).filter(field => {
          return !map[field];
        });
        dialog.show_notification(
          "Please fill out the following required fields: " +
            missingFields.join(", ")
        );
        return;
      }

      if (!this.validateEmail(email.value)) {
        dialog.show_notification("You entered an invalid email address");
        return;
      }

      if (password.value !== passwordConfirm.value) {
        dialog.show_notification("Passwords do not match");
        return;
      }

      // TODO: Disable button

      // TODO: logout existing account before we can signup a new one (menu button is disabled, but user can still access this page via url)

      let body = {
        email: email.value,
        password: password.value,
        reCAPCHA: recapchaResult
      };
      let response = await network.request(
        "POST",
        "server/account/signup",
        JSON.stringify(body)
      );
      if (response.status === 204) {
        // Clear db state if the data in the app is from another account, otherwise the newly signed up account will now own that data
        if (state.getActiveUser()) {
          state.resetState();
        } else {
          state.resetSyncState();
        }
        state.setActiveUser(email.value);

        dialog.show_notification(
          `Thank you for creating an account on Softball.app! You have been logged in.`,
          function() {
            expose.set_state("main", {
              page: "/menu"
            });
          }
        );
      } else {
        dialog.show_notification(
          `There was a problem creating your account ${response.status} - ${
            response.body.message
          }`
        );
        console.log(response);
      }
    };

    this.showRecapcha = function() {
      showRecapchaInternal();
    }.bind(this);

    let showRecapchaInternal = function() {
      if (
        typeof grecaptcha !== "undefined" &&
        grecaptcha &&
        grecaptcha.render
      ) {
        this.recapchaId = grecaptcha.render("recapcha", {
          sitekey: config.recapcha.sitekey
        });

        // Apparently CSP and reCAPCHA are a disaster in Chrome. Because we can't get the styling from Google, we'll just hide the annoying box that shows up. That's the styling we care about most.
        // https://bugs.chromium.org/p/chromium/issues/detail?id=546106
        let box = document.getElementById("g-recaptcha-response");
        if (box) {
          box.hidden = true;
        }
      } else {
        setTimeout(function() {
          showRecapchaInternal();
        }, 500);
      }
    }.bind(this);
  }

  componentDidMount() {
    let queryObject = state.getQueryObj();
    let emailParam = queryObject.email;
    if (emailParam) {
      document.getElementById("email").value = decodeURIComponent(emailParam);
    }
    this.showRecapcha();
  }

  validateEmail(email) {
    var re = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return re.test(String(email).toLowerCase());
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
      DOM.input({
        key: "passwordConfirm",
        id: "passwordConfirm",
        className: "auth-input",
        placeholder: "Confirm Password",
        type: "password"
      }),
      DOM.div({
        id: "recapcha",
        style: {
          marginTop: "10px"
        }
      }),
      this.renderSubmitButton()
    );
  }

  renderSubmitButton() {
    // There is no active user, say that the data in this app will be associated with this accoutn now
    var toRender = [];
    if (!state.getActiveUser()) {
      toRender.push(
        DOM.div(
          {
            key: "info",
            style: {
              marginTop: "10px"
            }
          },
          "Any data you have entered will be associated with your new account"
        )
      );
    } else {
      // TODO: Bug: sometimes this message shows up when it's not supposed to
      toRender.push(
        DOM.div(
          {
            key: "info",
            style: {
              marginTop: "10px"
            }
          },
          "Another account is signed in. Any data you see here will not be available in your new account. If you'd like this data, export the data from the menu, signup a new account, then re-import that data."
        )
      );
    }

    toRender.push(
      DOM.div(
        {
          key: "submit",
          id: "submit",
          className: "button confirm-button",
          onClick: this.handleSubmitClick.bind(this),
          style: {
            marginLeft: "0"
          }
        },
        "Submit"
      )
    );

    return toRender;
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
        React.createElement(LeftHeaderButton, {}),
        DOM.div(
          {
            className: "prevent-overflow card-title-text-with-arrow"
          },
          "Signup"
        ),
        React.createElement(RightHeaderButton, {})
      ),
      this.renderAuthInterface()
    );
  }
};
