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
			//lame way to make this run after the mouseup event
			setTimeout( () => {
				let new_x = ( this.mx - 10 ) / window.innerWidth;
				let new_y = ( this.my - 10 ) / window.innerWidth;

				state.updatePlateAppearanceLocation( this.props.plateAppearance, [ new_x, new_y ] );
			}, 1 );
		};
	}

	componentDidMount(){
		this.onmouseup = ( ev ) => {
			let ballfield = document.getElementById( 'ballfield' );

			if( ev.changedTouches ) {
				this.mx = ev.changedTouches[ 0 ].pageX - ballfield.offsetLeft;
				this.my = ev.changedTouches[ 0 ].pageY - ballfield.offsetTop + document.body.scrollTop;
			} else {
				this.mx = ev.clientX - ballfield.offsetLeft;
				this.my = ev.clientY - ballfield.offsetTop + document.body.scrollTop;
			}

			if( this.mx < 0 ) {
				this.mx = 0;
			}

			if( this.my < 0 ) {
				this.my = 0;
			}

			if( this.my > parseInt( ballfield.style.height ) )
			{
				this.my = parseInt( ballfield.style.height );
			}
		};

		window.addEventListener( 'mouseup', this.onmouseup );
		window.addEventListener( 'touchend', this.onmouseup );
	}

	componentWillUnmount() {
		window.removeEventListener( 'mouseup', this.onmouseup );
		window.removeEventListener( 'touchend', this.onmouseup );
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
			}, elems.slice(5, elems.length) )
		);
	}

	renderField(){
		let x = -1;
		let y = -1;
		if( this.props.plateAppearance.location ){
			x = this.props.plateAppearance.location.x;
			y = this.props.plateAppearance.location.y;
		}

		let new_x = Math.floor( normalize( x, 0, 1, 0, window.innerWidth ) );
		let new_y = Math.floor( normalize( y, 0, 1, 0, window.innerWidth ) );

		let indicator = null;
		if( x > -1 ) {
			indicator = DOM.img( {
				draggable: true,
				src: 'assets/baseball-blue.png',
				style: {
					position: 'absolute',
					width: '20px',
					left: new_x + 'px',
					top: new_y + 'px'
				}
			} );
		}

		return DOM.div( {
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
			indicator
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
			draggable: false,
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
