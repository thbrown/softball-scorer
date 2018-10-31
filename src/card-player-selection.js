'use strict';

const Autosuggest = require('react-autosuggest');
const React = require('react');
const expose = require('./expose');
const DOM = require('react-dom-factories');

const state = require('state');

module.exports = class CardPlayerSelection extends expose.Component {
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

		this.handleBackClick = () => {
			expose.set_state('main', {
				page: `/teams/${this.props.team.id}/games/${this.props.game.id}`
			});
		};

		this.handleRadioButtonChange = (event) => {
			this.setState({
				gender: event.target.value
			});
		};

		this.handleSubmitClick = () => {
			if (this.state.createNewPlayer) {
				this.state.player =
					state.addPlayer(
						this.state.playerNameValue,
						this.state.gender);
			}
			state.addPlayerToLineup(this.props.game.lineup, this.state.player.id);
			expose.set_state('main', {
				page: `/teams/${this.props.team.id}/games/${this.props.game.id}`
			});
		};

		this.onChange = (event, { newValue }) => {
			this.setState({
				playerNameValue: newValue
			});
		};
	}

	render() {
		return DOM.div({
			style: {
			}
		},
			DOM.div({
				className: 'card-title',
			},
				DOM.img({
					src: '/server/assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
					alt: 'back'
				}),
				DOM.div({
					className: 'prevent-overflow card-title-text-with-arrow',
				}, 'Player')
			),
			this.renderPlayerSelection(),
			this.maybeRenderGenderRadioButton(),
			this.renderSubmitButton()
		);
	}

	renderSubmitButton() {
		return DOM.div({
			className: 'button confirm-button',
			style: {
				marginLeft: '16px',
			},
			onClick: this.handleSubmitClick
		}, DOM.span({
			className: 'no-select'
		}, 'Submit')
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
					DOM.label({
						htmlFor: 'maleGenderChoice',
					}, 'Male')
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
					DOM.label({
						htmlFor: 'femaleGenderChoice',
					}, 'Female')
				)
			);
		}
		return null;
	}

	renderPlayerSelection() {
		const { playerNameValue } = this.state;
		const inputProps = {
			placeholder: "Player Name",
			maxLength: "50",
			value: playerNameValue,
			onChange: this.onChange.bind(this)
		};
		return React.createElement(Autosuggest,
			{
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

		const suggestions = inputLength === 0 ? [] : players.filter(player => {
			if (playersAlreadyInLineup.includes(player.id)) {
				return false;
			}
			return player.name.toLowerCase().slice(0, inputLength) === inputValue;
		});
		if (suggestions.length === 0) {
			return [
				{ isAddNew: true }
			];
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
			return DOM.span(
				{},
				'[+] Add new: ' + this.state.playerNameValue
			);
		}

		return DOM.div({}, suggestion.name);
	}

	onSuggestionsFetchRequested({ value }) {
		this.setState({
			suggestions: this.getSuggestions(value)
		});
	}

	onSuggestionsClearRequested() {
		this.setState({
			suggestions: []
		});
	}

	onSuggestionSelected(event, { suggestion }) {
		if (suggestion.isAddNew) {
			this.setState({
				createNewPlayer: true
			});
		} else {
			this.setState({
				player: suggestion,
				createNewPlayer: false,
			});
		}
	}
};
