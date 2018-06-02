/*eslint no-process-exit:*/
'use strict';

const http = require('http');
const path = require('path');
const express = require('express');
const passport = require('passport');
const passportSession = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const favicon = require('serve-favicon');
const bcrypt = require('bcrypt');

const HandledError = require( './handled-error.js' )

const saltRounds = 12;

module.exports = class SoftballServer {

	constructor(databaseCalls) {
		this.databaseCalls = databaseCalls;
		this.PORT = 8888;
	}

	start() {
		// Authentication
		passport.use(new LocalStrategy({
		    usernameField: 'email',
		    passwordField: 'password'
		},
		async function(email, password, cb) {
		  	console.log("Checking credentials...", email);

		  	try {
				let accountInfo = await databaseCalls.getAccountIdAndPassword(email);
				console.log("Details",accountInfo, userInfo.password,email);

				let isValid = false;
			  	if(accountInfo && accountInfo.password && email) {
				  	isValid = await bcrypt.compare(password, accountInfo.password);
				  	console.log("isValid", isValid);
				}

				if(isValid) {
					console.log("Login accepted");
					let sessionInfo = {
						id: accountInfo.id
					}
					cb(null,sessionInfo);
				} else {
					cb(null, false);
					console.log("Login rejected");
				}
			} catch (error) {
				console.log(error);
				cb(null, false);
			}
		}));

		passport.serializeUser(function(sessionInfo, cb) {
			console.log("Serializing", sessionInfo);
			cb(null, sessionInfo);
		});

		passport.deserializeUser(async function(sessionInfo, cb) {
			cb(null, sessionInfo);
		});

		// Prep the web server
		const app = express();
		app.disable('x-powered-by');
		const server = http.createServer(app);

		// Middleware
		app.use(favicon(__dirname + '/fav-icon.png'));
		app.use(bodyParser.json({limit: '2mb'})); // TODO: size this appropriately
		app.use(passportSession({ secret: 'o6TjCBAL5USjcuvlodSq', resave: false, saveUninitialized: false})); // TODO: move to config
		app.use(passport.initialize());
		app.use(passport.session());
		app.use('/build', express.static(path.join(__dirname+'/../build').normalize()));
		app.use('/assets', express.static(path.join(__dirname+'/../assets').normalize()));

		// Routes
		app.get( '/', wrapForErrorProcessing( ( req,res ) => {
			res.sendFile(path.join(__dirname+'/../index.html').normalize());
		}));

		app.post( '/state', wrapForErrorProcessing( async ( req,res ) => { // Should this be a patch??
			await this.databaseCalls.setState(req.body);
			res.status(204).send();
		}));

		app.get( '/state', wrapForErrorProcessing( async ( req,res ) => {
			let state = await this.databaseCalls.getState();
			res.status(200).send( state );
		}));

		app.get( '/state_pretty', wrapForErrorProcessing( async ( obj, resp ) => {
			let state = await this.databaseCalls.getState();
			res.status(200).send( JSON.stringify( state, null, 2 ) );
		}));

		app.post( '/login', wrapForErrorProcessing( ( req, res, next ) => {
			console.log(req.body);
			var email = req.params.email;
			passport.authenticate('local', function(err, user, info) {
				console.log('FAIL!', user, err, info);
				if (err || !user) { 
					return;
				}
				req.logIn(user, function(err) {
						console.log('Success!');
					}
				);
			})(req, res, next);
		}));

		// 404 on unrecognized routes
		app.use(function(req, res){
			throw new HandledException(404, "Resource not found");
		});

		// Error handling
		function wrapForErrorProcessing(fn) {
			return async function(req, res, next) {
				try {
					await fn(req, res, next);
				} catch (error) {
					next(error);
				} 
			};
		}

		app.use(function (error, req, res, next) {
			if (error instanceof HandledError) {
				res.status(error.getStatusCode()).send({errors: [error.getExternalMessage()]});
				if(error.getInternalMessage()) {
					error.print();
				}
			} else {
				res.status(500).send({errors: 'Internal Server Error'});
				console.log("SERVER ERROR", {errors: [error.message]});
				console.log("Error", error);
			} 
		});

		this.server = server.listen(this.PORT, function listening() {
			console.log('Compute server: Listening on %d', server.address().port);
		});

	}
}