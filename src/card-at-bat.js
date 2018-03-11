'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );
const Draggable = require( 'react-draggable' );

const state = require( 'state' );

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
				page: 'Game'
			} );
		};

		this.handleButtonClick = function( result ) {
			state.updatePlateAppearanceResult( this.props.plateAppearance, result );
		};

		this.handleDragStart = function() {

		};

		this.handleDragStop = function() {
			let elem = document.getElementById( 'baseball' );
			let coords = elem.style.transform.replace( /px/g, '' ).replace( /translate/, '' ).slice( 1, -1 ).split( ',' ).map( i => parseInt( i ) );

			let x = coords[ 0 ];
			let y = coords[ 1 ];

			let y_bottom = -50;
			let y_top = -415;
			let x_left = -50;
			let x_right = 310;

			if( x < x_left ) {
				x = x_left;
			} else if( x > x_right ) {
				x = x_right;
			}

			if( y < y_top ) {
				y = y_top;
			} else if( y > y_bottom ) {
				y = y_bottom;
			}

			let new_x = Math.floor( normalize( x, x_left, x_right, 0, 400 ) );
			let new_y = Math.floor( normalize( y, y_top, y_bottom, 0, 400 ) );

			state.updatePlateAppearanceLocation( this.props.plateAppearance, [ new_x, new_y ] );
		};
	}

	renderButtonList(){
		if( !this.props.game || !this.props.team || !this.props.player || !this.props.plateAppearance ) {
			return DOM.div( { className: 'page-error' }, 'PlateAppearance: No game or team or player or PlateAppearance exists.' );
		}

		let elems = [ '', 'Out', '1B', '2B', '3B', 'HRi', 'HRo', 'BB', 'E', 'FC' ].map( ( result, i ) => {
			return DOM.div( {
				key: i + ' ' + result,
				className: 'result-button',
				onClick: this.handleButtonClick.bind( this, result ),
				style: {
					backgroundColor: this.props.plateAppearance.result === result ? css.colors.SECONDARY : null
				}
			}, result );
		} );

		return DOM.div( {},
			DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'space-around',
					margin: '4px',
				}
			}, elems.slice(0, 5) ),
			DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'space-around',
					margin: '4px',
				}
			}, elems.slice(5, elems.length) ),
		);
	}

	renderField(){
		let x = -1;
		let y = -1;
		if( this.props.plateAppearance.location ){
			x = this.props.plateAppearance.location.x;
			y = this.props.plateAppearance.location.y;
		}

		let new_x = Math.floor( normalize( x, 0, 400, 0, window.innerWidth ) );
		let new_y = Math.floor( normalize( y, 0, 400, 0, window.innerWidth ) );

		return DOM.div( {
			style: {
				position: 'relative',
				borderTop: '1px solid white',
				borderBottom: '1px solid white'
			}
		},
			DOM.img( {
				src: 'assets/ballfield.png',
				style: {
					width: '100%'
				}
			} ),
			x > -1 ? DOM.img( {
				draggable: true,
				src: 'assets/baseball-blue.png',
				style: {
					position: 'absolute',
					width: '20px',
					left: new_x + 'px',
					top: new_y + 'px'
				}
			} ) : null
		);
	}

	renderBaseball(){
		return React.createElement( Draggable, {
			key: 'baseball',
			axis: 'both',
			allowAnyClick: true,
			position: { x: 0, y: 0 },
			grid: [ 1, 1 ],
			onStart: this.handleDragStart.bind( this ),
			onStop: this.handleDragStop.bind( this),
		}, DOM.img( {
			id: 'baseball',
			draggable: true,
			src: 'assets/baseball.png',
			style: {
				width: '75px'
			}
		} ) );
	}

	render() {
		return DOM.div( {
				style: {
					position: 'relative'
				}
			},
			DOM.div( {
				className: 'card-title',
				style: {
				}
			},
				DOM.img( {
					src: 'assets/ic_arrow_back_white_36dp_1x.png',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				}),
				DOM.div( {
					style: {
					}
				}, this.props.player.name + ' PA #' + this.props.plateAppearance.plateAppearanceIndex )
			),
			this.renderButtonList(),
			this.renderField(),
			this.renderBaseball()
		);
	}
};
