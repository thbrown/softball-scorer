'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const CardPlayerList = require( 'card-player-list' );
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
		if( this.state.tab === 'players' ) {
			subcard = React.createElement( CardPlayerList, { team: this.props.team } );
		} else if( this.state.tab === 'games' ) {
			subcard = React.createElement( CardGameList, { team: this.props.team } );
		}

		return DOM.div( {
				style: {
				}
			},
			DOM.div( {
				className: 'card-title',
				style: {
					display: 'flex',
					justifyContent: 'space-between'
				}
			},
				DOM.img( {
					src: 'assets/ic_arrow_back_white_36dp_1x.png',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				}),
				DOM.div( {
					onClick: this.handleTabClick.bind( this, 'players' ),
					style: {
						width: '45%',
						borderBottom: this.state.tab === 'players' ? '5px solid ' + css.colors.TEXT_LIGHT : 'none',
					}
				}, 'Players' ),
				DOM.div( {
					onClick: this.handleTabClick.bind( this, 'games' ),
					style: {
						width: '45%',
						borderBottom: this.state.tab === 'games' ? '5px solid ' + css.colors.TEXT_LIGHT : 'none',
					}
				}, 'Games' )
			),
			subcard
		);
	}
};
