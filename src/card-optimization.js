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

module.exports = class CardOptimization extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();
    this.state = {
      optimizationType: props.optimization.type
    };

    this.parsedInclusions = JSON.parse(this.props.optimization.inclusions);

    this.handleSongHelpClick = function(event) {
      event.stopPropagation();
      dialog.show_notification(
        // TODO - Read this from a file so the format isn't dependent on indent spaces.
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

    this.handleAddPlayerClick = function(event) {
      console.log("Add/Remove players");
      expose.set_state("main", {
        page: `/optimizations/${props.optimization.id}/overrides/player-select`
      });
    };

    this.handleTeamCheckboxClick = function(event, team) {
      console.log(event, team);
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

    this.switchAccordion = function(e) {
      e.preventDefault();
      var accordionTitle = e.currentTarget.parentNode.nextElementSibling;
      var accordionContent = e.currentTarget;
      var accordionChevron = e.currentTarget.children[0];
      if (accordionTitle.classList.contains("is-collapsed")) {
        this.setAccordionAria(accordionContent, accordionTitle, "true");
      } else {
        this.setAccordionAria(accordionContent, accordionTitle, "false");
      }
      accordionContent.classList.toggle("is-collapsed");
      accordionContent.classList.toggle("is-expanded");
      accordionTitle.classList.toggle("is-collapsed");
      accordionTitle.classList.toggle("is-expanded");
      accordionChevron.classList.toggle("chevronExpanded");

      accordionTitle.classList.toggle("animateIn");
    }.bind(this);

    // Attach listeners to the accordion
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
        this.switchAccordion,
        false
      );
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

    let playerIds = this.parsedInclusions.staging.players;
    for (let i = 0; i < playerIds.length; i++) {
      let player = state.getPlayer(playerIds[i]);
      //getPlateAppearancesForPlayerOnTeam
      playerTable.push(
        <tr key={"row" + player.id} className="overriden">
          <td height="48" className="name">
            {player.name}
          </td>
          <td>13</td>
          <td>12</td>
          <td>2</td>
          <td>1</td>
          <td>0</td>
          <td height="48">
            <img
              src="/server/assets/tune-black.svg"
              alt=">"
              className="tableButton"
              onClick={this.handleOverrideClick.bind(this, player)}
            />
          </td>
        </tr>
      );
    }

    // Build teams checkboxes
    let teams = state.getLocalState().teams;
    let teamsCheckboxes = [];
    console.log(teams);
    for (let i = 0; i < teams.length; i++) {
      let team = teams[i];
      teamsCheckboxes.push(
        <label key={team.name + "checkboxLabel"}>
          <input
            key={team.name + "checkbox"}
            type="checkbox"
            onChange={this.handleTeamCheckboxClick.bind(this, team)}
          />
          {team.name}
        </label>
      );
    }

    return (
      <div className="accordionContainer">
        <div className="text-div">Status: NOT_STARTED</div>
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
                  maxLength: "9",
                  label: "Iterations",
                  onChange: this.onChange,
                  defaultValue: 10000
                })}
                {React.createElement(FloatingInput, {
                  key: "innings",
                  id: "innings",
                  maxLength: "9",
                  label: "Innings to Simulate",
                  onChange: this.onChange,
                  defaultValue: 7
                })}
                {React.createElement(FloatingPicklist, {
                  id: "lineupType",
                  label: "Lineup Type",
                  defaultValue: "Normal",
                  onChange: this.onChange
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
            <input type="checkbox" onChange={this.onChange} />
            Send me an email when the simulation is complete.
          </label>
          <div
            className="edit-button button cancel-button"
            onClick={this.onChange}
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
