'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const dialog = require( 'dialog' );
const state = require( 'state' );

module.exports = class CardAuth extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: 'Menu'
			} );
		};

		this.handleSignupClick = function() {
			expose.set_state( 'main', {
				page: 'Signup'
			} );
		};

		this.handlePasswordResetClick = function() {
			// TODO: pre-populate dialog with the email address that was already entered
			// let email = document.getElementById( 'email' );
			// email.value
			dialog.show_input( 'To reset your password, please enter your email address', ( email ) => {
				dialog.show_notification(
					'Password reset email has been sent to the email provided if an associated account was found (jk, the back end is not implemented yet).'
				);
			} );
		};

		this.handleSubmitClick = function() {
			let email = document.getElementById( 'email' );
			let password = document.getElementById( 'password' );

			if ( email.value && password.value ) {
				var xhr = new XMLHttpRequest();
				xhr.open( "POST", window.location + 'login', true );
				xhr.setRequestHeader( 'Content-type', 'application/json' );
				xhr.onreadystatechange = async function() {
					if ( xhr.readyState === 4 ) {
						if ( xhr.status === 200 ) {
							// TODO: don't clear local storage if the user re-logs into the same account (for example, if the user's session was invalidated while
							// the user was in offline mode making changes and now wants to re-authenticate)
							state.clearLocalStorage();
							state.clearState();
							let status = await state.sync();
							if( status === 200 ) {
								console.log( "Done with sync" );
								expose.set_state( 'main', {
									page: 'TeamList',
									render: true
								} );
							} else {
								dialog.show_notification('An error occured while attempting sync: ' + status);
							}
						} else {
							dialog.show_notification( 'Invalid login' );
						}
					}
				};

				xhr.send( JSON.stringify( {
					email: email.value,
					password: password.value
				} ) );
			} else {
				let map = {
					"Email": email.value,
					"Password": password.value
				}
				let missingFields = Object.keys(map).filter(field => {
					return !map[field];
				})
				dialog.show_notification('Please fill out the following required fields: ' + missingFields.join(', '));
			}
		};
	}

	renderAuthInterface() {
		return DOM.div( {
			className: 'auth-input-container',
		},
		DOM.input( {
			key: 'email',
			id: 'email',
			className: 'auth-input',
			placeholder: 'Email',
			type: 'email',
		} ),
		DOM.input( {
			key: 'password',
			id: 'password',
			className: 'auth-input',
			placeholder: 'Password',
			type: 'password',
		} ),
		this.renderButtons(),
		);
	}

	renderButtons() {
		return [
			DOM.div( {
				key: 'submit',
				id: 'submit',
				className: 'button confirm-button',
				style: {
					width: 'auto',
					margin: '10px'
				},
				onClick: this.handleSubmitClick,
			}, 'Submit')
			,
			DOM.hr({
				key: 'divider',
				style: {
					margin: '16px'
				}
			})
			,
			DOM.div({
				key: 'alternateButtons'
			},
				DOM.div( {
					key: 'signup',
					id: 'signup',
					className: 'button confirm-button',
					style: {
						width: 'auto',
						margin: '10px'
					},
					onClick: this.handleSignupClick,
				}, 'Create Account')
				,
				DOM.div( {
					key: 'passwordReset',
					id: 'passwordReset',
					className: 'button confirm-button',
					style: {
						width: 'auto',
						margin: '10px'
					},
					onClick: this.handlePasswordResetClick,
				}, 'Reset Password')
			)
		];
	}

	render() {
		return DOM.div( {
				style: {}
			},
			DOM.div( {
					className: 'card-title'
				},
				DOM.img( {
					src: 'assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
					alt: 'back'
				} ),
				DOM.div( {
					style: {
					}
				}, 'Login' )
			),
			this.renderAuthInterface()
		);
	}
};
