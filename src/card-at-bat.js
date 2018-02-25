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

module.exports = class CardAtbat extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: 'Lineup'
			} );
		};

		this.handleButtonClick = function( result ) {
			state.updateAtbatResult( this.props.atbat, result );
		};

		this.handleDragStart = function( result ) {

		};

		this.handleDragStop = function( result ) {
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

			state.updateAtbatLocation( this.props.atbat, [ new_x, new_y ] );
		};
	}

	renderButtonList(){
		if( !this.props.game || !this.props.team || !this.props.player || !this.props.atbat ) {
			console.log( 'game:', this.props.game, 'team:', this.props.team, 'player:', this.props.player, 'atbat:', this.props.atbat );
			return DOM.div( { className: 'page-error' }, 'Atbat: No game or team or player or atbat exists.' );
		}

		let elems = [ '', '0', '1', '2', '3', '4i', '4o', 'BB', 'E' ].map( ( result ) => {
			return DOM.div( {
				key: result + ' ' + result,
				className: 'result-button',
				onClick: this.handleButtonClick.bind( this, result ),
				style: {
					backgroundColor: this.props.atbat.result === result ? css.colors.CANCEL : null
				}
			}, result );
		} );

		return DOM.div( {
			style: {
				display: 'flex',
				justifyContent: 'space-around'
			}
		}, elems );
	}

	renderField(){
		let x = -1;
		let y = -1;
		if( this.props.atbat.location ){
			x = this.props.atbat.location[ 0 ];
			y = this.props.atbat.location[ 1 ];
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
			//handle: '.handle',
			//defaultPosition: { x: 0, y: 0 },
			position: { x: 0, y: 0 },
			grid: [ 1, 1 ],
			onStart: this.handleDragStart.bind( this ),
			onStop: this.handleDragStop.bind( this),
		}, DOM.img( {
			id: 'baseball',
			draggable: true,
			src: 'assets/baseball.png',
			style: {
				width: '100px'
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
				DOM.div( {
					onClick: this.handleBackClick,
					dangerouslySetInnerHTML: {
						__html: '&#9664;'
					},
					style: {
						float: 'left',
						width: '0px',
						padding: '4px',
						fontSize: '32px',
					}
				} ),
				DOM.div( {
					style: {
					}
				}, this.props.player.name + ' #' + this.props.atbat.atbat_count )
			),
			DOM.div( { style: { height: '40px', lineHeight: '35px' } }, 'Result:' ),
			this.renderButtonList(),
			DOM.div( { style: { height: '40px' } } ),
			this.renderField(),
			this.renderBaseball()
		);
	}
};
