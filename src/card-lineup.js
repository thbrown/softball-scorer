'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );
const dialog = require( 'dialog' );
const Draggable = require( 'react-draggable' );

const state = require( 'state' );

module.exports = class CardLineup extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleDeleteClick = function( player, ev ){
			dialog.show_confirm( 'Do you want to remove "' + player.name + '" from the lineup?', () => {
				state.removePlayerFromLineup( this.props.game.lineup, player.id );
			} );
			ev.stopPropagation();
		};

		this.handleCreateClick = function(){
			expose.set_state( 'main', {
				page: 'PlayerSelection'
			} );
		}.bind( this );

		this.handleBoxClick = function( player, plateAppearance_ct ) {
			expose.set_state( 'main', {
				page: 'Atbat',
				player: player.id,
				plateAppearance: plateAppearance_ct
			} );
		}.bind( this );

		this.handleDragStart = function( player ) {
			let elem = document.getElementById( 'lineup_' + player.id );
			elem.style[ 'z-index' ] = 100;
			elem.style.position = 'absolute';
		};
		this.handleDragStop = function( player ) {
			let elem = document.getElementById( 'lineup_' + player.id );
			elem.style[ 'z-index' ] = 1;
			elem.style.position = null;

			let deltaY = parseInt( elem.style.transform.slice( 15 ) ) - 15;
			let diff = Math.floor( deltaY / 52 );

			let position_index = this.props.game.lineup.indexOf( player.id );
			let new_position_index = position_index + diff + 1;
			state.updateLineup( this.props.game.lineup, player.id, new_position_index );
		};

		this.handleDrag = function() {

		};
	}

	renderLineupPlayerList(){
		if( !this.props.game || !this.props.team ) {
			console.log( 'game:', this.props.game, 'team:', this.props.team, 'lineup:', !this.props.game.lineup  );
			return DOM.div( { className: 'page-error' }, 'Lineup: No game, team, or lineup exist.' );
		}

		let elems = this.props.game.lineup.map( ( player_id ) => {
			let player = state.getPlayer( player_id );
			
			let player_name = DOM.div( {
				key: 'name',
				className: 'player-name',
			}, player.name );

			let del = DOM.img( {
					src: 'assets/ic_close_white_24dp_1x.png',
					className: 'delete-button',
					style: {
					  paddingTop: '6px',
					},
					onClick: this.handleDeleteClick.bind( this, player )
				});

			let elems = [];
			let plateAppearances = state.getPlateAppearancesForPlayerInGame( player.id, this.props.game.id);
			for( let i = 0; i < plateAppearances.length; i++ ){
				let plateAppearance = plateAppearances[i];
				let text = '';
				if( plateAppearance ){
					text = plateAppearance.result;
				}
				
				elems.push( DOM.div( {
					key: 'box' + i,
					onClick: this.handleBoxClick.bind( this, player, plateAppearance.id ),
					className: 'lineup-box',
				}, DOM.div( {}, text ) ) );
			}

			let boxes = DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'flex-start'
				}
			}, elems );
				

			let div = DOM.div( {
				id: 'lineup_' + player.id,
				key: 'lineup' + player.id,
				className: 'lineup-row',
				//onClick: this.handleButtonClick.bind( this, team )
			},
				player_name,
				boxes,
				del
			);

			return React.createElement( Draggable, {
				key: 'lineup-draggable' + player.id,
				axis: 'y',
				handle: '.player-name',
				//defaultPosition: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				grid: [ 1, 1 ],
				onStart: this.handleDragStart.bind( this, player ),
				onStop: this.handleDragStop.bind( this, player ),
				onDrag: this.handleDrag.bind( this, player )
			}, div );
		} );

		elems.push( DOM.div( {
			key: 'newplayer',
			className: 'list-item add-list-item',
			onClick: this.handleCreateClick,
		}, '+ Add New Player' ) );

		elems.unshift( DOM.div( { key: 'lineup-padding', id: 'lineup-padding', style: { 'display': 'none', height: '52px' } } ) );

		return DOM.div( {

		}, elems );
	}

	render() {
		return DOM.div( {
				style: {
				}
			},
			this.renderLineupPlayerList()
		);
	}
};
