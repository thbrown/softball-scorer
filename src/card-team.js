'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const CardStats = require( 'card-stats' );
const CardGameList = require( 'card-game-list' );

let tab = 'games';

module.exports = class CardTeam extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {
			tab: tab
		};

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: 'TeamList'
			} );
		};

		this.handleTabClick = function( t ) {
			tab = t;
			this.setState( {
				tab: t
			} );
		}.bind( this );
	}

	render() {
		let subcard = '';
		if( this.state.tab === 'stats' ) {
			subcard = React.createElement( CardStats, { team: this.props.team } );
		} else if( this.state.tab === 'games' ) {
			subcard = React.createElement( CardGameList, { team: this.props.team } );
		}

		return DOM.div( {
				style: {
				}
			},
			DOM.div( {
				className: 'card-title',
			},
				DOM.img( {
					src: 'assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				}),
				DOM.div( {
					style: {
						display: 'flex',
						justifyContent: 'space-between',
						// Adjusting for back-arrow.
						marginLeft: '60px',
					}
				},
					DOM.div( {
						onClick: this.handleTabClick.bind( this, 'stats' ),
						style: {
							width: '50%',
							borderBottom: this.state.tab === 'stats' ? '5px solid ' + css.colors.TEXT_LIGHT : 'none',
						}
					}, 'Stats' ),
					DOM.div( {
						onClick: this.handleTabClick.bind( this, 'games' ),
						style: {
							width: '50%',
							borderBottom: this.state.tab === 'games' ? '5px solid ' + css.colors.TEXT_LIGHT : 'none',
						}
					}, 'Games' )
				)
			),
			subcard
		);
	}
};
