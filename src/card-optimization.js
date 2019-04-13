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
        page: `/optimizations/${
          props.optimization.id
        }/overrides/${"jh893ehq9eh"}`
      });
    };

    this.handleAddPlayerClick = function(event) {
      console.log("Add player");
    };

    this.data = {
      label: "search me",
      value: "searchme",
      children: [
        {
          label: "search me too",
          value: "searchmetoo",
          children: [
            {
              label: "No one can get me",
              value: "anonymous"
            }
          ]
        }
      ]
    };

    this.onChange = (currentNode, selectedNodes) => {
      console.log("onChange::", currentNode, selectedNodes);
    };
    this.onAction = ({ action, node }) => {
      console.log(`onAction:: [${action}]`, node);
    };
    this.onNodeToggle = currentNode => {
      console.log("onNodeToggle::", currentNode);
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
                <tbody>
                  <tr className="title">
                    <th height="35">Name</th>
                    <th width="40">Outs</th>
                    <th width="35">1B</th>
                    <th width="35">2B</th>
                    <th width="35">3B</th>
                    <th width="35">HR</th>
                    <th width="48" />
                  </tr>
                  <tr className="overriden">
                    <td height="48" className="name">
                      Olaf VonGardenburger
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
                        onClick={this.handleOverrideClick.bind(this)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td height="48" className="name">
                      Jan
                    </td>
                    <td>373</td>
                    <td>721</td>
                    <td>223</td>
                    <td>122</td>
                    <td>133</td>
                    <td>
                      <img
                        src="/server/assets/tune-black.svg"
                        alt=">"
                        className="tableButton"
                        onClick={this.handleOverrideClick.bind(this)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td height="48" className="name">
                      Trey Martin
                    </td>
                    <td>27</td>
                    <td>12</td>
                    <td>2</td>
                    <td>2</td>
                    <td>6</td>
                    <td>
                      <img
                        src="/server/assets/tune-black.svg"
                        alt=">"
                        className="tableButton"
                        onClick={this.handleOverrideClick.bind(this)}
                      />
                    </td>
                  </tr>
                  <tr>
                    <td height="48" className="name">
                      Heidi Smenger
                    </td>
                    <td>37</td>
                    <td>72</td>
                    <td>2</td>
                    <td>0</td>
                    <td>1</td>
                    <td>
                      <img
                        src="/server/assets/tune-black.svg"
                        alt=">"
                        className="tableButton"
                        onClick={this.handleOverrideClick.bind(this)}
                      />
                    </td>
                  </tr>
                </tbody>
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
              <div id="gamesMenu">
                <label>
                  <input type="checkbox" onChange={this.onChange} checked />
                  Tims Team
                </label>
                <label>
                  <input type="checkbox" onChange={this.onChange} />
                  Alphabats
                </label>
                <label>
                  <input type="checkbox" onChange={this.onChange} />
                  Mom's Pasgetti
                </label>
              </div>
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
