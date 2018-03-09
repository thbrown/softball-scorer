'use strict';

const Autosuggest = require('react-autosuggest');
const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const languages = [
	{
		name: 'C',
		year: 1972
	},
];

module.exports = class CardPlayerSelection extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {
			value: '',
			players: [] // TODO
		};

		this.handleBackClick = () => {
			expose.set_state( 'main', {
				page: 'Lineup'
			} );
		};

		this.handleInputChange = ( ev ) => {
			this.setState( {
				value: ev.target.value
			} );
		};

		this.handleSubmitClick = () => {
			console.log('submit');
		}
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
			onClick: this.handleSubmitClick
		}, DOM.span( {
			className: 'no-select'
		}, 'Submit' )
		);
	}

	renderPlayerSelection() {
		const { value, suggestions } = this.state;
    const inputProps = {
      placeholder: "Type 'c'",
      value,
      onChange: this.onChange
    };
		return (
			<Autosuggest 
			suggestions={suggestions}
			onSuggestionsFetchRequested={this.onSuggestionsFetchRequested}
			onSuggestionsClearRequested={this.onSuggestionsClearRequested}
			getSuggestionValue={this.getSuggestionValue}
			renderSuggestion={this.renderSuggestion}
			onSuggestionSelected={this.onSuggestionSelected}
			inputProps={inputProps}/>
			);
	}

	onChange(event, { newValue, method }) {
		this.setState({
			value: newValue
		});
	}

	getSuggestionValue(suggestion) {
		if (suggestion.isAddNew) {
			return this.state.value;
		}

		return suggestion.name;
	}

	renderSuggestion(suggestion) {
		// if (suggestion.isAddNew) {
		// 	return (
		// 	<span>
		// 	[+] Add new: <strong>{this.state.value}</strong>
		// 	</span>
		// 	);
		// }

		return suggestion.name;
	}

	onSuggestionsFetchRequested({ value }) {
		this.setState({
			suggestions: getSuggestions(value)
		});
	}

	onSuggestionsClearRequested() {
		this.setState({
			suggestions: []
		});
	}

	onSuggestionSelected(event, { suggestion }) {
		if (suggestion.isAddNew) {
			console.log('Add new:', this.state.value);
		}
	}
};
