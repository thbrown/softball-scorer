"use strict";

const DOM = require("react-dom-factories");
const React = require("react");
const Select = require("react-select").default;

const expose = require("./expose");
const state = require("state");

const LeftHeaderButton = require("component-left-header-button");
const RightHeaderButton = require("component-right-header-button");

// This is a more generic player selection card to replace card-player-selection
module.exports = class CardPlayerSelect extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    let players = state.getAllPlayersAlphabetically();
    let options = [];
    for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
      options.push({
        value: players[playerIndex].id,
        label: players[playerIndex].name
      });
    }

    this.state = {
      players: undefined,
      options: options,
      typed: "",
      gender: "M"
    };

    this.onInputChange = function(inputValue) {
      this.setState({
        typed: inputValue
      });
    };

    this.handleRadioButtonChange = function(event) {
      this.setState({
        gender: event.target.value
      });
    };

    this.handleSubmitClick = function() {
      props.onComplete(this.state.players);
      history.back();
    };

    this.handleCancelClick = function() {
      history.back();
    };

    this.homeOrBack = function() {
      this.handleSubmitClick().bind(this);
    };

    this.onChange = function(selectedOptions) {
      let valuesOnly = Array.from(selectedOptions.slice(0).map(v => v.value));
      this.setState({
        players: valuesOnly
      });
    };

    this.onCreatePlayerClick = function() {
      // Duplicate options
      let optionsCopy = JSON.parse(JSON.stringify(this.state.options));
      optionsCopy.push({ label: this.state.typed, value: this.state.typed });
      this.setState({
        options: optionsCopy
      });

      state.addPlayer(this.state.typed, this.state.gender);
    };

    this.noOptionsMessage = function() {
      return (
        <div>
          Add a new player: <br />
          First name: <b>{this.state.typed}</b>
          <br />
          <input
            type="radio"
            onClick={this.handleRadioButtonChange.bind(this)}
            name="gender"
            value="M"
          />{" "}
          Male
          <input
            type="radio"
            onClick={this.handleRadioButtonChange.bind(this)}
            name="gender"
            value="female"
          />{" "}
          Female <br />
          <button type="button" onClick={this.onCreatePlayerClick.bind(this)}>
            Create
          </button>
        </div>
      );
    };

    // https://react-select.com/styles
    this.customStyles = {
      option: (provided, state) => {
        let modifications = {
          borderBottom: "1px dotted pink",
          color: state.isSelected ? "red" : "blue",
          padding: 15
        };
        return Object.assign(provided, modifications);
      },
      multiValue: (provided, state) => {
        let modifications = {
          padding: 14
        };
        return Object.assign(provided, modifications);
      }
    };
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
        React.createElement(LeftHeaderButton, {
          onPress: this.homeOrBack
        }),
        DOM.div(
          {
            className: "card-title-text-with-arrow"
          },
          "Add/Remove Players"
        ),
        React.createElement(RightHeaderButton, {
          onPress: this.homeOrBack
        })
      ),
      this.renderPlayerSelection(),
      this.renderButtons()
    );
  }
  renderButtons() {
    return (
      <div>
        <div id="spacer" />
        {/* style={{ height: "310px" }}  // TODO: This would put the buttons below the dropdown, but leavs a big blank space. We should make it this big only when dropdown is open. */}
        <div>
          <div
            className="edit-button button confirm-button"
            style={{ marginLeft: "16px" }}
            onClick={this.handleSubmitClick.bind(this)}
          >
            Submit
          </div>
        </div>
        <div>
          <div
            className="edit-button button cancel-button"
            style={{ marginLeft: "16px" }}
            onClick={this.handleCancelClick}
          >
            Cancel
          </div>
        </div>
      </div>
    );
  }

  renderPlayerSelection() {
    return (
      <div className="buffer">
        <Select
          isMulti
          styles={this.customStyles}
          options={this.state.options}
          autosize={false}
          closeMenuOnSelect={false}
          blurInputOnSelect={false}
          onChange={this.onChange.bind(this)}
          onInputChange={this.onInputChange.bind(this)}
          noOptionsMessage={this.noOptionsMessage.bind(this)}
        />
      </div>
    );
  }
};
