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
      let entry = {
        value: players[playerIndex].id,
        label: players[playerIndex].name
      };
      options.push(entry);
    }

    let startingValues = [];
    for (let i = 0; i < props.selected.length; i++) {
      let player = state.getPlayer(props.selected[i]);
      //if (!player) {
      //  continue; // Player may have been deleted, TODO: remove this from the select as well?
      //}
      let entry = {
        value: player.id,
        label: player.name
      };
      startingValues.push(entry);
    }

    this.state = {
      players: Array.from(startingValues.slice(0).map(v => v.value)),
      options: options,
      startingValues: startingValues,
      typed: "",
      gender: "M"
    };

    this.onInputChange = function(inputValue) {
      this.adjustSpacerDivHeight();
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

    this.handleBackOrHome = function() {
      props.onComplete(this.state.players);
    };

    this.onChange = function(selectedOptions) {
      let valuesOnly = Array.from(selectedOptions.slice(0).map(v => v.value));
      this.setState({
        players: valuesOnly
      });
    };

    this.adjustSpacerDivHeight = function() {
      let adjust = function() {
        // not a great selector, but I'm not sure how else to get the menu height from inside the component
        let menus = document.querySelectorAll('div[class$="-menu"]');
        let height = 10;
        if (menus.length === 1) {
          height = menus[0].clientHeight;
        }
        let spacer = document.getElementById("spacer");
        if (spacer) {
          spacer.style.height = `${height}px`; // inline style :(
        }
      };

      // Lame way to make sure this gets the height after it's been rendered (Maybe this can go as a callback to setState instead?)
      setTimeout(adjust, 10);
    };

    this.onCreatePlayerClick = function() {
      let newPlayer = state.addPlayer(this.state.typed, this.state.gender);

      // Duplicate options
      let optionsCopy = JSON.parse(JSON.stringify(this.state.options));
      optionsCopy.push({ label: newPlayer.name, value: newPlayer.value });
      this.setState({
        options: optionsCopy
      });
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
          onPress: this.handleBackOrHome.bind(this)
        }),
        DOM.div(
          {
            className: "card-title-text-with-arrow"
          },
          "Add/Remove Players"
        ),
        React.createElement(RightHeaderButton, {
          onPress: this.handleBackOrHome.bind(this)
        })
      ),
      this.renderPlayerSelection(),
      this.renderButtons()
    );
  }
  renderButtons() {
    return (
      <div>
        <div id="spacer" style={{ transition: "height .25s" }} />
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
          inputId="test"
          isMulti
          styles={this.customStyles}
          options={this.state.options}
          autosize={false}
          closeMenuOnSelect={false}
          blurInputOnSelect={false}
          backspaceRemovesValue={false}
          onMenuOpen={this.adjustSpacerDivHeight}
          onMenuClose={this.adjustSpacerDivHeight}
          onChange={this.onChange.bind(this)}
          onInputChange={this.onInputChange.bind(this)}
          noOptionsMessage={this.noOptionsMessage.bind(this)}
          defaultValue={this.state.startingValues}
        />
      </div>
    );
  }
};
