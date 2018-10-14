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

		this.player = props.player;
		this.isNew = props.isNew;

		let playerCopy = JSON.parse(JSON.stringify(this.player));

		let returnToPlayersListPage = function() {
			expose.set_state( 'main', {
				page: `/menu`
			} );
		}

		this.handleBackClick = function() {
			state.replacePlayer( props.player.id, playerCopy );
			returnToPlayersListPage();
		};

		this.handleConfirmClick = function() {
			state.replacePlayer( props.player.id, playerCopy );
			returnToPlayersListPage();
		};

		this.handleCancelClick = function() {
			if(props.isNew) {
				state.removePlayer( props.player.id );
			}
			returnToPlayersListPage();
		};

		this.handleDeleteClick = function() {
			dialog.show_confirm( 'Are you sure you want to delete the player "' + props.player.name + '"?', () => {
				if(state.removePlayer( props.player.id )) {
					returnToPlayersListPage();
				} else {
					dialog.show_notification(
						`Unable to delete player ${props.player.name}. This player either has existing plate appearances or is listed on at least one game's lineup.`
					);
				}
			} );
		};

		this.handlePlayerNameChange = function() {
			let newValue = document.getElementById( 'playerName' ).value;
			playerCopy.name = newValue;
		}

		this.handleGenderChange = function( event ) {
			playerCopy.gender = event.target.value;
		}

		this.handleSongLinkChange = function() {
			let newValue = document.getElementById( 'songLink' ).value;
			let dataArray = newValue.split(/\/|\?|\=|%3D|&/);
			for(let i = 0; i < dataArray.length; i++) {
				let results = dataArray[i].match(/[0-9a-zA-Z-_]{11}/);
				if(results && results.length === 1) {
					playerCopy.song_link = results[0];
				}
			}
		}

		this.handleSongStartChange = function() {
			let newValue = document.getElementById( 'songStart' ).value;
			playerCopy.song_start = newValue;
		}

	}

	componentDidMount() {
		if(this.player.gender === 'F') {
			document.getElementById('femaleGenderChoice').checked = true;
		} else {
			document.getElementById('maleGenderChoice').checked = true;
		}
	}

	renderPlayerEdit() {
		return DOM.div( {
			className: 'auth-input-container',
		},
			[
				DOM.input( {
					key: 'playerName',
					id: 'playerName',
					className: 'auth-input', // TODO: make css name generic?
					placeholder: 'Player Name',
					maxLength: '50',
					onChange: this.handlePlayerNameChange,
					defaultValue: this.player.name
				} )
			,
				DOM.div(
					{
						key: 'genderPanel',
						className: 'radio-button',
					},
					DOM.div(
					{
						className: 'radio-button-option',
					},
						DOM.input( {
							type: 'radio',
							name: 'gender',
							value: 'M',
							id: 'maleGenderChoice',
							onChange: this.handleGenderChange,
						}),
						DOM.label( {
							htmlFor: 'maleGenderChoice',
						}, 'Male')
					),
					DOM.div(
					{
						className: 'radio-button-option',
					},
						DOM.input( {
							type: 'radio',
							name: 'gender',
							value: 'F',
							id: 'femaleGenderChoice',
							onChange: this.handleGenderChange,
						}),
						DOM.label( {
							htmlFor: 'femaleGenderChoice',
						}, 'Female')
					)
				)
			,
				DOM.input( {
					key: 'songLink',
					id: 'songLink',
					className: 'auth-input',
					placeholder: 'Walk up song youtube link (Optional)',
					maxLength: '50',
					onChange: this.handleSongLinkChange,
					defaultValue: this.player.song_link ? `https://youtu.be/${this.player.song_link}` : ""
				} )
			,
				DOM.input( {
					key: 'songStart',
					id: 'songStart',
					className: 'auth-input',
					placeholder: 'Song start time in seconds (Optional)',
					maxLength: '50',
					type:'number',
					min:"0",
					step:"1",
					onChange: this.handleSongStartChange,
					defaultValue: this.player.song_start
				} )
			],
		this.renderSaveOptions(),
		);
	}

	renderSaveOptions() {
		let buttons = [];

		buttons.push(
			DOM.div( {
				key: 'confirm',
				className: 'edit-button button confirm-button',
				onClick: this.handleConfirmClick,
			},
			DOM.img( {
				src: '/server/assets/check.svg',
				alt: 'back'
			} ),
			'Save')
		);

		buttons.push(
			DOM.div( {
				key: 'cancel',
				className: 'edit-button button cancel-button',
				onClick: this.handleCancelClick,
			}, 
			DOM.img( {
				src: '/server/assets/cancel.svg',
			} ),
			'Cancel')
		);

		if(!this.isNew) {
			buttons.push(
				DOM.div( {
					key: 'delete',
					className: 'edit-button button cancel-button',
					onClick: this.handleDeleteClick,
				}, 
				DOM.img( {
					src: '/server/assets/delete.svg',
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


	render() {
		return DOM.div( {
				className: 'card',
				style: {}
			},
			DOM.div( {
					className: 'card-title'
				},
				DOM.img( {
					src: '/server/assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
					alt: 'back'
				} ),
				DOM.div( {
					className: 'card-title-text-with-arrow',
				}, 'Edit Player' ),
			),
			this.renderPlayerEdit()
		);
	}
};
