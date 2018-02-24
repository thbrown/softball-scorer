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
				DOM.div( {
					onClick: this.handleBackClick,
					dangerouslySetInnerHTML: {
						__html: '&#9664;'
					},
					style: {
						width: '10%',
						padding: '4px',
						fontSize: '32px',
					}
				} ),
				DOM.div( {
					onClick: this.handleTabClick.bind( this, 'players' ),
					style: {
						padding: '6px 0px',
						fontSize: '32px',
						width: '40%',
						backgroundColor: this.state.tab === 'players' ? css.colors.PRIMARY : css.colors.BG
					}
				}, 'Players' ),
				DOM.div( {
					onClick: this.handleTabClick.bind( this, 'games' ),
					style: {
						padding: '6px 0px',
						fontSize: '32px',
						width: '40%',
						backgroundColor: this.state.tab === 'games' ? css.colors.PRIMARY : css.colors.BG
					}
				}, 'Games' )
			),
			subcard
		);
	}
};
