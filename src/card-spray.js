'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );
const Draggable = require( 'react-draggable' );

const dialog = require( 'dialog' );
const state = require( 'state' );
const results = require('plate-appearance-results');

const normalize = function( x, A, B, C, D ) {
	return C + ( x - A ) * ( D - C ) / ( B - A );
};

module.exports = class CardAtBat extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: 'Team'
			} );
		};
	}

	renderField() {
		let playerPlateAppearances = state.getPlateAppearancesForPlayerOnTeam( this.props.playerId, this.props.teamId );
		let indicators = [];

		playerPlateAppearances.forEach( (value) => {

			let x = -1;
			let y = -1;
			if ( value.location ) {
				x = value.location.x;
				y = value.location.y;
			}

			let new_x = Math.floor( normalize( x, 0, 1, 0, window.innerWidth ) );
			let new_y = Math.floor( normalize( y, 0, 1, 0, window.innerWidth ) );

			let indicator = null;
			if ( value.location && x && y ) {
				let image = results.getOutResults().includes(value.result) ?  'assets/baseball-out.svg' : 'assets/baseball-hit.svg';
				indicators.push( 
					DOM.img( {
						key: value.id,
						src: image,
						style: {
							position: 'absolute',
							width: '20px',
							left: new_x + 'px',
							top: new_y + 'px'
						}
					} )
				);
			}
		});

		return DOM.div( 
			{
				id: 'ballfield',
				style: {
					position: 'relative',
					borderTop: '1px solid white',
					borderBottom: '1px solid white',
					width: ( window.innerWidth - 2 ) + 'px',
					height: ( window.innerWidth - 2 ) + 'px',
					overflow: 'hidden'
				}
			},
			DOM.img( {
				draggable: true,
				src: 'assets/ballfield2.png',
				style: {
					width: '100%'
				}
			} ),
			indicators
		)
	}

	render() {
		return DOM.div( {
				className: 'card',
				style: {
					position: 'relative'
				}
			},
			DOM.div( {
					className: 'card-title',
					style: {}
				},
				DOM.img( {
					src: 'assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				} ),
				DOM.div( {
					style: {}
				}, "Spray Chart" )
			),
			this.renderField()
		);
	}
};
