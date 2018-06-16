/*eslint no-process-exit:*/
'use strict';

const http = require( 'http' );
const path = require( 'path' );
const express = require( 'express' );
const helmet = require('helmet');
const passport = require( 'passport' );
const passportSession = require( 'express-session' );
const LocalStrategy = require( 'passport-local' ).Strategy;
const bodyParser = require( 'body-parser' );
const favicon = require( 'serve-favicon' );
const bcrypt = require( 'bcrypt' );
const crypto = require( 'crypto' );

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
							email: email
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
		app.use( helmet() );
		app.use( favicon( __dirname + '/../assets/fav-icon.png' ) );
		app.use( '/build', express.static( path.join( __dirname + '/../build' ).normalize() ) );
		app.use( '/assets', express.static( path.join( __dirname + '/../assets' ).normalize() ) );
		app.use( bodyParser.json( { limit: '3mb' } ) ); // TODO: size this appropriately
		app.use( passportSession( {
			secret: crypto.randomBytes( 20 ).toString( 'hex' ), // TODO: move secret to config
			resave: false,
			saveUninitialized: false,
			name: 'softball.sid',
			cookie: { 
				httpOnly: true,
				expires: new Date( 253402300000000 )
				// Secure header is set by nginx revers proxy
			}
		} ) );
		app.use( passport.initialize() );
		app.use( passport.session() );

		// Helper
		let extractAccountId = function( req ) {
			if ( req && req.session && req.session.passport && req.session.passport.user && req.session.passport.user.accountId ) {
				return req.session.passport.user.accountId;
			} else {
				return undefined;
			}
		};

		// Routes
		app.get( '/', wrapForErrorProcessing( ( req, res ) => {
			res.sendFile( path.join( __dirname + '/../index.html' ).normalize() );
		} ) );

		app.post( '/state', wrapForErrorProcessing( async( req, res ) => { // Should this be a patch??
			let accountId = extractAccountId( req );
			await this.databaseCalls.setState( req.body, accountId );
			res.status( 204 ).send();
		} ) );

		app.get( '/state', wrapForErrorProcessing( async( req, res ) => {
			let accountId = extractAccountId( req );
			let state = await this.databaseCalls.getState( accountId );
			res.status( 200 ).send( state );
		} ) );

		app.get( '/state-pretty', wrapForErrorProcessing( async( req, res ) => {
			let accountId = extractAccountId( req );
			let state = await this.databaseCalls.getState( accountId );
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

		// 404 on unrecognized routes
		app.use( function() {
			throw new HandledError( 404, "Resource not found" );
		} );

		// Error handling, so we can catch erros that occure during async too
		function wrapForErrorProcessing( fn ) {
			return async function( req, res, next ) {
				try {
					await fn( req, res, next );
				} catch ( error ) {
					next( error );
				}
			};
		}

		app.use( function( error, req, res ) {
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
