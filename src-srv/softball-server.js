/*eslint no-process-exit:*/
'use strict';

const http = require( 'http' );
const path = require( 'path' );
const express = require( 'express' );
const helmet = require( 'helmet' );
const passport = require( 'passport' );
const passportSession = require( 'express-session' );
const LocalStrategy = require( 'passport-local' ).Strategy;
const bodyParser = require( 'body-parser' );
const favicon = require( 'serve-favicon' );
const bcrypt = require( 'bcrypt' );
const crypto = require( 'crypto' );
const hasher = require( 'object-hash' );
const got = require( 'got' );

const objectMerge = require( '../object-merge.js' );
const HandledError = require( './handled-error.js' );
const config = require( './config' );

module.exports = class SoftballServer {

	constructor( databaseCalls ) {
		this.databaseCalls = databaseCalls;
		this.PORT = 8888;
	}

	start() {
		// Authentication
		let self = this;
		passport.use( new LocalStrategy( {
				usernameField: 'email',
				passwordField: 'password'
			},
			async function( email, password, cb ) {
				console.log( "Checking credentials...", email );

				try {
					let accountInfo = await self.databaseCalls.getAccountFromEmail( email );

					let isValid = false;
					if ( accountInfo && accountInfo.password_hash && email ) {
						isValid = await bcrypt.compare( password, accountInfo.password_hash );
					}

					if ( isValid ) {
						console.log( "Login accepted" );
						let sessionInfo = {
							accountId: accountInfo.account_id,
							email: email,
						};
						cb( null, sessionInfo );
					} else {
						cb( null, false );
						console.log( "Login rejected" );
					}
				} catch ( error ) {
					console.log( error );
					cb( null, false );
				}
			} ) );

		passport.serializeUser( function( sessionInfo, cb ) {
			cb( null, sessionInfo );
		} );

		passport.deserializeUser( async function( sessionInfo, cb ) {
			cb( null, sessionInfo );
		} );

		// Prep the web server
		const app = express();
		const server = http.createServer( app );

		// Middleware
		app.use( helmet({
			hsts: false // Don't require HTTP Strict Transport Security (https) locally, nginx will set this header to true in production
		}));
		app.use(helmet.contentSecurityPolicy({
			directives: {
				defaultSrc: ["'self'"], // Only allow scripts/style/fonts/etc from this domain unless otherwise specified below
				styleSrc: [ // TODO: use nonce to avoid recapcha styling errors: https://developers.google.com/recaptcha/docs/faq
					"'self'",
					"https://fonts.googleapis.com", 
					"'sha256-eeE4BsGQZBvwOOvyAnxzD6PBzhU/5IfP4NdPMywc3VE='"], // Hash is for react draggable components
				fontSrc: ["'self'", "https://fonts.gstatic.com"],
				scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
				connectSrc: ["'self'", "https://fonts.googleapis.com/css", "https://fonts.gstatic.com", "https://www.gstatic.com", "https://www.google.com"],
				frameSrc: ["'self'", "https://www.google.com/", "https://thbrown.github.io/"],
				reportUri: '/report-violation',
			},
		}))
		app.use(helmet.referrerPolicy({ policy: 'same-origin' }))
		app.use( favicon( __dirname + '/../assets/fav-icon.png' ) );
		app.use( '/server/build', express.static( path.join( __dirname + '/../build' ).normalize() ) );
		app.use( '/server/assets', express.static( path.join( __dirname + '/../assets' ).normalize() ) );
		// Service worker must be served at project root to intercept all fetches
		app.use( '/service-worker', express.static( path.join( __dirname + '/../src/workers/service-worker.js' ).normalize() ) );
		app.use( '/robots.txt', express.static( path.join( __dirname + '/../robots.txt' ).normalize() ) );
		app.use( '/server/manifest', express.static( path.join( __dirname + '/../manifest.json' ).normalize() ) );
		app.use( '/server/simulation-worker', express.static( path.join( __dirname + '/../src/workers/simulation-worker.js' ).normalize() ) );
		app.use( bodyParser.json( {
			limit: '3mb',
			type: ['json', 'application/json', 'application/csp-report']
		} ) );
		app.use( passportSession( {
			secret: crypto.randomBytes( 20 ).toString( 'hex' ), // TODO: move secret to config
			resave: false,
			saveUninitialized: false,
			name: 'softball.sid',
			cookie: { 
				httpOnly: true,
				expires: new Date( 253402300000000 ),
				sameSite: 'lax'
				// Secure header is set by nginx reverse proxy
			}
		} ) );
		app.use( passport.initialize() );
		app.use( passport.session() );

		// Routes
		/*
		app.post( '/server/state', wrapForErrorProcessing( async( req, res ) => { // Should this be a patch??
			let accountId = extractSessionInfo( req, 'accountId' );
			await this.databaseCalls.setState( req.body, accountId );
			res.status( 204 ).send();
		} ) );
		*/

		app.get( '/server/state', wrapForErrorProcessing( async( req, res ) => {
			if(!req.isAuthenticated()) {
				res.status( 403 ).send();
				return;
			}
			let accountId = extractSessionInfo( req, 'accountId' );
			await lockAccount( accountId );
			let state;
			try{
				state = await this.databaseCalls.getState( accountId );
			} finally {
				unlockAccount( accountId );
			}
			res.status( 200 ).send( state );
		} ) );

		app.get( '/server/state-pretty', wrapForErrorProcessing( async( req, res ) => {
			if(!req.isAuthenticated()) {
				res.status( 403 ).send();
				return;
			}
			let accountId = extractSessionInfo( req, 'accountId' );
			await lockAccount( accountId );
			let state;
			try{
				state = await this.databaseCalls.getState( accountId );
			} finally {
				unlockAccount( accountId );
			}
			res.status( 200 ).send( JSON.stringify( state, null, 2 ) );
		} ) );

		app.post( '/server/account/login', wrapForErrorProcessing( ( req, res, next ) => {
			passport.authenticate( 'local', function( err, accountInfo, info ) {
				if ( err || !accountInfo ) {
					console.log( 'FAILED TO AUTHENTICATE!', accountInfo, err, info );
					res.status( 400 ).send();
					return;
				}
				req.logIn( accountInfo, function() {
					console.log( 'Login Successful!' );
					res.status( 204 ).send();
				} );
			} )( req, res, next );
		} ) );

		app.post( '/server/account/signup', wrapForErrorProcessing( async( req, res, next ) => {
			checkRequiredField(req.body.email, "email");
			checkFieldLength(req.body.email, 320);

			checkRequiredField(req.body.password, "password");
			checkFieldLength(req.body.password, 320);

			checkRequiredField(req.body.reCAPCHA, "reCAPCHA");

			if(config && config.recapcha && config.recapcha.secretkey) {
				let body = {
					    secret: config.recapcha.secretkey,
					    response: req.body.reCAPCHA,
					    remoteip: req.connection.remoteAddress,
					}
				console.log("Recapcha body", body);
				try {
					const recapchaResponse = await got.post(`https://www.google.com/recaptcha/api/siteverify?secret=${config.recapcha.secretkey}&response=${req.body.reCAPCHA}`);
					console.log("Recapcha result", recapchaResponse.body);
					let recapchaResponseBody = JSON.parse(recapchaResponse.body);
					if(!recapchaResponseBody.success) {
						throw new HandledError( 400, "We don't serve their kind here", recapchaResponse.body);
					}
				} catch (error) {
					if(error instanceof HandledError) {
						throw error;
					} else {
						throw new HandledError( 500, "Failed to get recapcha approval from Google", error);
					}
				}
			}

			let hashedPassword = await bcrypt.hash(req.body.password, 12);
			let account = await this.databaseCalls.signup(req.body.email, hashedPassword);

			console.log("Calling login A", account);
			logIn(account, req, res); 

			res.status( 204 ).send();
		} ) );

		app.post( '/server/account/reset-password-request', wrapForErrorProcessing( async( req, res, next ) => {
			console.log("Reset password request")
			checkRequiredField(req.body.email, "email");
			let account = await this.databaseCalls.getAccountFromEmail( req.body.email );
			if(account) {
				let token = await generateToken();
				let tokenHash = crypto.createHash('sha256').update(token).digest('base64');

				// TODO: send passwowrd reset email
				console.log("Would have sent email", token);

				await this.databaseCalls.setPasswordTokenHash(account.account_id, tokenHash);
				res.status( 204 ).send();
			} else {
				console.log("Password reset: No such email found", req.body.email);
				res.status( 404 ).send();
			}

		} ) );

		app.post( '/server/account/reset-password', wrapForErrorProcessing( async( req, res, next ) => {
			console.log("Password update recieved");
			checkRequiredField(req.body.password, "password");
			checkFieldLength(req.body.password, 320);
			checkFieldLength(req.body.token, 320);
			let token = req.body.token;
			let tokenHash = crypto.createHash('sha256').update(token).digest('base64');
			let account = await this.databaseCalls.getAccountFromTokenHash(tokenHash);
			if (account) {
				await this.databaseCalls.confirmEmail(account.account_id);

				let hashedPassword = await bcrypt.hash(req.body.password, 12);
				await this.databaseCalls.setPasswordHashAndExpireToken(account.account_id, hashedPassword);

				// If an attacker somehow guesses the reset token and resets the password, they still don't know the email.
				// So, we wont log the password resetter in automatically. We can change this if we think it really affects
				// usability but I think it's okay. If users are resetting their passwords they are probably aready engaged.
				// logIn(account, req, res);
				res.status( 204 ).send();
			} else {
				res.status( 404 ).send();
			}
		} ) );

		app.delete( '/server/account', wrapForErrorProcessing( async( req, res, next ) => {
			if(!req.isAuthenticated()) {
				res.status( 403 ).send();
				return;
			}
			
			let accountId = extractSessionInfo( req, 'accountId' );
			console.log(`Deleting account ${accountId}`);

			await lockAccount(accountId);
			try {
				// First delete all the data
				let state = await this.databaseCalls.getState( accountId );
				let deletePatch = objectMerge.diff(state, {"teams":[], "players": []});
				await this.databaseCalls.patchState( deletePatch, accountId );

				// Then delete the account
				await this.databaseCalls.deleteAccount( accountId );

				// TODO: Invalidate session somehow?
				console.log("deleted account");

				res.status( 204 ).send();
			} finally {
				unlockAccount( accountId );
			}
		} ) );

		/*
			req: {
				md5: db8a5d3c57a8e5f7aa7b
				patch: {...}
				type: {full|any}
			}

			res: {
				md5: db8a5d3c57a8e5f7aa7b
				patchs: []
					-- OR --
				base: {...}
			}
		*/
		app.post( '/server/sync', wrapForErrorProcessing( async( req, res ) => {
			console.log("ACCOUNT", extractSessionInfo( req, 'accountId' ));
			if(!req.isAuthenticated()) {
				res.status( 403 ).send();
				return;
			}

			// We need this information to know what state the client is in
			let data = req.body;
			console.log("Sync request received by server ", JSON.stringify(data, null, 2));
			if( !data['md5'] ) {
				throw new HandledError( 400, "Missing required field", data);
			}

			let accountId = extractSessionInfo( req, 'accountId' );
			let stateRecentPatches = extractAccountInfo( accountId, 'stateRecentPatches') || [];
			let state = undefined;

			// Prevent race conditions across requests
			await lockAccount(accountId);

			let responseData = {};

			try {
				// Check if the client sent updates to the server
				if(data.patch && Object.keys(data.patch).length !== 0) {
					console.log("client has updates", data.patch);

					state = state || await this.databaseCalls.getState( accountId );
					let stateCopy = JSON.parse(JSON.stringify(state)); // Deep copy

					// Apply the patch that was supplied by the client, passing true allows us to ignore any changes that were applied to deleted entries or additions of things that already exist
					objectMerge.patch(state, data.patch, true);

					// Now we'll diff the patched version against our original copied version, this gives us a patch without any edits to deleted entries or additions of things that already exist
					let cleanPatch = objectMerge.diff(stateCopy, state);
					//console.log("cleanPatch", JSON.stringify(cleanPatch, null, 2));

					// We can pass the clean patch to the database to persist
					await this.databaseCalls.patchState( cleanPatch, accountId );
					state = await this.databaseCalls.getState( accountId );

					// Now we can derive the patch for this update (with the correct server ids) as well as the checksum of the most recent state and timestamp
					let syncPatch = objectMerge.diff(stateCopy, state);
					let checksum = getMd5(state);

					// Update the checksum on the response object and the session
				    responseData.md5 = checksum;
					putAccountInfo(accountId, "stateMd5", checksum);

					// Save the patch for this sync to the session (to speed up future syncs).
					let savedPatch = {};
					savedPatch.patch = syncPatch;
					savedPatch.md5 = checksum;
					stateRecentPatches.push(savedPatch);
					putAccountInfo(accountId, "stateRecentPatches", stateRecentPatches);
					//console.log("savedPatch", savedPatch);
				} else {
					console.log("No updates from client", data.patch);
				}

				// Get info about the checksum of the current state from account info
				let stateMd5 = extractAccountInfo( accountId, 'stateMd5' );

				// Calculate the checksum current state if it's not stored in session storage
				if(!stateMd5) {
					console.log("No state hash stored in the session, getting state info");
					state = state || await this.databaseCalls.getState( accountId );
					let checksum = getMd5(state);

					putAccountInfo(accountId, "stateMd5", checksum);
					stateMd5 = checksum;
				}

				// Check if the server has updates for the client.
				if(data.md5 !== stateMd5) {
					console.log("Server has updates. CLIENT: ", data.md5, " SERVER: ", stateMd5);
					// If we have a record of the patches we need to update the client, send those instead of the entire state
					let foundMatch = false;
					let patches = stateRecentPatches.filter( v => { 
						if(v.md5 === data.md5) {
							foundMatch = true;
						} 
						return (foundMatch && v.md5 !== data.md5); // We want all patches after the matching md5
					});

					if( patches.length > 0 && data.type !== "full") {
						// Yay, we have patches saved that will update the client to the current state, just send those.
				  		console.log("patches found, sending those instead");//, stateRecentPatches);
				  		let patchesOnly = patches.map( v => v.patch );
				    	responseData.patches = patchesOnly;
				  	} else {
				    	// We don't have any patches saved in the session for this timestamp, or the client requested we send the whole state back.
						console.log("no patches found, sending whole state");
				    	responseData.base = state || await this.databaseCalls.getState( accountId );
				  	}
					responseData.md5 = stateMd5;
				} else {
					console.log("No updates from server", data.md5, stateMd5);
				}
			} finally {
				// Unlock the account
				unlockAccount(accountId);
			}

			// Woot, done
			if(responseData.base) {
				let testCs = getMd5(responseData.base);
			}
			res.status( 200 ).send(responseData);

			// Delete values if we are storing too many patches (Not the most refined technique, but it's something) 
			while(JSON.stringify(stateRecentPatches).length > 20000) {
				console.log("Erasing old patch data. New length: " + stateRecentPatches.length -1);
				stateRecentPatches.splice(-1,1);
			}
			
		} ) );

		// This route just accepts reports of Content Security Policy (CSP) violations
		// https://helmetjs.github.io/docs/csp/
		app.post('/server/report-violation', function (req, res) {
			if (req.body) {
				console.log('CSP Violation: ', req.body)
			} else {
				console.log('CSP Violation: No data received!')
			}
			res.status(204).end()
		})

		// Everything else loads the react app and is processed on the clinet side
		app.get( '*', wrapForErrorProcessing( ( req, res ) => {
			res.sendFile( path.join( __dirname + '/../index.html' ).normalize() );
		} ) );

		// 404 on unrecognized routes
		app.use( function() {
			throw new HandledError( 404, "Resource not found" );
		} );

		app.use( function( error, req, res, next ) {
			res.setHeader('content-type', 'application/json');
			if ( error instanceof HandledError ) {
				console.log('Sending Error', error.getExternalMessage());
				res.status( error.getStatusCode() ).send( { message: [ error.getExternalMessage() ] } );
				if ( error.getInternalMessage() ) {
					error.print();
				}
			} else {
				let errorId = Math.random().toString(36).substring(7);
				res.status( 500 ).send( { message: `Internal Server Error. Error id: ${errorId}.` } );

				let accountId = extractSessionInfo( req, 'accountId' );

				console.log( `SERVER ERROR ${errorId} - ${accountId}`, { message: [ error.message ] } );
				console.log( `Error`, error );
			}
		} );

		this.server = server.listen( this.PORT, function listening() {
			console.log( 'Softball App: Listening on %d', server.address().port );
		} );

		// Helpers -- TODO use consistent declarations

		// Error handling, so we can catch errors that occur during async too
		function wrapForErrorProcessing( fn ) {
			return async function( req, res, next ) {
				try {
					await fn( req, res, next );
				} catch ( error ) {
					//console.log("An error was thrown!", error);
					next( error );
				}
			};
		}

		// An async sleep function
		async function pause(ms) {
		  return new Promise(function(resolve,reject){
		    setTimeout(function(){resolve(ms);},ms);
		  });
		}

		// Calculate the md5 checksum of the data and return the result as a base64 string
		function getMd5(data) {
			let checksum = hasher(data, { 
				algorithm: 'md5',  
				excludeValues: false, 
				respectFunctionProperties: false, 
				respectFunctionNames: false, 
				respectType: false,
				encoding: 'base64'} );
			return checksum.slice(0, -2); // Remove trailing '=='
		}

		async function generateToken(length = 30) {
		  return new Promise((resolve, reject) => {
		    crypto.randomBytes(length, (err, buf) => {
		      if (err) {
		        reject(err);
		      } else {
		      	// Make sure the token is url safe
		        resolve(buf.toString('base64').replace(/\//g,'_').replace(/\+/g,'-'));
		      }
		    });
		  });
		}

		function checkFieldLength(field, maxLength) {
			if(field && field.length > maxLength) {
				throw new HandledError(400,  `Field ${field} exceeds the maximum length ${maxLength}`);
			}
		}

		function checkRequiredField(field, fieldName) {
			if(!field || field.trim().length === 0) {
				throw new HandledError(400, `Field ${fieldName} is required but was not specified`);
			}
		}

		async function logIn(account, req, res) {
			console.log("Loggin in", account);
			let sessionInfo = {
				accountId : account.account_id,
				email : account.email
			}
			try {
				await new Promise(function(resolve,reject){
					req.logIn( account, function() {
						// We need to serialize some info to the session
						let sessionInfo = {
							accountId: account.account_id,
							email: account.email,
						};
						var doneWrapper = function (req) {
						    var done = function (err, user) {
						        if(err) {
						            reject(err)
						            return;
						        }
						        req._passport.session.user = sessionInfo;
						        return;
						    };
						    return done;
						};
						req._passport.instance.serializeUser(sessionInfo, doneWrapper(req));
						resolve();
					} );
				});
				console.log( 'Login Successful -- backdoor!' );
				let accountId = extractSessionInfo( req, 'accountId' );
				console.log( `Data ${accountId}` );
			} catch (e) {
				console.log("ERROR", e);
				res.status( 500 ).send();
			}
		}

		let extractSessionInfo = function( req, field ) {
			if ( req && req.session && req.session.passport && req.session.passport.user) {
				return req.session.passport.user[field];
			} else {
				return undefined;
			}
		};

		// Information shared between all sessions associate with a single account -- TODO: we are leaking memory here if we don't clear this
		let accountInformation = {};

		let extractAccountInfo = function( accountId, field ) {
			if ( accountInformation && accountInformation[accountId]) {
				return accountInformation[accountId][field];
			} else {
				return undefined;
			}
		};

		let putAccountInfo = function( accountId, field, value ) {
			if ( !accountInformation ) {
				accountInformation = [];
			} 
			if ( !accountInformation[accountId] ) {
				accountInformation[accountId] = {};
			}
			accountInformation[accountId][field] = value;
		}

		// Lock the account. Only one session for a single account can access the database at a time, otherwise there will br lots of race conditions.
		// TODO: this will only scale to one process
		let lockAccount = async function( accountId ) {
			let locked;
			let counter = 0;
			do {
				if(counter > 50) {
					throw new HandledError(500, 'Another request is consuming system resources allocated for this account. Please try agin in a few minutes.');
				}
				locked = extractAccountInfo(accountId, 'locked');
				console.log("Locked", locked, accountInformation);
				if(locked) {
					console.log("Account locked, retrying in 200ms", accountId);
					await pause(200); // TODO: Do we need a random backoff?
					counter++;
				}
			} while (locked);
			putAccountInfo(accountId, "locked", true);
		}

		let unlockAccount = function( accountId ) {
			putAccountInfo(accountId, "locked", false); // TODO: would un-setting this instead avoid a memory leak?
			console.log("Account Unlocked", accountId);
		}

	}

	stop() {
		console.log("Closing App");
		this.server.close();
	}

};
