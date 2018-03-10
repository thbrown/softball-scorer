'use strict';

const Autosuggest = require('react-autosuggest');
const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const state = require( 'state' );

module.exports = class CardPlayerSelection extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();

		this.state = {
			value: '',
			suggestions: [],
			player: undefined,
		};

		this.handleBackClick = () => {
			expose.set_state( 'main', {
				page: 'Game'
			} );
		};

		this.handleInputChange = ( ev ) => {
			this.setState( {
				value: ev.target.value
			})
		};

		this.handleSubmitClick = () => {
			// console.log(this.state.player);
			state.addPlayerToLineup( this.props.game.lineup, this.state.player.id );
			expose.set_state( 'main', {
				page: 'Game'
			} );
		}

		this.onChange = (event, { newValue }) => {
			this.setState({
				value: newValue
			});
		};
	}

	renderPlayerSelection() {
		return DOM.div( {} , 
			DOM.div( {
				className: 'player-input-label'
			}, 'Player Name' ),
			DOM.input( {
				onChange: this.handleInputChange,
				placeholder: 'Player Name',
				className: 'player-input',
			},  )
		)
	}

	render() {
		return DOM.div( {
				style: {
				}
			},
			DOM.div( {
				className: 'card-title',
			},
			DOM.img( {
					src: 'assets/ic_arrow_back_white_36dp_1x.png',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				}),
				DOM.div( {
					style: {
					}
				}, 'Player' )
			),
			this.renderPlayerSelection(),
			this.renderSubmitButton(),
		);
	}

	renderSubmitButton() {
		return DOM.div( {
			className: 'button confirm-button',
			style: {
				marginTop: '48px',
				marginLeft: '16px',
			},
			onClick: this.handleSubmitClick
		}, DOM.span( {
			className: 'no-select'
		}, 'Submit' )
		);
	}

	renderPlayerSelection() {
		const { value, suggestions } = this.state;
		const inputProps = {
			placeholder: "Player Name",
			value,
			onChange: this.onChange.bind(this)
		};
		return React.createElement( Autosuggest, 
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
			return this.state.value;
		}
		return suggestion.name;
	}

	renderSuggestion(suggestion) {
		if (suggestion.isAddNew) {
			return DOM.span(
				{},
				'[+] Add new: ' + this.state.value
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
			console.log('This does not work yet', this.state.value);
		}
		this.setState({
			player: suggestion,
		});
	}
};
