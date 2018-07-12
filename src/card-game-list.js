'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );
const dialog = require( 'dialog' );

const state = require( 'state' );

module.exports = class CardGameList extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleGameClick = function( game ) {
			expose.set_state( 'main', {
				page: 'Game',
				game: game.id
			} );
		};

		this.handleDeleteClick = function( game, ev ){
			dialog.show_confirm( 'Are you sure you want to delete the game vs "' + game.opponent + '"?', () => {
				state.removeGame( game.id, this.props.team.id );
			} );
			ev.stopPropagation();
		};

		this.handleEditClick = function( game, ev ) {
			expose.set_state( 'main', {
				page: 'GameEdit',
				game: game.id
			} );
			ev.stopPropagation();
		};

		this.handleCreateClick = function(){
			let game = state.addGame( this.props.team.id, '' );
			expose.set_state( 'main', {
				page: 'GameEdit',
				game: game.id
			} );
			/*
			dialog.show_input( 'Opponent Name', ( opposing_team_name ) => {
				let game = state.addGame( this.props.team.id, opposing_team_name );
				expose.set_state( 'main', {
					page: 'GameEdit',
					game: game.id
				} );
			} );
			*/
		}.bind( this );
	}

	renderGameList(){
		let elems = this.props.team.games.map( ( game ) => {
			return DOM.div( {
				game_id: game.id,
				key: 'game' + game.id,
				className: 'list-item',
				onClick: this.handleGameClick.bind( this, game ),
				style: {
					display: 'flex',
					justifyContent: 'space-between'
				}
			},
				DOM.div( {					
					className: 'preventOverflow'
				}, 'Vs. ' + game.opponent ),
				DOM.div( {
					style: {
						display: 'flex'
					}},
					DOM.img( {
						src: 'assets/ic_edit_white_24dp_1x.png',
						alt: 'edit',
						className: 'delete-button',
						onClick: this.handleEditClick.bind( this, game )
					} ),
					DOM.img( {
						src: 'assets/delete.png',
						alt: 'delete',
						className: 'delete-button',
						onClick: this.handleDeleteClick.bind( this, game )
					} )
				)
			);
		} );

		elems.push( DOM.div( {
			key: 'newteam',
			className: 'list-item add-list-item',
			onClick: this.handleCreateClick,
		}, '+ Add New Game' ) );

		return DOM.div( {

		}, elems );
	}

	render() {
		return DOM.div( {
				className: 'card',
				style: {
				}
			},
			this.renderGameList()
		);
	}
};
