"use strict";

const DOM = require("react-dom-factories");
const FileSaver = require("file-saver");

const css = require("css");
const expose = require("./expose");
const dialog = require("dialog");
const network = require("network.js");
const state = require("state");

const RightHeaderButton = require("component-right-header-button");

module.exports = class CardMenu extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {};

    this.handleTeamsClick = function() {
      expose.set_state("main", {
        page: "/teams"
      });
    };

    this.handlePlayersClick = function() {
      expose.set_state("main", {
        page: "/players"
      });
    };

    this.handleLogoutClick = async function() {
      dialog.show_confirm("Are you sure you want to log out?", async () => {
        // Do a sync if necessary
        if (state.getSyncState() !== state.getSyncStateEnum().COMPLETE) {
          let abort = true;
          let status = await state.sync();
          if (status !== 200) {
            let message =
              "Could not sync account data prior to logout. If you continue to sign out you will lose unsynced data. Continue anyways?";
            if (state.isOnline() === true) {
              message =
                "Could not sync account data prior to logout because of a network failure. If you continue to sign out you will lose unsynced data. Continue anyways?";
            }
            dialog.show_confirm(message, () => {
              abort = false;
            });
            return;
          } else {
            console.log("Skiping sync, changes are already in sync");
            abort = false;
          }
          if (abort) {
            return;
          }
        }

        let response = await network.request("POST", "server/account/logout");
        if (response.status === 204) {
          state.resetState();
          dialog.show_notification("Logout successful", function() {
            expose.set_state("main", {
              page: "/menu/login"
            });
          });
        } else {
          // We can't delete our cookies in javascript because they have the httpOnly header, it has to be done from the server
          // TODO: We might be able to get around this by sending a phony login request, catch it with the service worker and pretend it succeded
          dialog.show_notification(
            "Logout failed. You must be online to logout",
            function() {
              expose.set_state("main", {
                page: "/menu"
              });
            }
          );
        }
      });
    };

    this.handleLoginClick = function() {
      expose.set_state("main", {
        page: "/menu/login"
      });
    };

    this.handleSyncClick = async function() {
      let buttonDiv = document.getElementById("sync");
      buttonDiv.innerHTML = "Sync (In Progress)";
      buttonDiv.classList.add("disabled");
      let status = await state.sync();
      if (status === 200) {
        buttonDiv.innerHTML = "Sync (Success)";
      } else if (status === 403) {
        dialog.show_notification("Please log in");
        buttonDiv.innerHTML = "Force Sync";
      } else if (status === -1) {
        dialog.show_notification("Sync Failed. App is in offline mode");
        buttonDiv.innerHTML = "Force Sync";
      } else {
        buttonDiv.innerHTML = `Sync (Fail - ${status})`;
      }
      buttonDiv.classList.remove("disabled");
    };

    this.handleSaveClick = function() {
      var today = new Date().getTime();
      var blob = new Blob([JSON.stringify(state.getLocalState(), null, 2)], {
        type: "text/plain;charset=utf-8"
      });
      FileSaver.saveAs(blob, "save" + today + ".json");
    };

    this.handleLoadClick = function() {
      expose.set_state("main", {
        page: "/menu/import"
      });
    };

    this.handleAddToHomeScreenClick = function() {
      dialog.show_confirm(
        "Would you like to add Softball.app to your homescreen as a standalone app? Presssing yes will cause your browser to issue an 'add to home screen' prompt. If you dismiss the browser's prompt, the menu option will disappear until the next page load.",
        () => {
          let deferredPrompt = state.getAddToHomescreenPrompt().prompt();
          // Wait for the user to respond to the prompt
          deferredPrompt.userChoice.then(choice => {
            state.setAddToHomescreenPrompt(null);
            if (choice.outcome === "accepted") {
              console.log("User accepted the prompt");
            } else {
              console.log("User dismissed the prompt");
            }
          });
        }
      );
    };
  }

  renderMenuOptions() {
    let elems = [];

    elems.push(
      DOM.div(
        {
          key: "teams",
          id: "teams",
          className: "list-item",
          onClick: this.handleTeamsClick.bind(this),
          style: {
            backgroundColor: css.colors.BG
          }
        },
        "Teams"
      )
    );

    elems.push(
      DOM.div(
        {
          key: "players",
          id: "players",
          className: "list-item",
          onClick: this.handlePlayersClick.bind(this),
          style: {
            backgroundColor: css.colors.BG
          }
        },
        "Players"
      )
    );

    if (state.getAddToHomescreenPrompt()) {
      elems.push(
        DOM.div(
          {
            key: "addToHomescreen",
            id: "addToHomescreen",
            className: "list-item",
            onClick: this.handleAddToHomeScreenClick.bind(this),
            style: {
              backgroundColor: css.colors.BG
            }
          },
          "Add App to Homescreen"
        )
      );
    }

    if (state.isSessionValid()) {
      elems.push(
        DOM.div(
          {
            key: "logout",
            id: "logout",
            className: "list-item",
            onClick: this.handleLogoutClick.bind(this),
            style: {
              backgroundColor: css.colors.BG
            }
          },
          "Logout"
        )
      );
    } else {
      elems.push(
        DOM.div(
          {
            key: "login",
            id: "login",
            className: "list-item",
            onClick: this.handleLoginClick.bind(this),
            style: {
              backgroundColor: css.colors.BG
            }
          },
          "Login/Signup"
        )
      );
    }

    elems.push(
      DOM.div(
        {
          key: "sync",
          id: "sync",
          className: "list-item",
          onClick: this.handleSyncClick.bind(this),
          style: {
            backgroundColor: css.colors.BG
          }
        },
        "Force Sync"
      )
    );

    elems.push(
      DOM.div(
        {
          key: "save",
          className: "list-item",
          onClick: this.handleSaveClick.bind(this),
          style: {
            backgroundColor: css.colors.BG
          }
        },
        "Save as File"
      )
    );

    elems.push(
      DOM.div(
        {
          key: "load",
          className: "list-item",
          onClick: this.handleLoadClick.bind(this),
          style: {
            backgroundColor: css.colors.BG
          }
        },
        "Load from File"
      )
    );

    return DOM.div({}, elems);
  }

  render() {
    return DOM.div(
      {
        className: "card",
        style: {}
      },
      DOM.div(
        {
          className: "card-title"
        },
        DOM.div({
          className: "back-arrow" /* Dummy div the size of the back-arrow */
        }),
        DOM.div(
          {
            className: "prevent-overflow card-title-text-with-arrow"
          },
          "Menu"
        ),
        React.createElement(RightHeaderButton, {})
      ),
      this.renderMenuOptions()
    );
  }
};
