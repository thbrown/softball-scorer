'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );
const dialog = require( 'dialog' );
const Draggable = require( 'react-draggable' );
const order = require( 'batting-order' );

const state = require( 'state' );

module.exports = class CardScorer extends expose.Component {
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

		this.handleBoxClick = function( player, plateAppearanceId ) {
			expose.set_state( 'main', {
				page: `/teams/${this.props.team.id}/games/${this.props.game.id}/scorer/plateAppearances/${plateAppearanceId}`
			} );
		}.bind( this );

		this.handleNewPlateAppearanceClick = function( player, game_id, team_id ) {
			let plateAppearance = state.addPlateAppearance( player.id, game_id, team_id );
			expose.set_state( 'main', {
				page: `/teams/${this.props.team.id}/games/${this.props.game.id}/scorer/plateAppearances/${plateAppearance.id}`
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

		// Handle walkup song clicks
		let clicked = {};
		var monitor = setInterval(function(){
		    var elem = document.activeElement;
		    if(elem && elem.tagName == 'IFRAME'){
		    	if(clicked[elem.id]) {
					// reload youtube iframe on second click
					let playerSong = document.getElementById('song');
					playerSong.innerHTML = playerSong.innerHTML;
					clicked[elem.id] = false;
		        } else {
		        	clicked[elem.id] = true;
		        }
		        document.activeElement.blur();
		    }
		}, 100);
	}

	renderLineupPlayerList(){
		if( !this.props.game || !this.props.team ) {
			console.error( 'game:', this.props.game, 'team:', this.props.team, 'lineup:', !this.props.game.lineup );
			return DOM.div( { className: 'page-error' }, 'Lineup: No game, team, or lineup exist.' );
		}

		let plateAppearances = state.getPlateAppearancesForGame(this.props.game.id);

		let elems = [];
		let startIndex = Math.max(plateAppearances.length - 5, 0); // Show the last 5 plate apperances
		for(let i = startIndex; i < plateAppearances.length; i++) {
			let plateAppearance = plateAppearances[i];
			let player = state.getPlayer( plateAppearance.player_id );

			let player_name = DOM.div( {
				key: 'name' + i,
				className: 'player-name prevent-overflow',
			}, ( i + 1 ) + ") " + player.name );

			let box = DOM.div( {
					key: 'box' + i,
					onClick: this.handleBoxClick.bind( this, player, plateAppearance.id ),
					className: 'lineup-box',
			}, DOM.div( {}, plateAppearance.result ) );

			let div = DOM.div( {
				id: 'pa_' + plateAppearance.id,
				key: 'pa' + plateAppearance.id,
				className: 'scorer-row',
				//onClick: this.handleButtonClick.bind( this, team )
			},
				player_name,
				box
			);

			elems.push(div);

		}

		elems.push(DOM.hr({key: 'divider'}));

		let currentBatter = order.getNthBatter(this.props.game.id, 1);
		let currentBatterEl = DOM.div( {
			key: 'currentBatter',
			className: 'player-name',
			}, "At Bat - " + (currentBatter ? currentBatter.name : "nobody"));

		let newPa = DOM.div( {
					key: 'newPa',
					onClick: this.handleNewPlateAppearanceClick.bind( this, currentBatter, this.props.game.id, this.props.team.id ),
					className: 'lineup-box',
		}, DOM.div( {}, '+' ) );
		
		if(currentBatter) {
			let walkup;
			if(currentBatter.song_link && currentBatter.song_start) {
				walkup = DOM.div( {
					id: 'song',
					key: 'song'
				}, DOM.iframe( {
					id: 'currentBatterSong',
					width: '32',
					height: '32',
					src: `https://thbrown.github.io/iframe-proxy/index.html?id=${currentBatter.song_link}&start=${currentBatter.song_start}`,
					allow: 'autoplay; encrypted-media',
					sandbox: 'allow-scripts allow-same-origin',
				}) );
			}
			elems.push( DOM.div( {
				id: 'currentBatter',
				key: 'currentBatterKey',
				className: 'future-batter-row',
			},
				currentBatterEl,
				walkup,
				newPa
			));
		} else {
			elems.push( DOM.div( {
				id: 'currentBatter',
				key: 'currentBatterKey',
				className: 'future-batter-row',
			},
				currentBatterEl
			));
		}

		let onDeckBatterBatter = order.getNthBatter(this.props.game.id, 2);
		let onDeckBatterEl = DOM.div( {
			key: 'onDeckBatter',
			className: 'player-name',
			}, "On Deck - " + (onDeckBatterBatter ? onDeckBatterBatter.name : "nobody"));
		elems.push( DOM.div( {
			id: 'onDeckBatterBatter',
			key: 'onDeckBatterKey',
			className: 'future-batter-row',
		},
			onDeckBatterEl
		));

		let inTheHoleBatter = order.getNthBatter(this.props.game.id, 3);
		let inTheHoleBatterEl = DOM.div( {
			key: 'inTheHoleBatter',
			className: 'player-name',
			}, "In the Hole - " + (inTheHoleBatter ? inTheHoleBatter.name : "nobody"));
		elems.push( DOM.div( {
			id: 'inTheHoleBatter',
			key: 'inTheHoleBatterKey',
			className: 'future-batter-row',
		},
			inTheHoleBatterEl
		));

		elems.unshift( DOM.div( { key: 'lineup-padding', id: 'lineup-padding', style: { 'display': 'none', height: '52px' } } ) );

		return DOM.div( {

		}, elems );
	}

	render() {
		return DOM.div( {
				className: 'card',
				style: {
				}
			},
			this.renderLineupPlayerList()
		);
	}
};
