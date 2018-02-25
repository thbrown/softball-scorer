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
		const s = state.getState();
		let elems = s.players.filter( ( player ) => {
			return this.props.team.games.reduce( ( result, game ) => {
				return result || game.lineup.indexOf( player.id ) > -1;
			}, false );
		} ).map( ( player ) => {
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
				}, 0.754 ),
				DOM.div( {
					style: {
					}
				}, 4 )
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
