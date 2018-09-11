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

module.exports = class CardPlateAppearance extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: `/teams/${props.team.id}/games/${props.game.id}`
			} );
		};

		this.handleButtonClick = function( result ) {
			state.updatePlateAppearanceResult( props.plateAppearance, result );
		};

		this.handleDragStart = function() {

		};

		this.handleDragStop = function() {
			//lame way to make this run after the mouseup event
			setTimeout( () => {
				let new_x = ( this.mx - 10 ) / window.innerWidth;
				let new_y = ( this.my - 10 ) / window.innerWidth;

				state.updatePlateAppearanceLocation( props.plateAppearance, [ new_x, new_y ] );
			}, 1 );
		};

		this.handleDelete = function() {
			dialog.show_confirm( 'Are you sure you want to delete this plate appearance?', () => {
				state.removePlateAppearance( props.plateAppearance.id, props.game.id );
				expose.set_state( 'main', {
					page: `/teams/${props.team.id}/games/${props.game.id}`
				} );
			} );
		};
	}

	componentDidMount() {
		this.onmouseup = ( ev ) => {
			let ballfield = document.getElementById( 'ballfield' );

			if ( ev.changedTouches ) {
				this.mx = ev.changedTouches[ 0 ].pageX - ballfield.offsetLeft;
				this.my = ev.changedTouches[ 0 ].pageY - ballfield.offsetTop - 48 /* headerSize */;
			} else {
				this.mx = ev.clientX - ballfield.offsetLeft;
				this.my = ev.clientY - ballfield.offsetTop - 48 /* headerSize */;
			}

			if ( this.mx < 0 ) {
				this.mx = 0;
			}

			if ( this.my < 0 ) {
				this.my = 0;
			}

			// Draging the ball 20px below cancels the location
			if ( this.my > parseInt( ballfield.style.height ) + 20 ) {
				this.my = undefined;
				this.mx = undefined;
			} else if ( this.my > parseInt( ballfield.style.height ) ) {
				this.my = parseInt( ballfield.style.height );
			}

			if ( this.mx > parseInt( ballfield.style.width ) ) {
				this.mx = parseInt( ballfield.style.width );
			}
		};

		window.addEventListener( 'mouseup', this.onmouseup );
		window.addEventListener( 'touchend', this.onmouseup );
	}

	componentWillUnmount() {
		window.removeEventListener( 'mouseup', this.onmouseup );
		window.removeEventListener( 'touchend', this.onmouseup );
	}

	renderButtonList() {
		if ( !this.props.game || !this.props.team || !this.props.player || !this.props.plateAppearance ) {
			return DOM.div( { className: 'page-error' }, 'PlateAppearance: No game or team or player or PlateAppearance exists.' );
		}

		let elems = results.getAllResults().map( ( result, i ) => {
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
			}, elems.slice( 0, elems.length/2 ) ),
			DOM.div( {
				style: {
					display: 'flex',
					justifyContent: 'space-around',
					margin: '4px',
				}
			}, elems.slice( elems.length/2, elems.length ) )
		);
	}

	renderField(imageSrcForCurrentPa) {
		let indicators = [];

		// Add the indicators for all plate appearances for this player, the current plate appearance will be dispalyed in a different color
		this.props.plateAppearances.forEach( (value) => {
			let x = -1;
			let y = -1;
			if ( value.location ) {
				x = value.location.x;
				y = value.location.y;
			}

			let new_x = Math.floor( normalize( x, 0, 1, 0, window.innerWidth ) );
			let new_y = Math.floor( normalize( y, 0, 1, 0, window.innerWidth ) );

			let imageSrc = (value.id === this.props.plateAppearance.id) ? imageSrcForCurrentPa : '/assets/baseball.svg';
			if ( value.location && x && y ) {
				indicators.push( 
					DOM.img( {
						key: value.id,
						src: imageSrc,
						alt: 'previous result',
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
				src: '/assets/ballfield2.png',
				alt: 'ballfield',
				style: {
					width: '100%'
				}
			} ),
			indicators
		);
		
	}

	renderBaseball(imageSrcForCurrentPa) {
		return React.createElement( Draggable, {
			key: 'baseball',
			axis: 'both',
			allowAnyClick: true,
			position: { x: 0, y: 0 },
			grid: [ 1, 1 ],
			onStart: this.handleDragStart.bind( this ),
			onStop: this.handleDragStop.bind( this ),
		}, DOM.img( {
			id: 'baseball',
			draggable: false,
			src: imageSrcForCurrentPa,
			alt: 'ball',
			style: {
				width: '48px',
				height: '48px',
				touchAction: 'none',
				transform: "translate(0px, 0px)"
			}
		} ) );
	}
﻿﻿﻿
	renderDeleteButton() {
		return DOM.div( {
				id: 'ballfield',
				style: {
					position: 'relative',
					overflow: 'hidden'
				}
			},
			DOM.img( {
				draggable: true,
				src: '/assets/delete.svg',
				onClick: this.handleDelete,
				alt: 'delete',
				style: {
					width: '48px'
				}
			} )
		);
	}

	render() {
		let imageSrcForCurrentPa = (results.getOutResults().includes(this.props.plateAppearance.result)) ? '/assets/baseball-out.svg' : '/assets/baseball-hit.svg';
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
					src: '/assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
					alt: 'back'
				} ),
				DOM.div( {
					className: 'prevent-overflow card-title-text-with-arrow',
				}, this.props.player.name )
			),
			this.renderButtonList(),
			this.renderField(imageSrcForCurrentPa),
			DOM.div( {
					style: {
						display: 'flex',
						justifyContent: 'space-between',
					}
				},
				this.renderBaseball(imageSrcForCurrentPa),
				this.renderDeleteButton()
			)
		);
	}
};
