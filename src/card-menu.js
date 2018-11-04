"use strict";

const expose = require("./expose");
const DOM = require("react-dom-factories");
const FileSaver = require("file-saver");
const css = require("css");

const dialog = require("dialog");
const hasher = require("object-hash");
const network = require("network.js");
const objectMerge = require("../object-merge.js");
const state = require("state");

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
        let response = await network.request("POST", "server/account/logout");
        if (response.status === 204) {
          state.clearDbState();
          state.clearApplicationState(); // Even though the most recent request was successful, mark the session as invalid.
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
        buttonDiv.innerHTML = "Sync";
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
            if (choice.outcome === "accepted") {
              console.log("User accepted the prompt");
            } else {
              console.log("User dismissed the prompt");
            }
            state.setAddToHomescreenPrompt(null);
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

    if (true || state.getAddToHomescreenPrompt()) {
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
          "Login"
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
        "Sync"
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
        style: {}
      },
      DOM.div(
        {
          className: "card-title"
        },
        "Menu"
      ),
      this.renderMenuOptions()
    );
  }
};
