"use strict";

const React = require("react");
const expose = require("./expose");
const DOM = require("react-dom-factories");
const css = require("css");

const config = require("config");
const dialog = require("dialog");
const network = require("network");
const noSleepImport = require("./lib/nosleep.js");
const noSleep = new noSleepImport();
const state = require("state");

const CardAuth = require("card-auth");
const CardGame = require("card-game");
const CardGameEdit = require("card-game-edit");
const CardImport = require("card-import");
const CardMenu = require("card-menu");
const CardPasswordReset = require("card-password-reset");
const CardPlateAppearance = require("card-plate-appearance");
const CardPlayerList = require("card-player-list");
const CardPlayerEdit = require("card-player-edit");
const CardPlayerSelection = require("card-player-selection");
const CardSignup = require("card-signup");
const CardSpray = require("card-spray");
const CardTeam = require("card-team");
const CardTeamEdit = require("card-team-edit");
const CardTeamList = require("card-team-list");

// TODO
// Text directions?
// Sample data?

// Smoother click and drag
// Use svgs
// Scroll bars on desktop

// Long names overlap back button on AP page

// Delete account/data
// Async localstorage interaction

module.exports = class MainContainer extends expose.Component {
  constructor(props) {
    super(props);
    this.expose("main");

    // Register a service worker to support offline experience and quick subsequent page loads
    if ("serviceWorker" in navigator) {
      // When a new service worker is available, re-load the page
      navigator.serviceWorker.oncontrollerchange = () => {
        if (document.hidden) {
          dialog.show_notification(
            "Softball.app has been updated, this page will be automatically refreshed. You will not lose any data you've entered.",
            () => {
              window.location.reload();
            }
          );
        } else {
          window.location.reload();
        }
      };

      // The actual registration
      window.addEventListener("load", function() {
        navigator.serviceWorker.register("/service-worker");
      });
    }

    // Load data from localstorage synchronously
    state.loadStateFromLocalStorage();

    // When the user pops the state (e.g. on back button press) make sure the react state matches the url.
    window.onpopstate = function() {
      let newPage = window.location.pathname;
      expose.set_state("main", {
        page: newPage
      });
    };

    // Sync on first load
    setTimeout(state.sync, 1);

    // Check if we are logged in, online, and who we are logged in as (TODO: Is the really useful? The data will almost always be right unless somebody clears their ls)
    setTimeout(network.updateNetworkStatus, 1);

    // Reload from local storage each time after the window regains focus
    window.addEventListener(
      "focus",
      () => {
        state.loadStateFromLocalStorage();
      },
      false
    );

    // Enable wake lock. (must be wrapped in a user input event handler)
    document.addEventListener("click", enableNoSleep, false);
    function enableNoSleep() {
      noSleep.enable();
      document.removeEventListener("click", enableNoSleep, false);
    }

    window.addEventListener(
      "online",
      () => {
        // This event really just tells us if we are connected to a network, we need to ping the server to know if we are online and authenticated
        network.updateNetworkStatus();
      },
      false
    );

    window.addEventListener(
      "offline",
      () => {
        state.setOffline();
      },
      false
    );

    window.addEventListener("beforeinstallprompt", e => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      state.setAddToHomescreenPrompt(e);
    });

    // Analytics
    let trackingId =
      config.analytics && config.analytics.trackingId
        ? config.analytics.trackingId
        : undefined;
    window.ga =
      window.ga ||
      function() {
        (ga.q = ga.q || []).push(arguments);
      };
    ga.l = +new Date();
    ga("create", trackingId, "auto");
    ga("require", "urlChangeTracker");
    ga("require", "cleanUrlTracker", {
      stripQuery: true,
      indexFilename: "index.html",
      trailingSlash: "remove",
      urlFieldsFilter: function(fieldsObj, parseUrl) {
        fieldsObj.page = parseUrl(fieldsObj.page)
          .pathname.replace(/teams\/[a-zA-Z0-9]{14}/, "teams/<team-id>")
          .replace(/player\/[a-zA-Z0-9]{14}/, "player/<player-id>")
          .replace(/games\/[a-zA-Z0-9]{14}/, "games/<game-id>")
          .replace(
            /plateAppearances\/[a-zA-Z0-9]{14}/,
            "plateAppearances/<pa-id>"
          )
          .replace(/players\/[a-zA-Z0-9]{14}/, "players/<player-id>");
        return fieldsObj;
      }
    });
    ga("send", "pageview");

    let startPage = window.location.pathname;

    this.state = {
      render: true,
      page: startPage
    };
  }

  /**
   * Checks if the given url matches the path. If it does match this method returns true otherwise it returns false.
   * This method also stores any path variables (marked with the ':' prefix) as properties in the passed in state object.
   */
  static matches(url, path, state) {
    let urlArray = url.split("/");
    let pathArray = path.split("/");
    let pathVariables = {};
    if (pathArray.length !== urlArray.length) {
      return false;
    }
    for (let i = 1; i < pathArray.length; i++) {
      if (pathArray[i].length > 0 && pathArray[i][0] === ":") {
        pathVariables[pathArray[i].substring(1)] = urlArray[i];
      } else if (urlArray[i] !== pathArray[i]) {
        pathVariables = {};
        return false;
      }
    }

    // Copy path vars to state if this path matches the url
    let pathVarKeys = Object.keys(pathVariables);
    for (let i = 0; i < pathVarKeys.length; i++) {
      state[pathVarKeys[i]] = pathVariables[pathVarKeys[i]];
    }
    state.urlArray = urlArray;
    return true;
  }

  renderCard(url) {
    // Update the base url if necessary
    if (url !== window.location.pathname) {
      history.pushState({}, "", url);
    }

    if (MainContainer.matches(url, "/", this.state)) {
      // TODO: maybe this should just redirect to /menu
      return React.createElement(CardMenu);
    } else if (MainContainer.matches(url, "/menu", this.state)) {
      return React.createElement(CardMenu);
    } else if (MainContainer.matches(url, "/menu/login", this.state)) {
      return React.createElement(CardAuth);
    } else if (MainContainer.matches(url, "/menu/signup", this.state)) {
      return React.createElement(CardSignup);
    } else if (MainContainer.matches(url, "/menu/import", this.state)) {
      return React.createElement(CardImport);
    } else if (
      MainContainer.matches(url, "/account/password-reset/:token", this.state)
    ) {
      let token = this.state.token;
      return React.createElement(CardPasswordReset, {
        token: token
      });
    } else if (MainContainer.matches(url, "/teams", this.state)) {
      return React.createElement(CardTeamList);
    } else if (
      MainContainer.matches(url, "/teams/:teamId", this.state) ||
      MainContainer.matches(url, "/teams/:teamId/games", this.state)
    ) {
      let teamId = this.state.teamId;
      let team = state.getTeam(teamId);
      return React.createElement(CardTeam, {
        team: team,
        tab: "games"
      });
    } else if (MainContainer.matches(url, "/teams/:teamId/edit", this.state)) {
      let teamId = this.state.teamId;
      let team = state.getTeam(teamId);
      let isNew = this.state.isNew; // TODO: revisit this, what happens if this pages is loaded via external link
      return React.createElement(CardTeamEdit, {
        team: team,
        isNew: isNew
      });
    } else if (MainContainer.matches(url, "/teams/:teamId/stats", this.state)) {
      let teamId = this.state.teamId;
      let team = state.getTeam(teamId);
      return React.createElement(CardTeam, {
        team: team,
        tab: "stats"
      });
    } else if (
      MainContainer.matches(
        url,
        "/teams/:teamId/stats/player/:playerId",
        this.state
      )
    ) {
      return React.createElement(CardSpray, {
        playerId: this.state.playerId,
        teamId: this.state.teamId,
        origin: "stats"
      });
    } else if (
      MainContainer.matches(url, "/teams/:teamId/games/:gameId", this.state) ||
      MainContainer.matches(
        url,
        "/teams/:teamId/games/:gameId/lineup",
        this.state
      )
    ) {
      let team = state.getTeam(this.state.teamId);
      let game = state.getGame(this.state.gameId);
      return React.createElement(CardGame, {
        team: team,
        game: game,
        tab: "lineup"
      });
    } else if (
      MainContainer.matches(
        url,
        "/teams/:teamId/games/:gameId/scorer",
        this.state
      )
    ) {
      let team = state.getTeam(this.state.teamId);
      let game = state.getGame(this.state.gameId);
      return React.createElement(CardGame, {
        team: team,
        game: game,
        tab: "scorer"
      });
    } else if (
      MainContainer.matches(
        url,
        "/teams/:teamId/games/:gameId/player-selection",
        this.state
      )
    ) {
      let team = state.getTeam(this.state.teamId);
      let game = state.getGame(this.state.gameId);
      return React.createElement(CardPlayerSelection, {
        team: team,
        game: game
      });
    } else if (
      MainContainer.matches(
        url,
        "/teams/:teamId/games/:gameId/edit",
        this.state
      )
    ) {
      let team = state.getTeam(this.state.teamId);
      let game = state.getGame(this.state.gameId);
      let isNew = this.state.isNew;
      return React.createElement(CardGameEdit, {
        team: team,
        game: game,
        isNew: isNew
      });
    } else if (
      MainContainer.matches(
        url,
        "/teams/:teamId/games/:gameId/lineup/plateAppearances/:plateAppearanceId",
        this.state
      ) ||
      MainContainer.matches(
        url,
        "/teams/:teamId/games/:gameId/scorer/plateAppearances/:plateAppearanceId",
        this.state
      )
    ) {
      let team = state.getTeam(this.state.teamId);
      let game = state.getGame(this.state.gameId);
      let plateAppearance = state.getPlateAppearance(
        this.state.plateAppearanceId
      );
      let player = state.getPlayer(plateAppearance.player_id);
      let plateAppearances = state.getPlateAppearancesForPlayerInGame(
        plateAppearance.player_id,
        this.state.gameId
      );
      let isNew = this.state.isNew;
      return React.createElement(CardPlateAppearance, {
        team: team,
        game: game,
        player: player,
        plateAppearance: plateAppearance,
        plateAppearances: plateAppearances,
        origin: this.state.urlArray[5],
        isNew: isNew
      });
    } else if (MainContainer.matches(url, "/players", this.state)) {
      return React.createElement(CardPlayerList);
    } else if (MainContainer.matches(url, "/players/:playerId", this.state)) {
      return React.createElement(CardSpray, {
        playerId: this.state.playerId,
        origin: "players"
      });
    } else if (
      MainContainer.matches(url, "/players/:playerId/edit", this.state)
    ) {
      let player = state.getPlayer(this.state.playerId);
      let isNew = this.state.isNew;
      return React.createElement(CardPlayerEdit, {
        player: player,
        isNew: isNew
      });
    } else {
      return DOM.div(
        {
          style: {
            color: css.colors.TEXT_LIGHT
          }
        },
        "404 this resource could not be found"
      );
    }
  }

  render() {
    return DOM.div(
      {
        style: {}
      },
      this.renderCard(this.state.page)
    );
  }
};
