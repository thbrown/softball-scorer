'use strict';

const React = require( 'react' );
const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

module.exports = class CardAuth extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: 'Menu'
			} );
		};

		this.login = function() {
			let email = document.getElementById('email');
			let password = document.getElementById('password');

			if(email.value && password.value) {
				console.log(email.value, password.value, window.location);

				var xhr = new XMLHttpRequest();
				xhr.open("POST", window.location + 'login', false);
				xhr.setRequestHeader('Content-type', 'application/json');
				xhr.onreadystatechange = function() {
				    if(xhr.readyState == 4 && xhr.status == 200) {
				        alert(xhr.responseText);
				    }
				}
				xhr.send(JSON.stringify({
					email: email.value,
					password: password.value
				}));
			}
		};
	}

	renderAuthInterface(){
		const s = state.getState();
		let elems = [];

		elems.push(
			DOM.div( {
				key: 'auth',
				id: 'auth',
				className: 'auth-input',
				style: {
					backgroundColor: css.colors.BG,
					color: 'gray',
				}
			},
				'Email',
				DOM.input( {
					key: 'email',
					id: 'email',
					className: 'auth-input',
					style: {
						backgroundColor: css.colors.BG,
						color: 'gray',
					}
				}),
				DOM.br({}),
				'Password',
				DOM.input( {
					key: 'password',
					id: 'password',
					className: 'auth-input',
					type: 'password',
					style: {
						backgroundColor: css.colors.BG,
						color: 'gray',
					}
				}),
				DOM.br({}),
				DOM.button( {
					key: 'submit',
					id: 'submit',
					className: 'auth-input',
					type: 'button',
					onClick: this.login,
					style: {
						backgroundColor: css.colors.BG,
						color: 'gray',
					}
				} , 'Submit')
			)
		);

		return DOM.div( {

		}, elems );
	}

	render() {
		return DOM.div( {
				style: {
				}
			},
			DOM.div( {
				className: 'card-title'
			}, 				
				DOM.img( {
					src: 'assets/ic_arrow_back_white_36dp_1x.png',
					className: 'back-arrow',
					onClick: this.handleBackClick,
				}),
				DOM.div( {
					style: {
						// display: 'flex',
						justifyContent: 'space-between',
						// Adjusting for back-arrow.
						marginLeft: '60px',
					}
				}, 'Menu' ),
			),
			this.renderAuthInterface()
		);
	}
};
