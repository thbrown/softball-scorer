'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );
const dialog = require( 'dialog' );

module.exports = class CardGameEdit extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();

		this.game = props.game;

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: `/teams/${props.team.id}`
			} );
		};

		this.handleDeleteClick = function() {
			dialog.show_confirm( 'Are you sure you want to delete the game vs "' + props.game.opponent + '"?', () => {
				state.removeGame( props.game.id );
				expose.set_state( 'main', {
					page: `/teams/${props.team.id}`
				} );
			} );
		};

		this.handleOpponentNameChange = function() {
			let newValue = document.getElementById( 'opponentName' ).value;
			props.game.opponent = newValue;
		}

		this.handleLineupTypeChange = function() {
			let newValue = document.getElementById( 'lineupType' ).value;
			props.game.lineupType = parseInt(newValue);
		}

	}

	componentDidMount() {
		// Setting value on the select box seems to lock the select box to the value we set. So we'll edit it here.
		document.getElementById('lineupType').value = this.game.lineupType;
	}

	renderGameEdit() {
		return DOM.div( {
			className: 'auth-input-container',
		},
			[
				DOM.input( {
					key: 'opponentName',
					id: 'opponentName',
					className: 'auth-input', // TODO: make css name generic?
					placeholder: 'Opponent',
					onChange: this.handleOpponentNameChange,
					defaultValue: this.game.opponent
				} )
			,
				DOM.select( {
					key: 'lineupType',
					id: 'lineupType',
					className: 'auth-input',
					onChange: this.handleLineupTypeChange,
					style: {
						'marginTop':'8px'
					}
				},
					[
					DOM.option({key:'normal',value: 1},'Normal'),
					DOM.option({key:'alternate',value: 2},'Alternating Gender'),
					//DOM.option({key:'noConsecutive',value: 3},'No Consecutive Females')
					]
				)
				
			]
		//this.renderDeleteButton(),
		);
	}

	renderDeleteButton() {
		return DOM.div( {
			key: 'submit',
			id: 'submit',
			className: 'button confirm-button',
			onClick: this.handleDeleteClick,
			style: {
				marginLeft: '0'
			}
		}, 'Delete');
	}

	render() {
		return DOM.div( {
				className: 'card',
				style: {}
			},
			DOM.div( {
					className: 'card-title'
				},
				DOM.img( {
					src: '/assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
					alt: 'back'
				} ),
				DOM.div( {
					className: 'card-title-text-with-arrow',
				}, 'Edit Game' ),
			),
			this.renderGameEdit()
		);
	}
};
