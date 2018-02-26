'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );
const dialog = require( 'dialog' );

const state = require( 'state' );

module.exports = class CardPlayerList extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};
	}

	renderPlayerList(){
		console.log("Rendering player list");
		const s = state.getState();
		let elems = s.players.filter( ( player ) => {
			return this.props.team.games.reduce( ( result, game ) => {
				return result || game.lineup.indexOf( player.id ) > -1;
			}, false );
		} ).map( ( player ) => {
			console.log(player);
			let stats = state.buildStatsObject(player.id, this.props.team.id);
			return DOM.div( {
				player_id: player.id,
				key: 'player' + player.id,
				className: 'table-row',
				//onClick: this.handleButtonClick.bind( this, team )
			},
				DOM.div( {
					style: {
						width: '200px'
					}
				}, player.name ),
				DOM.div( {
					style: {
					}
				}, stats.avg ),
				DOM.div( {
					style: {
					}
				}, stats.ab )
			);
		} );

		return DOM.div( {

		}, elems );
	}

	render() {
		return DOM.div( {
				style: {
				}
			},
			this.renderPlayerList()
		);
	}
};
