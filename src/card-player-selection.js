import React from 'react';
import DOM from 'react-dom-factories';
import expose from './expose';
import state from 'state';
import LeftHeaderButton from 'component-left-header-button';
import RightHeaderButton from 'component-right-header-button';
import Autosuggest from 'react-autosuggest';
import { setRoute } from 'actions/route';

export default class CardPlayerSelection extends expose.Component {
  constructor(props) {
    super(props);
    this.expose();

    this.state = {
      playerNameValue: '',
      suggestions: [],
      player: undefined,
      createNewPlayer: false,
      gender: undefined,
    };

    this.handleRadioButtonChange = event => {
      this.setState({
        gender: event.target.value,
      });
    };

    this.handleSubmitClick = () => {
      if (this.state.createNewPlayer) {
        this.state.player = state.addPlayer(
          this.state.playerNameValue,
          this.state.gender
        );
      }
      state.addPlayerToLineup(this.props.game.lineup, this.state.player.id);
      window.history.back();
    };

    this.onChange = (event, { newValue }) => {
      this.setState({
        playerNameValue: newValue,
      });
    };
  }

  render() {
    return DOM.div(
      {
        style: {},
      },
      DOM.div(
        {
          className: 'card-title',
        },
        React.createElement(LeftHeaderButton, {}),
        DOM.div(
          {
            className: 'prevent-overflow card-title-text-with-arrow',
          },
          'Player'
        ),
        React.createElement(RightHeaderButton, {})
      ),
      DOM.div(
        {
          className: 'card-body',
        },
        this.renderPlayerSelection(),
        this.maybeRenderGenderRadioButton(),
        this.renderSubmitButton()
      )
    );
  }

  renderSubmitButton() {
    return DOM.div(
      {
        className: 'button confirm-button',
        style: {
          marginLeft: '16px',
        },
        onClick: this.handleSubmitClick,
      },
      DOM.span(
        {
          className: 'no-select',
        },
        'Submit'
      )
    );
  }

  maybeRenderGenderRadioButton() {
    if (this.state.createNewPlayer) {
      return DOM.div(
        {
          className: 'radio-button',
        },
        DOM.div(
          {
            className: 'radio-button-option',
          },
          DOM.input({
            type: 'radio',
            name: 'gender',
            value: 'M',
            id: 'maleGenderChoice',
            onChange: this.handleRadioButtonChange,
          }),
          DOM.label(
            {
              htmlFor: 'maleGenderChoice',
            },
            'Male'
          )
        ),
        DOM.div(
          {
            className: 'radio-button-option',
          },
          DOM.input({
            type: 'radio',
            name: 'gender',
            value: 'F',
            id: 'femaleGenderChoice',
            onChange: this.handleRadioButtonChange,
          }),
          DOM.label(
            {
              htmlFor: 'femaleGenderChoice',
            },
            'Female'
          )
        )
      );
    }
    return null;
  }

  renderPlayerSelection() {
    const { playerNameValue } = this.state;
    const inputProps = {
      placeholder: 'Player Name',
      maxLength: '50',
      value: playerNameValue,
      onChange: this.onChange.bind(this),
    };
    return React.createElement(Autosuggest, {
      suggestions: this.state.suggestions,
      onSuggestionsFetchRequested: this.onSuggestionsFetchRequested.bind(this),
      getSuggestionValue: this.getSuggestionValue.bind(this),
      renderSuggestion: this.renderSuggestion.bind(this),
      onSuggestionsClearRequested: this.onSuggestionsClearRequested.bind(this),
      onSuggestionSelected: this.onSuggestionSelected.bind(this),
      inputProps: inputProps,
    });
  }

  getSuggestions(value) {
    const inputValue = value.trim().toLowerCase();
    const inputLength = inputValue.length;

    // This could be more efficient.
    const players = state.getAllPlayers();
    const playersAlreadyInLineup = this.props.game.lineup;

    const suggestions =
      inputLength === 0
        ? []
        : players.filter(player => {
            if (playersAlreadyInLineup.includes(player.id)) {
              return false;
            }
            return (
              player.name.toLowerCase().slice(0, inputLength) === inputValue
            );
          });
    if (suggestions.length === 0) {
      return [{ isAddNew: true }];
    }
    return suggestions;
  }

  getSuggestionValue(suggestion) {
    if (suggestion.isAddNew) {
      return this.state.playerNameValue;
    }
    return suggestion.name;
  }

  renderSuggestion(suggestion) {
    if (suggestion.isAddNew) {
      return DOM.span({}, '[+] Add new: ' + this.state.playerNameValue);
    }

    return DOM.div({}, suggestion.name);
  }

  onSuggestionsFetchRequested({ value }) {
    this.setState({
      suggestions: this.getSuggestions(value),
    });
  }

  onSuggestionsClearRequested() {
    this.setState({
      suggestions: [],
    });
  }

  onSuggestionSelected(event, { suggestion }) {
    if (suggestion.isAddNew) {
      this.setState({
        createNewPlayer: true,
      });
    } else {
      this.setState({
        player: suggestion,
        createNewPlayer: false,
      });
    }
  }
}
