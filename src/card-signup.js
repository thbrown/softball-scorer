'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const network = require( 'network.js' )
const dialog = require( 'dialog' );
const state = require( 'state' );

module.exports = class CardSignup extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: 'Auth'
			} );
		};

		this.handleSubmitClick = async function() {
			let email = document.getElementById( 'email' );
			let password = document.getElementById( 'password' );
			let passwordConfirm = document.getElementById( 'passwordConfirm' );

			if ( !email.value || !password.value || !passwordConfirm.value) {
				let map = {
					"Email": email.value,
					"Password": password.value,
					"Confirm Password": passwordConfirm.value
				}
				let missingFields = Object.keys(map).filter(field => {
					return !map[field];
				})
				dialog.show_notification('Please fill out the following required fields: ' + missingFields.join(', '));
				return;
			}

			if(!this.validateEmail(email.value)) {
				dialog.show_notification('You entered an invalid email address');
				return;
			}

			if(password.value !== passwordConfirm.value) {
				dialog.show_notification('Passwords do not match');
				return;
			}

			// TODO: Disable button
			let body = {
				email: email.value,
				password: password.value
			}
			let response = await network.request('POST', 'account/signup', JSON.stringify(body));
			if(response.status === 204) {
				// TODO: don't clear local storage if the user data isn't associated with an account
				state.clearLocalStorage();
				state.clearState();
				console.log("Cleared state and localsStorage");

				dialog.show_notification(`Thank you for creating an account on Softball.app! You have been logged in.`,
					function() {
						expose.set_state( 'main', {
							page: 'TeamList'
						} );
					}
				);
			} else {
				dialog.show_notification(`There was a problem creating your account ${response.status} - ${response.body.message}`);
				console.log(response);
			}
			console.log("DONE");
			console.log(response);
		};
	}

	validateEmail(email) {
	    var re = /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
	    return re.test(String(email).toLowerCase());
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
			type: 'email'
		} ),
		DOM.input( {
			key: 'password',
			id: 'password',
			className: 'auth-input',
			placeholder: 'Password',
			type: 'password',
		} ),
		DOM.input( {
			key: 'passwordConfirm',
			id: 'passwordConfirm',
			className: 'auth-input',
			placeholder: 'Confirm Password',
			type: 'password',
		} ),
		// TODO: capcha
		this.renderSubmitButton(),
		);
	}

	renderSubmitButton() {
		return DOM.div( {
			key: 'submit',
			id: 'submit',
			className: 'button confirm-button',
			onClick: this.handleSubmitClick.bind(this),
			style: {
				marginLeft: '0'
			}
		}, 'Submit');
	}

	render() {
		return DOM.div( {
				style: {}
			},
			DOM.div( {
					className: 'card-title'
				},
				DOM.img( {
					src: '/assets/back.svg',
					className: 'back-arrow',
					onClick: this.handleBackClick,
					alt: 'back'
				} ),
				DOM.div( {
					className: 'prevent-overflow card-title-text-with-arrow'
				}, 'Signup' )
			),
			this.renderAuthInterface()
		);
	}
};

