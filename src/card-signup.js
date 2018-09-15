'use strict';

const expose = require( './expose' );
const DOM = require( 'react-dom-factories' );
const css = require( 'css' );

const network = require( 'network.js' )
const dialog = require( 'dialog' );
const state = require( 'state' );
const config = require( 'config' );
 
module.exports = class CardSignup extends expose.Component {
	constructor( props ) {
		super( props );
		this.expose();
		this.state = {};
		this.recapchaId = {};

		this.handleBackClick = function() {
			expose.set_state( 'main', {
				page: '/menu'
			} );
		};

		this.handleSubmitClick = async function() {
			let email = document.getElementById( 'email' );
			let password = document.getElementById( 'password' );
			let passwordConfirm = document.getElementById( 'passwordConfirm' );
			let recapchaResult = grecaptcha.getResponse(this.recapchaId);

			if ( !email.value || !password.value || !passwordConfirm.value || !recapchaResult) {
				let map = {
					"Email": email.value,
					"Password": password.value,
					"Confirm Password": passwordConfirm.value,
					"reCAPTCHA": recapchaResult
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
				password: password.value,
				reCAPCHA: recapchaResult,
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
							page: '/teams'
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

		this.showRecapcha = function() {
			showRecapchaInternal();
		}.bind( this );

		let showRecapchaInternal = function() {
			if(grecaptcha && grecaptcha.render) {
				this.recapchaId = grecaptcha.render('recapcha', {
		          'sitekey' : config.recapcha.sitekey
		        });

		        // Apparently CSP and reCAPCHA are a disaster in Chrome. Because we can't get the styling from Google, we'll just hide the annoying box that shows up. That's the styling we care about most.
				// https://bugs.chromium.org/p/chromium/issues/detail?id=546106
		        document.getElementById('g-recaptcha-response').hidden = true;	
			} else {
				setTimeout(function(){
			    	showRecapchaInternal();
				}, 500);
			}
		}.bind( this );

	}

	componentDidMount() {
		this.showRecapcha();
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
		DOM.div( {
			id: 'recapcha',
			style: {
				marginTop: '10px'
			}
		}),
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

