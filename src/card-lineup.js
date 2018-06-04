'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const dialog = require( 'dialog' );
const Draggable = require( 'react-draggable' );

const state = require( 'state' );

module.exports = class CardLineup extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.elemHeight = 76;

		const hideHighlights = () => {
			let highlights = document.getElementsByClassName( 'highlight' );
			for ( let i = 0; i < highlights.length; i++ ) {
				highlights[ i ].style.visibility = 'hidden';
			}
		};

		const showHighlight = ( i ) => {
			let elem = document.getElementById( 'highlight' + i );
			if( elem ) {
				elem.style.visibility = 'visible';
			}
		};

		const getInds = ( elem, index ) => {
			const deltaY = parseInt( elem.style.transform.slice( 15 ) ) - 15;
			const diff = Math.floor( deltaY / this.elemHeight ) + 1;
			let highlight_index = index + diff;
			if( diff >= 0 ) {
				highlight_index++;
			}
			if( highlight_index <= -1 ) {
				highlight_index = 0;
			}
			if( highlight_index > this.props.game.lineup.length ){
				highlight_index = this.props.game.lineup.length;
			}
			let new_position_index = highlight_index;
			if( diff >= 0 ) {
				new_position_index--;
			}
			return { highlight_index, new_position_index };
		};

		this.clamp = function( num, min, max ) {
			return num <= min ? min : num >= max ? max : num;
		};

		this.handleDeleteClick = function( player, ev ) {
			dialog.show_confirm( 'Do you want to remove "' + player.name + '" from the lineup?', () => {
				state.removePlayerFromLineup( this.props.game.lineup, player.id );
			} );
			ev.stopPropagation();
		};

		this.handleCreateClick = function() {
			expose.set_state( 'main', {
				page: 'PlayerSelection',
			} );
		}.bind( this );

		this.handleBoxClick = function( player, plateAppearance_ct ) {
			expose.set_state( 'main', {
				page: 'Atbat',
				player: player.id,
				plateAppearance: plateAppearance_ct
			} );
		}.bind( this );

		this.handleNewPlateAppearanceClick = function( player, game_id, team_id ) {
			let plateAppearance = state.addPlateAppearance( player.id, game_id, team_id );
			expose.set_state( 'main', {
				page: 'Atbat',
				player: player.id,
				plateAppearance: plateAppearance.id
			} );
		}.bind( this );

		this.handleDragStart = function( player ) {
			//this.disableTouchAction();
			let elem = document.getElementById( 'lineup_' + player.id );
			elem.style[ 'z-index' ] = 100;
			elem.style.position = 'absolute';
			document.getElementById( 'lineup-padding' ).style.display = 'block';
		};

		this.handleDragStop = function( player, index ) {
			//this.enableTouchAction();
			hideHighlights();
			let elem = document.getElementById( 'lineup_' + player.id );
			elem.style[ 'z-index' ] = 1;
			elem.style.position = null;
			document.getElementById( 'lineup-padding' ).style.display = 'none';
			const { new_position_index } = getInds( elem, index );
			state.updateLineup( this.props.game.lineup, player.id, new_position_index );
		};

		this.handleDrag = function( player, index ) {
			hideHighlights();
			const elem = document.getElementById( 'lineup_' + player.id );
			const { highlight_index } = getInds( elem, index );
			showHighlight( highlight_index );
		};

	}

	disableTouchAction() {
		Array.prototype.forEach.call( document.getElementsByClassName( 'lineup-row' ), ( elem ) => {
			elem.style[ 'touch-action' ] = 'none';
		} );
	}

	enableTouchAction() {
		Array.prototype.forEach.call( document.getElementsByClassName( 'lineup-row' ), ( elem ) => {
			elem.style[ 'touch-action' ] = null;
		} );
	}

	componentDidMount() {
		//this.enableTouchAction();
	}

	renderLineupPlayerList() {
		if ( !this.props.game || !this.props.team ) {
			console.log( 'game:', this.props.game, 'team:', this.props.team, 'lineup:', !this.props.game.lineup );
			return DOM.div( { className: 'page-error' }, 'Lineup: No game, team, or lineup exist.' );
		}

		let pageElems = [];

		pageElems = pageElems.concat( this.props.game.lineup.map( ( player_id, index ) => {
			const player = state.getPlayer( player_id );
			const plateAppearances = state.getPlateAppearancesForPlayerInGame( player.id, this.props.game.id );
			let elems = [];
			elems.push( DOM.div( {
				key: 'handle',
				className: 'player-drag-handle',
			}, DOM.img( {
				src: 'assets/drag-handle.png',
				style: {
					height: '40px'
				}
			} ) ) );
			elems.push( DOM.div( {
				key: 'name',
				className: 'player-name',
			}, player.name ) );
			elems.push( DOM.div( {
				key: 'boxes',
				style: {
					display: 'flex',
					justifyContent: 'flex-start'
				}
			}, plateAppearances.map( ( pa, i ) => {
					pa = pa || {};
					return DOM.div( {
						key: 'box' + i,
						onClick: this.handleBoxClick.bind( this, player, pa.id ),
						className: 'lineup-box',
					}, DOM.div( {}, pa.result || '' ) );
				} ).concat( [
					DOM.div( {
						key: 'newPa' + player.id,
						onClick: this.handleNewPlateAppearanceClick.bind( this, player, this.props.game.id, this.props.team.id ),
						className: 'lineup-box',
					}, DOM.div( {}, '+' ) )
				] )
			) );
			elems.push( DOM.img( {
				key: 'del',
				src: 'assets/ic_close_white_24dp_1x.png',
				className: 'delete-button',
				style: {
					paddingTop: '6px',
				},
				onClick: this.handleDeleteClick.bind( this, player )
			} ) );

			return React.createElement( Draggable, {
				key: 'lineup-draggable' + player.id,
				axis: 'y',
				handle: '.player-drag-handle',
				//defaultPosition: { x: 0, y: 0 },
				position: { x: 0, y: 0 },
				grid: [ 1, 1 ],
				onStart: this.handleDragStart.bind( this, player ),
				onStop: this.handleDragStop.bind( this, player, index ),
				onDrag: this.handleDrag.bind( this, player, index )
			}, DOM.div( {
					id: 'lineup_' + player.id,
					className: 'lineup-row',
				}, elems )
			);
		} ).reduce( ( acc, next, i ) => {
			acc.push( DOM.div( {
				key: 'highlight' + ( i ),
				id: 'highlight' + ( i ),
				className: 'highlight',
				style: {
					visibility: 'hidden'
				}
			} ) );
			acc.push( next );
			return acc;
		}, [] ) );

		pageElems.push( DOM.div( {
			id: 'highlight' + this.props.game.lineup.length,
			key: 'highlight' + this.props.game.lineup.length,
			className: 'highlight',
			style: {
				visibility: 'hidden'
			}
		} ) );

		pageElems.push( DOM.div( {
			key: 'newplayer',
			className: 'list-item add-list-item',
			onClick: this.handleCreateClick,
		}, '+ Add New Player' ) );

		pageElems.unshift( DOM.div( {
			key: 'lineup-padding',
			id: 'lineup-padding',
			style: {
				display: 'none',
				height: '4px'
			}
		} ) );

		return DOM.div( {}, pageElems );
	}

	render() {
		return DOM.div( {
				style: {}
			},
			this.renderLineupPlayerList()
		);
	}
};
