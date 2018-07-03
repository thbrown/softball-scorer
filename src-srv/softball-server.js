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

const objectMerge = require( '../object-merge.js' );
const HandledError = require( './handled-error.js' );

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
					let accountInfo = await self.databaseCalls.getAccountIdAndPassword( email );

					let isValid = false;
					if ( accountInfo && accountInfo.password && email ) {
						isValid = await bcrypt.compare( password, accountInfo.password );
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
			hsts: false // Don't require HTTP Strict Transport Security (https), nginx will set this header in production
		}));
		app.use(helmet.contentSecurityPolicy({
			directives: {
				defaultSrc: ["'self'"], // Only allow scripts/style/fonts/etc from this domain
				// TODO: add frame-src for youtube walk up songs
				reportUri: '/report-violation',
			},
			//reportOnly: true
		}))
		app.use(helmet.referrerPolicy({ policy: 'same-origin' }))
		app.use( favicon( __dirname + '/../assets/fav-icon.png' ) );
		app.use( '/build', express.static( path.join( __dirname + '/../build' ).normalize() ) );
		app.use( '/assets', express.static( path.join( __dirname + '/../assets' ).normalize() ) );
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

		// Helpers
		let extractSessionInfo = function( req, field ) {
			if ( req && req.session && req.session.passport && req.session.passport.user) {
				return req.session.passport.user[field];
			} else {
				return undefined;
			}
		};

		// Information shared between all sessions associate with a single account
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

		// Lock the account. Only one session for a single account can access the database at a time, otherwise there is the possibility for lots of race conditions.
		// TODO: this will only scale to one process
		let lockAccount = async function( accountId ) {
			let locked;
			do {
				locked = extractAccountInfo(accountId, 'locked');
				console.log("Locked", locked, accountInformation);
				if(locked) {
					console.log("Account locked, retrying in 200ms", accountId);
					await pause(200); // Do we need a random backoff?
				}
			} while (locked);
			putAccountInfo(accountId, "locked", true);
		}

		let unlockAccount = function( accountId ) {
			putAccountInfo(accountId, "locked", false); // TODO: maybe just unset this to avoid the memory leak?
			console.log("Account Unlocked", accountId);
		}

		// Routes
		app.get( '/', wrapForErrorProcessing( ( req, res ) => {
			res.sendFile( path.join( __dirname + '/../index.html' ).normalize() );
		} ) );

		app.post( '/state', wrapForErrorProcessing( async( req, res ) => { // Should this be a patch??
			let accountId = extractSessionInfo( req, 'accountId' );
			await this.databaseCalls.setState( req.body, accountId );
			res.status( 204 ).send();
		} ) );

		app.get( '/state', wrapForErrorProcessing( async( req, res ) => {
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

		app.get( '/state-pretty', wrapForErrorProcessing( async( req, res ) => {
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

		app.post( '/login', wrapForErrorProcessing( ( req, res, next ) => {
			passport.authenticate( 'local', function( err, accountInfo, info ) {
				if ( err || !accountInfo ) {
					console.log( 'FAILED TO AUTHENTICATE!', accountInfo, err, info );
					res.status( 400 ).send();
					return;
				}
				req.logIn( accountInfo, function() {
					console.log( 'Login Successful!' );
					res.status( 200 ).send();
				} );
			} )( req, res, next );
		} ) );

		/*
			req: {
				md5: db8a5d3c57a8e5f7aa7b
				patch: {...}
			}

			res: {
				md5: db8a5d3c57a8e5f7aa7b
				patchs: []
					-- OR --
				base: {...}
			}
		*/
		app.post( '/sync', wrapForErrorProcessing( async( req, res ) => {
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
				await pause(10000); // Simulate long request for testing

				// Check if the client sent updates to the server
				if(data.patch && Object.keys(data.patch).length !== 0) {
					console.log("client has updates", data.patch);

					state = state || await this.databaseCalls.getState( accountId );
					let stateCopy = JSON.parse(JSON.stringify(state)); // Deep copy

					// Apply the patch that was supplied by the client, passing true allows us to ignore any changes that were applied to deleted entries or additions of things that already exist
					objectMerge.patch(state, data.patch, true);

					// Now we'll diff the patched version against our original copied version, this gives us a patch without any edits to deleted entries or additions of things that already exist
					let cleanPatch = objectMerge.diff(stateCopy, state);
					console.log("cleanPatch", JSON.stringify(cleanPatch, null, 2));

					// We can pass the clean patch to the database to persist
					await this.databaseCalls.patchState( cleanPatch, accountId );
					state = await this.databaseCalls.getState( accountId );

					// Now we can derive the patch for this update (with the correct server ids) as well as the checksum of the most recent state and timestamp
					let syncPatch = objectMerge.diff(stateCopy, state);
					let checksum = hasher(state, { 
						algorithm: 'md5',  
						excludeValues: false, 
						respectFunctionProperties: false, 
						respectFunctionNames: false, 
						respectType: false});

					// Update the checksum on the response object and the session
				    responseData.md5 = checksum;
					putAccountInfo(accountId, "stateMd5", checksum);

					// Save the patch for this sync to the session (to speed up future syncs).
					let savedPatch = {};
					savedPatch.patch = syncPatch;
					savedPatch.md5 = checksum;
					stateRecentPatches.push(savedPatch);
					putAccountInfo(accountId, "stateRecentPatches", stateRecentPatches);
					console.log("savedPatch", savedPatch);
				} else {
					console.log("No updates from client", data.patch);
				}

				// Get info about the checksum of the current state from account info
				let stateMd5 = extractAccountInfo( accountId, 'stateMd5' );

				// Calculate the checksum current state if it's not stored in session storage
				if(!stateMd5) {
					console.log("No state hash stored in the session, getting state info", stateMd5);
					state = await this.databaseCalls.getState( accountId );
					let checksum = hasher(state, { 
						algorithm: 'md5',  
						excludeValues: false, 
						respectFunctionProperties: false, 
						respectFunctionNames: false, 
						respectType: false} );

					putAccountInfo(accountId, "stateMd5", checksum);
					stateMd5 = checksum;
				}

				// Check if the server has updates for the client.
				if(data.md5 !== stateMd5) {
					console.log("server has updates", data.md5, stateMd5);
					// If we have a record of the patches we need to update the client, send those instead of the entire state
					let foundMatch = false;
					let patches = stateRecentPatches.filter( v => { 
						if(v.md5 === data.md5) {
							foundMatch = true;
						} 
						return (foundMatch && v.md5 !== data.md5); // We want all patches after the matching md5
					});

					if( patches.length > 0) {
						// Yay, we have patches saved that will update the client to the current state, just send those.
				  		console.log("patches found, sending those instead", stateRecentPatches);
				  		let patchesOnly = patches.map( v => v.patch );
				    	responseData.patches = patchesOnly;
				  	} else {
				    	// We don't have any patches saved in the session for this timestamp, just send the whole state.
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
			console.log("Done ", JSON.stringify(responseData.patches, null, 2));
			res.status( 200 ).send(responseData);

			// Delete values if we are storing too many patches (Not the most refined technique, but it's something)
			console.log("BEFORE", JSON.stringify(stateRecentPatches).length);
			while(JSON.stringify(stateRecentPatches).length > 10000) {
				console.log("Erasing old patch data. New length: " + stateRecentPatches.length -1);
				stateRecentPatches.splice(-1,1);
			}
			console.log("AFTER", JSON.stringify(stateRecentPatches).length);
			
		} ) );

		// This route just accepts reports of Content Security Policy (CSP) violations
		// https://helmetjs.github.io/docs/csp/
		app.post('/report-violation', function (req, res) {
			if (req.body) {
				console.log('CSP Violation: ', req.body)
			} else {
				console.log('CSP Violation: No data received!')
			}
			res.status(204).end()
		})

		// 404 on unrecognized routes
		app.use( function() {
			throw new HandledError( 404, "Resource not found" );
		} );

		// Error handling, so we can catch errors that occur during async too
		function wrapForErrorProcessing( fn ) {
			return async function( req, res, next ) {
				try {
					await fn( req, res, next );
				} catch ( error ) {
					console.log("An error was thrown!")
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

		app.use( function( error, req, res, next ) {
			res.setHeader('content-type', 'application/json');
			if ( error instanceof HandledError ) {
				res.status( error.getStatusCode() ).send( { errors: [ error.getExternalMessage() ] } );
				if ( error.getInternalMessage() ) {
					error.print();
				}
			} else {
				res.status( 500 ).send( { errors: 'Internal Server Error' } );
				console.log( "SERVER ERROR", { errors: [ error.message ] } );
				console.log( "Error", error );
			}
		} );

		this.server = server.listen( this.PORT, function listening() {
			console.log( 'Compute server: Listening on %d', server.address().port );
		} );
	}
};
