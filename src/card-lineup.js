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

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: 'Team'
			} );
		};

		this.handleDeleteClick = function( player, ev ){
			dialog.show_confirm( 'Do you want to remove "' + player.name + '" from the lineup?', () => {
				//state.removeFromLineup( game.id, this.props.team.id );
			} );
			ev.stopPropagation();
		};

		this.handleCreateClick = function(){
			dialog.show_input( 'Other Team Name', ( opposing_team_name ) => {
				state.addGame( this.props.team.id, opposing_team_name );
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
			console.log( 'game:', this.props.game, 'team:', this.props.team );
			return DOM.div( { className: 'page-error' }, 'Lineup: No game or team exists.' );
		}

		let elems = this.props.game.lineup.map( ( player_id ) => {
			let player = state.getPlayer( player_id );
			
			let player_name = DOM.div( {
				key: 'name',
				className: 'handle',
				style: {
					color: 'white',
					fontSize: '14px',
					width: '64px',
					overflow: 'hidden',
					textOverflow: 'ellipsis'
				}
			}, player.name );

			let del = DOM.div( {
				key: 'del',
				className: 'delete-button',
				onClick: this.handleDeleteClick.bind( this, player ),
				style: {
					fontSize: '16px',
					lineHeight: '40px',
					padding: '2px'
				}
			}, 'X' );

			let elems = [];
			for( let i = 0; i < 7; i++ ){
				let plateAppearance = state.getPlateAppearance( this.props.team.id, this.props.game.id, player.id, i + 1 );
				let text = '';
				if( plateAppearance ){
					text = plateAppearance.result;
				}
				
				elems.push( DOM.div( {
					key: 'box' + ( i + 1 ),
					onClick: this.handleBoxClick.bind( this, player, i + 1 ),
					className: 'lineup-box',
					style: {
						textAlign: 'center',
						color: 'black',
						lineHeight: '40px'
					}
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
				style: {
					display: 'flex',
					justifyContent: 'space-around'
				}
			},
				player_name,
				boxes,
				del
			);


			return React.createElement( Draggable, {
				key: 'lineup-draggable' + player.id,
				axis: 'y',
				handle: '.handle',
				//defaultPosition: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				grid: [ 1, 1 ],
				onStart: this.handleDragStart.bind( this, player ),
				onStop: this.handleDragStop.bind( this, player ),
				onDrag: this.handleDrag.bind( this, player )
			}, div );
		} );

		elems.unshift( DOM.div( { key: 'lineup-padding', id: 'lineup-padding', style: { 'display': 'none', height: '52px' } } ) );

		return DOM.div( {

		}, elems );
	}

	render() {
		return DOM.div( {
				style: {
				}
			},
			DOM.div( {
				className: 'card-title',
				style: {
				}
			},
				DOM.div( {
					onClick: this.handleBackClick,
					dangerouslySetInnerHTML: {
						__html: '&#9664;'
					},
					style: {
						float: 'left',
						width: '0px',
						padding: '4px',
						fontSize: '32px',
					}
				} ),
				DOM.div( {
					style: {
					}
				}, 'Lineup' )
			),
			this.renderLineupPlayerList()
		);
	}
};
