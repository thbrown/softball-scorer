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
			console.log("Signup");
			expose.set_state( 'main', {
				page: 'Signup'
			} );
		};

		this.handlePasswordResetClick = function() {
			console.log("Password reset");
			// TODO: pre-populate dialog with the email address that was already entered
			// let email = document.getElementById( 'email' );
			// email.value
			dialog.show_input( 'To reset your password, please enter your email address', ( email ) => {
				dialog.show_notification(
					'Password reset email has been sent to the email provided if associated account was found'
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
				xhr.onreadystatechange = function() {
					if ( xhr.readyState === 4 ) {
						if ( xhr.status === 200 ) {
							// TODO: Don't use a confirmation dialog for this and find a way to report merge issues
							// TODO: Skip this if there are no local changes
							dialog.show_confirm(
								'Would you like to merge local changes? Press cancel to discard them.',
								() => {
									// Soft sync, merge local changes
									state.updateState( () => {
										console.log( "Done with sync" );
										expose.set_state( 'main', {
											page: 'TeamList',
											render: true
										} );
									}, false );
								},
								() => {
									// Hard sync, discard local changes
									state.updateState( () => {
										console.log( "Done with sync" );
										expose.set_state( 'main', {
											page: 'TeamList',
											render: true
										} );
									}, true );
								}
							);
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
				console.log(missingFields, Object.keys(map));

				dialog.show_notification('Please fill out the following required fields: ' + missingFields.join(','));
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
					src: 'assets/ic_arrow_back_white_36dp_1x.png',
					className: 'back-arrow',
					onClick: this.handleBackClick,
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
