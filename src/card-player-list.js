'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );

const state = require( 'state' );

module.exports = class CardPlayerList extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};
	}

	renderPlayerList(){
		const s = state.getState();
		let players = s.players.filter( ( player ) => {
			return this.props.team.games.reduce( ( result, game ) => {
				return result || game.lineup.indexOf( player.id ) > -1;
			}, false );
		} ).map( ( player ) => {
			let stats = state.buildStatsObject(this.props.team.id, player.id);
			return DOM.div( {
				player_id: player.id,
				key: 'player' + player.id,
				className: 'table-row',
				//onClick: this.handleButtonClick.bind( this, team )
			},
				DOM.div( {
					style: {
						width: '100px'
					}
				}, player.name ),
				DOM.div( {
					style: {
					}
				}, stats.battingAverage ),
				DOM.div( {
					style: {
					}
				}, stats.atBats ),
				DOM.div( {
					style: {
					}
				}, stats.sluggingPercentage ),
				DOM.div( {
					style: {
					}
				}, stats.doubles ),
				DOM.div( {
					style: {
					}
				}, stats.triples ),
				DOM.div( {
					style: {
					}
				}, stats.insideTheParkHR ),
				DOM.div( {
					style: {
					}
				}, stats.outsideTheParkHR ),
				DOM.div( {
					style: {
					}
				}, stats.walks ),
				DOM.div( {
					style: {
					}
				}, stats.reachsOnError )
			);
		} );

		let header = DOM.div( {
					key: 'header',
					className: 'table-row',
				}, DOM.span( {
					style: {
						width: '100px'
					}
				}, "Name" ),
				DOM.span( {
					style: {
					}
				}, "BA" ),
				DOM.span( {
					style: {
					}
				}, "AB" ),
				DOM.span( {
					style: {
					}
				}, "SLG" ),
				DOM.div( {
					style: {
					}
				}, "2B" ),
				DOM.div( {
					style: {
					}
				}, "3B" ),
				DOM.div( {
					style: {
					}
				}, "HRI" ),
				DOM.div( {
					style: {
					}
				}, "HRO" ),
				DOM.div( {
					style: {
					}
				}, "BB" ),
				DOM.div( {
					style: {
					}
				}, "ROE" ));

		let elems = [];
		elems.push(header);
		elems.push(players);

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
