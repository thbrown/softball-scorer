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
					className: 'percentage-stat-cell',
					style: {
					}
				}, stats.battingAverage ),
				DOM.div( {
					className: 'percentage-stat-cell',
					style: {
					}
				}, stats.sluggingPercentage ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, stats.atBats ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, stats.doubles ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, stats.triples ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, stats.insideTheParkHR ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, stats.outsideTheParkHR ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, stats.walks ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, stats.reachedOnError )
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
					className: 'percentage-stat-cell-header',
					style: {
					}
				}, "BA" ),
				DOM.span( {
					className: 'percentage-stat-cell-header',
					style: {
					}
				}, "SLG" ),
				DOM.span( {
					className: 'number-stat-cell-header',
					style: {
					}
				}, "AB" ),
				DOM.div( {
					className: 'number-stat-cell-header',
					style: {
					}
				}, "2B" ),
				DOM.div( {
					className: 'number-stat-cell-header',
					style: {
					}
				}, "3B" ),
				DOM.div( {
					className: 'number-stat-cell-header',
					style: {
					}
				}, "HRI" ),
				DOM.div( {
					className: 'number-stat-cell-header',
					style: {
					}
				}, "HRO" ),
				DOM.div( {
					className: 'number-stat-cell-header',
					style: {
					}
				}, "BB" ),
				DOM.div( {
					className: 'number-stat-cell-header',
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
				className: 'card',
				style: {
				}
			},
			this.renderPlayerList()
		);
	}
};
