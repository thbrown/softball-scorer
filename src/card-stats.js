'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );

const state = require( 'state' );

const DSC_CHAR = "▼";//"\25bc";
const ASC_CHAR = "▲";//"\25be";

let sortField = "name";
let sortDirection = "DSC";

module.exports = class CardStats extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {
			sortField: sortField,
			sortDirection: sortDirection
		};

		this.handleStatsClick = function(sortField) {
			if(this.state.sortDirection === "DSC" && this.state.sortField === sortField) {
				sortDirection = "ASC";
				let newField = document.getElementById(sortField);
				newField.innerHTML = newField.innerHTML.substr(0, newField.innerHTML.length - ASC_CHAR.length) + ASC_CHAR;
			} else {
				sortDirection = "DSC";
				if(this.state.sortField === sortField) {
					let newField = document.getElementById(sortField);
					newField.innerHTML = newField.innerHTML.substr(0, newField.innerHTML.length - DSC_CHAR.length) + DSC_CHAR;
				} else {
					let newField = document.getElementById(sortField);
					let oldField = document.getElementById(this.state.sortField);
					newField.innerHTML = newField.innerHTML + DSC_CHAR;
					oldField.innerHTML = oldField.innerHTML.substr(0, oldField.innerHTML.length - ASC_CHAR.length);
				}
			}

			this.setState({
				sortField: sortField,
				sortDirection: sortDirection
			} );
		}.bind( this );

		this.handlePlayerClick = function(playerId) {
			expose.set_state( 'main', {
				page: 'Spray',
				player: playerId
			} );
		}
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
				if(isNaN(a[this.state.sortField] ) || isNaN(b[this.state.sortField])) {
					return a[this.state.sortField] > b[this.state.sortField];
				} else {
					return parseFloat(a[this.state.sortField]) < parseFloat(b[this.state.sortField]);
				}
			} else {
				if(isNaN(a[this.state.sortField]) || isNaN(b[this.state.sortField])) {
					return a[this.state.sortField] < b[this.state.sortField];
				} else {
					return parseFloat(a[this.state.sortField]) > parseFloat(b[this.state.sortField]);
				}
			}
		} ).map( ( playerStats ) => {
			
			return DOM.div( {
				//player_id: playerStats.id,
				key: 'player' + playerStats.id,
				className: 'table-row',
			},
				DOM.div( {
					onClick: this.handlePlayerClick.bind( this, playerStats.id ),
					style: {
						overflow: 'scroll',
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
					id: "name",
					onClick: this.handleStatsClick.bind( this, "name" ),
					style: {
						width: '100px'
					}
				}, "Name" + DSC_CHAR ),
				DOM.span( {
					id: "battingAverage",
					onClick: this.handleStatsClick.bind( this, "battingAverage" ),
					className: 'percentage-stat-cell-header',
					style: {
					}
				}, "BA" ),
				DOM.span( {
					id: "sluggingPercentage",
					onClick: this.handleStatsClick.bind( this, "sluggingPercentage" ),
					className: 'percentage-stat-cell-header',
					style: {
					}
				}, "SLG" ),
				DOM.span( {
					id: "atBats",
					onClick: this.handleStatsClick.bind( this, "atBats" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "AB" ),
				DOM.div( {
					id: "doubles",
					onClick: this.handleStatsClick.bind( this, "doubles" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "2B" ),
				DOM.div( {
					id: "triples",
					onClick: this.handleStatsClick.bind( this, "triples" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "3B" ),
				DOM.div( {
					id: "insideTheParkHR",
					onClick: this.handleStatsClick.bind( this, "insideTheParkHR" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "HRI" ),
				DOM.div( {
					id: "outsideTheParkHR",
					onClick: this.handleStatsClick.bind( this, "outsideTheParkHR" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "HRO" ),
				DOM.div( {
					id: "walks",
					onClick: this.handleStatsClick.bind( this, "walks" ),
					className: 'number-stat-cell-header',
					style: {
					}
				}, "BB" ),
				DOM.div( {
					id: "reachedOnError",
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
