'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const CardLineup = require( 'card-lineup' );
const CardScorer = require( 'card-scorer' );

let tab = 'lineup';

module.exports = class CardGame extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();

		tab = props.tab || tab;

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: `/teams/${this.props.team.id}/games`
			} );
		}.bind( this );

		this.handleTabClick = function( t ) {
			tab = t;
			expose.set_state( 'main', {
				page: `/teams/${this.props.team.id}/games/${this.props.game.id}/${tab}`
			} );
		}.bind( this );
	}

	render() {
		let subcard = '';
		if( tab === 'lineup' ) {
			subcard = React.createElement( CardLineup, {
				team: this.props.team,
				game: this.props.game
			} );
		} else if( tab === 'scorer' ) {
			subcard = React.createElement( CardScorer, {
				team: this.props.team,
				game: this.props.game
			} );
		}

		return DOM.div( {
				style: {
					className: 'card'
				}
			},
			DOM.div( {
				className: 'card-title',
			},
				DOM.img( {
					src: '/assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
					alt: 'back'
				}),
				DOM.div( {
					style: {
						display: 'flex',
						justifyContent: 'space-between',
						// Adjusting for back arrow.
						marginLeft: '56px',
					}
				},
					DOM.div( {
						onClick: this.handleTabClick.bind( this, 'lineup' ),
						style: {
							width: '50%',
							borderBottom: tab === 'lineup' ? '5px solid ' + css.colors.TEXT_LIGHT : 'none',
						}
					}, 'Lineup' ),
					DOM.div( {
						onClick: this.handleTabClick.bind( this, 'scorer' ),
						style: {
							width: '50%',
							borderBottom: tab === 'scorer' ? '5px solid ' + css.colors.TEXT_LIGHT : 'none',
						}
					}, 'Scorer' )
				),
			),
			subcard
		);
	}
};
