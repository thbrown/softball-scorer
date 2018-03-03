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

		this.handleDeleteClick = function( game, ev ){
			dialog.show_confirm( 'Are you sure you want to delete the game vs "' + game.opponent + '"?', () => {
				state.removeGame( game.id, this.props.team.id );
			} );
			ev.stopPropagation();
		};

		this.handleGameClick = function( game ) {
			expose.set_state( 'main', {
				page: 'Lineup',
				game: game.id
			} );
		};

		this.handleCreateClick = function(){
			dialog.show_input( 'Other Team Name', ( opposing_team_name ) => {
				let game = state.addGame( this.props.team.id, opposing_team_name );
				expose.set_state( 'main', {
					page: 'Lineup',
					game: game.id
				} );
			} );
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
					style: {
						maxWidth: '300px'
					}
				}, 'Opp. ' + game.opponent ),
				DOM.div( {
					className: 'delete-button',
					onClick: this.handleDeleteClick.bind( this, game )
				}, 'X' )
			);
		} );

		elems.push( DOM.div( {
			key: 'newteam',
			className: 'list-item',
			onClick: this.handleCreateClick,
			style: {
				backgroundColor: css.colors.BG,
				color: 'gray',
			}
		}, '+ Add New Game' ) );

		return DOM.div( {

		}, elems );
	}

	render() {
		return DOM.div( {
				style: {
				}
			},
			this.renderGameList()
		);
	}
};
