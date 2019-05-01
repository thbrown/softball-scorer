"use strict";

const React = require("react");
const DOM = require("react-dom-factories");

const dialog = require("dialog");
const expose = require("./expose");
const state = require("state");

const FloatingInput = require("component-floating-input");
const FloatingPicklist = require("component-floating-picklist");
const LeftHeaderButton = require("component-left-header-button");
const RightHeaderButton = require("component-right-header-button");

const ACCORDION_QUERYPARAM_PREFIX = "acc";

module.exports = class CardOptimization extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.state = {};

    this.handleSongHelpClick = function(event) {
      event.stopPropagation();
      dialog.show_notification(
        // TODO - Read this from a file so the format isn't dependent on whitespace spaces.
        `**Walkup Song**

Clips can be played from the player's plate appearance page

![Plate appearance scoring screenshot](/server/assets/help-walkup.svg)`,
        undefined
      );
    };

    this.handleOverrideClick = function(player) {
      expose.set_state("main", {
        page: `/optimizations/${props.optimization.id}/overrides/${player.id}`
      });
    };

    this.handleAddPlayerClick = function() {
      expose.set_state("main", {
        page: `/optimizations/${props.optimization.id}/overrides/player-select`
      });
    };

    this.handleTeamCheckboxClick = function(team) {
      let parsedInclusions = JSON.parse(this.props.optimization.inclusions);
      let teams = parsedInclusions.staging.teams;
      let newSet = new Set(teams);
      if (teams.includes(team.id)) {
        newSet.delete(team.id);
        state.putOptimizationTeams(props.optimization.id, Array.from(newSet));
      } else {
        newSet.add(team.id);
        state.putOptimizationTeams(props.optimization.id, Array.from(newSet));
      }
    };

    this.onChange = function(fieldName, value) {
      state.putOptimizationDetail(this.props.optimization.id, fieldName, value);
    };
  }

  componentDidMount() {
    this.skipClickDelay = function(e) {
      e.preventDefault();
      e.target.click();
    };

    this.setAriaAttr = function(el, ariaType, newProperty) {
      el.setAttribute(ariaType, newProperty);
    };
    this.setAccordionAria = function(el1, el2, expanded) {
      switch (expanded) {
        case "true":
          this.setAriaAttr(el1, "aria-expanded", "true");
          this.setAriaAttr(el2, "aria-hidden", "false");
          break;
        case "false":
          this.setAriaAttr(el1, "aria-expanded", "false");
          this.setAriaAttr(el2, "aria-hidden", "true");
          break;
        default:
          break;
      }
    };

    this.switchAccordion = function(index, e) {
      e.preventDefault();
      var accordionTitle = e.currentTarget.parentNode.nextElementSibling;
      var accordionContent = e.currentTarget;
      var accordionChevron = e.currentTarget.children[0];
      if (accordionTitle.classList.contains("is-collapsed")) {
        this.setAccordionAria(accordionContent, accordionTitle, "true");
        state.editQueryObject(ACCORDION_QUERYPARAM_PREFIX + index, true);
      } else {
        this.setAccordionAria(accordionContent, accordionTitle, "false");
        state.editQueryObject(ACCORDION_QUERYPARAM_PREFIX + index, null);
      }
      accordionContent.classList.toggle("is-collapsed");
      accordionContent.classList.toggle("is-expanded");
      accordionTitle.classList.toggle("is-collapsed");
      accordionTitle.classList.toggle("is-expanded");
      accordionChevron.classList.toggle("chevronExpanded");

      accordionTitle.classList.toggle("animateIn");
    };

    // Attach listeners to the accordion (and click if necessary)
    let queryObject = state.getQueryObj();
    let accordionToggles = document.querySelectorAll(".js-accordionTrigger");
    for (var i = 0, len = accordionToggles.length; i < len; i++) {
      if ("ontouchstart" in window) {
        accordionToggles[i].addEventListener(
          "touchstart",
          this.skipClickDelay,
          false
        );
      }
      if ("pointerdown" in window) {
        accordionToggles[i].addEventListener(
          "pointerdown",
          this.skipClickDelay,
          false
        );
      }
      accordionToggles[i].addEventListener(
        "click",
        this.switchAccordion.bind(this, i),
        false
      );

      // Open the accordions indicated by he query params
      if (queryObject[ACCORDION_QUERYPARAM_PREFIX + i] === "true") {
        accordionToggles[i].click();
      }
    }
  }

  renderOptimizationPage() {
    // Build players table
    const playerTable = [];
    playerTable.push(
      <tr key="header" className="title">
        <th height="35">Name</th>
        <th width="40">Outs</th>
        <th width="35">1B</th>
        <th width="35">2B</th>
        <th width="35">3B</th>
        <th width="35">HR</th>
        <th width="48" />
      </tr>
    );

    let displayPlayers = [];
    let parsedInclusions = JSON.parse(this.props.optimization.inclusions);
    if (
      this.props.optimization.status ===
      state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
    ) {
      let playerIds = parsedInclusions.staging.players;
      for (let i = 0; i < playerIds.length; i++) {
        let displayPlayer = {};

        let player = state.getPlayer(playerIds[i]);
        if (!player) {
          continue; // Player may have been deleted
        }
        let plateAppearances = state.getPlateAppearancesForPlayerInGameOrOnTeam(
          player.id,
          parsedInclusions.staging.teams,
          null
        );

        displayPlayer.name = player.name;
        displayPlayer.player = player; // This will be undefined for other statuses

        // Check to see if there are manual overrides of the stats for this player
        let existingOverride = parsedInclusions.staging.overrides[player.id];
        if (existingOverride) {
          Object.assign(displayPlayer, existingOverride);
          displayPlayer.isOverride = true;
        } else {
          let fullStats = state.buildStatsObject(player.id, plateAppearances);
          displayPlayer["Outs"] = fullStats.atBats - fullStats.hits;
          displayPlayer["1B"] = fullStats.singles + fullStats.walks;
          displayPlayer["2B"] = fullStats.doubles;
          displayPlayer["3B"] = fullStats.triples;
          displayPlayer["HR"] =
            fullStats.insideTheParkHR + fullStats.outsideTheParkHR;
          displayPlayer.isOverride = false;
        }

        displayPlayers.push(displayPlayer);
      }
    } else {
      displayPlayers = parsedInclusions.execution.players;
    }

    for (let i = 0; i < displayPlayers.length; i++) {
      playerTable.push(
        <tr
          key={"row" + i}
          className={displayPlayers[i].isOverride ? "overriden" : undefined}
        >
          <td height="48" className="name">
            {displayPlayers[i].name}
          </td>
          <td>{displayPlayers[i]["Outs"]}</td>
          <td>{displayPlayers[i]["1B"]}</td>
          <td>{displayPlayers[i]["2B"]}</td>
          <td>{displayPlayers[i]["3B"]}</td>
          <td>{displayPlayers[i]["HR"]}</td>
          <td height="48">
            <img
              src="/server/assets/tune-black.svg"
              alt=">"
              className="tableButton"
              onClick={this.handleOverrideClick.bind(
                this,
                displayPlayers[i].player
              )}
            />
          </td>
        </tr>
      );
    }

    // Build teams checkboxes
    let teams = state.getLocalState().teams;
    let teamsCheckboxes = [];
    if (
      this.props.optimization.status ===
      state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
    ) {
      let selectedTeams = new Set(parsedInclusions.staging.teams);
      for (let i = 0; i < teams.length; i++) {
        let team = teams[i];
        teamsCheckboxes.push(
          <label key={team.name + "checkboxLabel"}>
            <input
              key={team.name + "checkbox"}
              type="checkbox"
              onChange={this.handleTeamCheckboxClick.bind(this, team)}
              checked={selectedTeams.has(team.id)}
            />
            {team.name}
          </label>
        );
      }
    } else {
      let selectedTeams = parsedInclusions.execution.teams;
      for (let i = 0; i < selectedTeams.length; i++) {
        teamsCheckboxes.push(
          <label key={selectedTeams[i].name + "checkboxLabel"}>
            <input
              key={selectedTeams[i].name + "checkbox"}
              type="checkbox"
              checked={true}
              disabled="true"
            />
            {selectedTeams[i].name}
          </label>
        );
      }
    }

    // Parse simulaton details
    let parsedDetals = JSON.parse(this.props.optimization.details);
    return (
      <div className="accordionContainer">
        <div className="text-div">
          Status:{" "}
          {
            state.OPTIMIZATION_STATUS_ENUM_INVERSE[
              this.props.optimization.status
            ]
          }
        </div>
        <div className="accordion">
          <dl>
            <dt>
              <div
                aria-expanded="false"
                aria-controls="accordion1"
                className="accordion-title accordionTitle js-accordionTrigger"
              >
                <img
                  src="/server/assets/chevron-right.svg"
                  alt=">"
                  className="chevron"
                />
                Players
              </div>
            </dt>
            <dd
              className="accordion-content accordionItem is-collapsed"
              id="accordion1"
              aria-hidden="true"
            >
              <table className="playerTable">
                <tbody>{playerTable}</tbody>
              </table>
              <div
                className="edit-button button cancel-button"
                onClick={this.handleAddPlayerClick}
              >
                + Add/Remove Players
              </div>
            </dd>
            <dt>
              <div
                aria-expanded="false"
                aria-controls="accordion2"
                className="accordion-title accordionTitle js-accordionTrigger"
              >
                <img
                  src="/server/assets/chevron-right.svg"
                  alt=">"
                  className="chevron"
                />
                Games
              </div>
            </dt>
            <dd
              className="accordion-content accordionItem is-collapsed"
              id="accordion2"
              aria-hidden="true"
            >
              <div id="gamesMenu">{teamsCheckboxes}</div>
            </dd>
            <dt>
              <div
                aria-controls="accordion3"
                className="accordion-title accordionTitle js-accordionTrigger"
              >
                <img
                  src="/server/assets/chevron-right.svg"
                  alt=">"
                  className="chevron"
                />
                Simulation Options
              </div>
            </dt>
            <dd
              className="accordion-content accordionItem is-collapsed"
              id="accordion3"
              aria-hidden="true"
            >
              <div id="simulationOptionsMenu">
                {React.createElement(FloatingInput, {
                  key: "iterations",
                  id: "iterations",
                  maxLength: "12",
                  label: "Iterations",
                  onChange: this.onChange.bind(this, "iterations"),
                  type: "number",
                  defaultValue: parsedDetals.iterations,
                  disabled:
                    this.props.optimization.status !==
                    state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
                })}
                {React.createElement(FloatingInput, {
                  key: "innings",
                  id: "innings",
                  maxLength: "12",
                  label: "Innings to Simulate",
                  onChange: this.onChange.bind(this, "innings"),
                  maxLength: "2",
                  type: "number",
                  defaultValue: parsedDetals.innings,
                  disabled:
                    this.props.optimization.status !==
                    state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
                })}
                {React.createElement(FloatingPicklist, {
                  id: "lineupType",
                  label: "Lineup Type",
                  defaultValue: parsedDetals.lineupType, //state.LINEUP_TYPE_ENUM.NORMAL,
                  onChange: this.onChange.bind(this, "lineupType"),
                  disabled:
                    this.props.optimization.status !==
                    state.OPTIMIZATION_STATUS_ENUM.NOT_STARTED
                })}
              </div>
            </dd>
            <dt>
              <div
                aria-expanded="false"
                aria-controls="accordion4"
                className="accordion-title accordionTitle js-accordionTrigger"
              >
                <img
                  src="/server/assets/chevron-right.svg"
                  alt=">"
                  className="chevron"
                />
                Results
                {/*
                <div className="help-container">
                  <img
                    src="/server/assets/help.svg"
                    alt="?"
                    onClick={this.handleSongHelpClick}
                  />
                </div>
                */}
              </div>
            </dt>
            <dd
              className="accordion-content accordionItem is-collapsed"
              id="accordion3"
              aria-hidden="true"
            >
              <p>
                Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi
                eu interdum diam. Donec interdum porttitor risus non bibendum.
                Maecenas sollicitudin eros in quam imperdiet placerat. Cras
                justo purus, rhoncus nec lobortis ut, iaculis vel ipsum. Donec
                dignissim arcu nec elit faucibus condimentum. Donec facilisis
                consectetur enim sit amet varius. Pellentesque justo dui,
                sodales quis luctus a, iaculis eget mauris.{" "}
              </p>
            </dd>
          </dl>
        </div>
        <div id="footer">
          <label>
            <input type="checkbox" onChange={this.onEmailCheckbox} />
            Send me an email when the simulation is complete.
          </label>
          <div
            className="edit-button button cancel-button"
            onClick={this.onStartSimulation}
          >
            Start Simulation
          </div>
        </div>
      </div>
    );
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
        React.createElement(LeftHeaderButton),
        DOM.div(
          {
            className: "card-title-text-with-arrow prevent-overflow"
          },
          this.props.optimization.name
        ),
        React.createElement(RightHeaderButton)
      ),
      this.renderOptimizationPage()
    );
  }
};
