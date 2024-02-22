import React from 'react';
import { getGlobalState } from 'state';
import Card from 'elements/card';
import Select from 'react-select';
import ListButton from 'elements/list-button';
import { goBack, setRoute } from 'actions/route';

export default class CardPlayerSelect extends React.Component {
  constructor(props) {
    super(props);

    const players = this.props.players;
    let options = [];
    for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
      let entry = {
        value: players[playerIndex].id,
        label: players[playerIndex].name,
      };
      options.push(entry);
    }

    let startingValues = [];
    for (let i = 0; i < props.selected.length; i++) {
      let player = getGlobalState().getPlayer(props.selected[i]);
      if (!player) {
        // Player may have been deleted, this should remove them going forward  (only applicable
        // for the optimization players list, players in a lineup can't be deleted)
        continue;
      }
      let entry = {
        value: player.id,
        label: player.name,
      };
      startingValues.push(entry);
    }

    this.state = {
      players: Array.from(startingValues.slice(0).map((v) => v.value)),
      options: options,
      startingValues: startingValues,
      typed: '',
      gender: 'M',
      menuIsOpen: false,
    };

    this.onInputChange = function (inputValue) {
      this.adjustSpacerDivHeight();
      this.setState({
        typed: inputValue,
      });

      // Open menu if the user has type anything
      let menuIsOpen = false;
      if (inputValue) {
        menuIsOpen = true;
      }
      this.setState({
        menuIsOpen,
      });
    };

    this.handleRadioButtonChange = function (event) {
      this.setState({
        gender: event.target.value,
      });
    };

    this.handleConfirmClick = function () {
      props.onComplete(this.state.players);
      goBack();
    };

    this.handleCancelClick = function () {
      goBack();
    };

    this.handleBackClick = () => {
      goBack();
    };

    this.handleBackOrHome = function () {
      props.onComplete(this.state.players);
    };

    this.onChange = function (selectedOptions) {
      if (selectedOptions) {
        let valuesOnly = Array.from(
          selectedOptions.slice(0).map((v) => v.value)
        );
        this.setState({
          players: valuesOnly,
        });
      } else {
        this.setState({
          players: [],
        });
      }
    };

    // Lots of bad code in this method, see comments
    this.adjustSpacerDivHeight = function () {
      let adjust = function () {
        // Neither of these are good selectors, but I'm not sure how else to get the menu
        // height from inside the component
        //let menus = document.querySelectorAll('div[class$="-menu"]');
        //if (!menus) {
        // Idk why the '-menu' suffix is left off the css class for builds on some computers
        // but not for builds on others, here is an alternative selector
        let menus = [
          document.getElementById('select-container').children[0].children[2],
        ];
        //}
        let height = 10;
        if (menus.length === 1 && menus[0]) {
          height = menus[0].clientHeight;
        }
        let spacer = document.getElementById('spacer');
        if (spacer) {
          spacer.style.height = `${height}px`; // inline style :(
        }
      };

      // Lame way to make sure this gets the height after it's been rendered (Maybe this
      // can go as a callback to setState instead?)
      setTimeout(adjust, 10);
    };

    this.onCreatePlayerClick = function () {
      let newPlayer = getGlobalState().addPlayer(
        this.state.typed,
        this.state.gender
      );

      // Duplicate options
      let optionsCopy = JSON.parse(JSON.stringify(this.state.options));
      optionsCopy.push({ label: newPlayer.name, value: newPlayer.id });
      this.setState({
        options: optionsCopy,
      });
    };

    this.noOptionsMessage = function () {
      if (!this.state.typed) {
        return <div>Type a name to add a new player</div>;
      }
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
          />{' '}
          Male
          <input
            type="radio"
            onClick={this.handleRadioButtonChange.bind(this)}
            name="gender"
            value="F"
          />{' '}
          Female <br />
          <button type="button" onClick={this.onCreatePlayerClick.bind(this)}>
            Create
          </button>
        </div>
      );
    };

    // https://react-select.com/styles
    this.customStyles = {
      option: (provided) => {
        const modifications = {
          padding: 15,
        };
        return Object.assign(provided, modifications);
      },
      multiValue: (provided) => {
        const modifications = {
          padding: 8,
        };
        return Object.assign(provided, modifications);
      },
      menu: (provided) => {
        const modifications = {
          padding: 1,
        };
        return Object.assign(provided, modifications);
      },
    };
  }

  renderButtons() {
    return (
      <div>
        <div id="spacer" style={{ transition: 'height .25s' }} />
        <div>
          <ListButton
            onClick={this.handleConfirmClick.bind(this)}
            type="primary-button"
          >
            Confirm Selection
          </ListButton>
        </div>
        <div>
          <ListButton onClick={this.handleCancelClick}>Cancel</ListButton>
        </div>
        <ListButton id="import" onClick={this.props.onImportClick}>
          Import From Another Game
        </ListButton>
      </div>
    );
  }

  renderPlayerSelection() {
    return (
      <div id="select-container" className="buffer">
        <Select
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
          menuIsOpen={this.state.menuIsOpen}
          placeholder={"Type a player's name..."}
        />
      </div>
    );
  }

  render() {
    return (
      <Card
        title="Add/Remove Players"
        leftHeaderProps={{
          onClick: this.handleBackClick,
        }}
      >
        {this.renderPlayerSelection()}
        {this.renderButtons()}
      </Card>
    );
  }
}
