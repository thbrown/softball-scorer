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
		this.isNew = props.isNew;

		let teamCopy = JSON.parse(JSON.stringify(this.team));

		let returnToTeamsListPage = function() {
			expose.set_state( 'main', {
				page: 'TeamList'
			} );
		}

		this.handleBackClick = function() {
			state.replaceTeam( props.team.id, teamCopy );
			returnToTeamsListPage();
		};

		this.handleConfirmClick = function() {
			state.replaceTeam( props.team.id, teamCopy );
			returnToTeamsListPage();
		};

		this.handleCancelClick = function() {
			if(props.isNew) {
				state.removeTeam( props.team.id );
			}
			returnToTeamsListPage();
		};

		this.handleDeleteClick = function() {
			dialog.show_confirm( 'Are you sure you want to delete the team "' + props.team.name + '"?', () => {
				state.removeTeam( props.team.id );
				returnToTeamsListPage();
			} );
		};

		this.handleNameChange = function() {
			let newValue = document.getElementById( 'name' ).value;
			teamCopy.name = newValue;
		}
	}

	renderSaveOptions() {
		let buttons = [];

		buttons.push(
			DOM.div( {
				key: 'confirm',
				className: 'button confirm-button',
				style: {
					width: 'auto',
					margin: '10px'
				},
				onClick: this.handleConfirmClick,
			},
			DOM.img( {
				src: '/assets/check.svg',
				alt: 'back'
			} ),
			'Save')
		);

		buttons.push(
			DOM.div( {
				key: 'cancel',
				className: 'button cancel-button',
				style: {
					width: 'auto',
					margin: '10px'
				},
				onClick: this.handleCancelClick,
			}, 
			DOM.img( {
				src: '/assets/cancel.svg',
			} ),
			'Cancel')
		);

		if(!this.isNew) {
			buttons.push(
				DOM.div( {
					key: 'delete',
					className: 'button cancel-button',
					style: {
						width: 'auto',
						margin: '10px'
					},
					onClick: this.handleDeleteClick,
				}, 
				DOM.img( {
					src: '/assets/delete.svg',
				} ),
				'Delete')
			);
		}

		return DOM.div( {
			key: 'saveOptions'
		},
			buttons
		)
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
		this.renderSaveOptions()
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
