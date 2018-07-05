'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );

const state = require( 'state' );

let sortField = "Name";
let sortDirection = "ASC";

module.exports = class CardPlayerList extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {
			sortField: sortField,
			sortDirection: sortDirection
		};

		this.handleStatsClick = function(a) {
			sortField = a;
			if(this.state.sortDirection === "DSC") {
				sortDirection = "ASC";
			} else {
				sortDirection = "DSC";
			}
			// TODO check if state is asc or dsc

			this.setState({
				sortField: sortField,
				sortDirection: sortDirection
			} );
		}.bind( this );
	}

	renderPlayerList(){
		const s = state.getState();
		let playerStats = s.players.filter( ( player ) => {
			return this.props.team.games.reduce( ( result, game ) => {
				return result || game.lineup.indexOf( player.id ) > -1;
			}, false );
		} ).map( ( player ) => {
			return state.buildStatsObject(this.props.team.id, player.id);
		} ).sort( ( a, b ) => {
			if(this.state.sortDirection === "DSC") {
				return a[this.state.sortField] < b[this.state.sortField];
			} else {
				return a[this.state.sortField] > b[this.state.sortField];
			}
		} ).map( ( playerStats ) => {
			
			return DOM.div( {
				player_id: playerStats.id,
				key: 'player' + playerStats.id,
				className: 'table-row',
			},
				DOM.div( {
					style: {
						width: '100px'
					}
				}, playerStats.name ),
				DOM.div( {
					className: 'percentage-stat-cell',
					style: {
					}
				}, playerStats.battingAverage ),
				DOM.div( {
					className: 'percentage-stat-cell',
					style: {
					}
				}, playerStats.sluggingPercentage ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, playerStats.atBats ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, playerStats.doubles ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, playerStats.triples ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, playerStats.insideTheParkHR ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, playerStats.outsideTheParkHR ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, playerStats.walks ),
				DOM.div( {
					className: 'number-stat-cell',
					style: {
					}
				}, playerStats.reachedOnError )
			);
		} );

		let header = DOM.div( {
					key: 'header',
					className: 'table-row',
				}, DOM.span( {
					onClick: this.handleStatsClick.bind( this, "name" ),
					style: {
						width: '100px'
					}
				}, "Name" ),
				DOM.span( {
					onClick: this.handleStatsClick.bind( this, "battingAverage" ),
					className: 'percentage-stat-cell-header',
					style: {
					}
				}, "BA" ),
				DOM.span( {
					onClick: this.handleStatsClick.bind( this, "sluggingPercentage" ),
					className: 'percentage-stat-cell-header',
					style: {
					}
				}, "SLG" ),
				DOM.span( {
					onClick: this.handleStatsClick.bind( this, "atBats" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "AB" ),
				DOM.div( {
					onClick: this.handleStatsClick.bind( this, "doubles" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "2B" ),
				DOM.div( {
					onClick: this.handleStatsClick.bind( this, "triples" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "3B" ),
				DOM.div( {
					onClick: this.handleStatsClick.bind( this, "insideTheParkHR" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "HRI" ),
				DOM.div( {
					onClick: this.handleStatsClick.bind( this, "outsideTheParkHR" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "HRO" ),
				DOM.div( {
					onClick: this.handleStatsClick.bind( this, "walks" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "BB" ),
				DOM.div( {
					onClick: this.handleStatsClick.bind( this, "reachedOnError" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "ROE" ));

		let elems = [];
		elems.push(header);
		elems.push(playerStats);

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
