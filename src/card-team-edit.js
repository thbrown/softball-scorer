'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );
const dialog = require( 'dialog' );

module.exports = class CardTeamEdit extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();

		this.team = props.team;

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: 'TeamList'
			} );
		};

		this.handleDeleteClick = function() {
			dialog.show_confirm( 'Are you sure you want to delete the team "' + props.team.name + '"?', () => {
				state.removeTeam( props.team.id );
				expose.set_state( 'main', {
					page: 'TeamList'
				} );
			} );
		};

		this.handleNameChange = function() {
			let newValue = document.getElementById( 'name' ).value;
			props.team.name = newValue;
		}
	}

	renderTeamEdit() {
		return DOM.div( {
			className: 'auth-input-container',
		},
		DOM.input( {
			key: 'teamName',
			id: 'name',
			className: 'auth-input', // TODO: make css name generic?
			placeholder: 'Team Name',
			onChange: this.handleNameChange,
			defaultValue: this.team.name
		} ),
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
					src: 'assets/ic_arrow_back_white_36dp_1x.png',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				} ),
				DOM.div( {
					style: {
						justifyContent: 'space-between',
					}
				}, 'Edit Team' ),
			),
			this.renderTeamEdit()
		);
	}
};
