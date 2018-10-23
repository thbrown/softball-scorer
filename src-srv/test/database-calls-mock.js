let databaseCalls = class DatabaseCalls {

	constructor() {
		this.state = {};
		// Passwsord is pizza
		this.accountInfo = { id: 1, email: 'brutongaster@softball.app', password_hash: '$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2' };
	}

	reset() {
		this.state = {};
		this.accountInfo = { id: 1, email: 'brutongaster@softball.app', password_hash: '$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2' };
	}

	setAccountIdAndPassword( info ) {
		this.accountInfo = info;
	}

	getAccountFromEmail( email ) {
		return this.accountInfo
	}

	setState( state ) {
		this.state = state;
	}

	getState( account_id ) {
		return this.state;
	}

	getAccountFromTokenHash( passwordTokenHash ) {
		return this.accountInfo;
	}

	async getAccountIdAndPassword( email ) {
		return this.accountInfo;
	}

	async signup( email, passwordTokenHash ) {
		return this.accountInfo; // TODO: return different account if here without the password_hash
	}

	async setPasswordHash( accountId, newPasswordHash ) {
		return;
	}

	async setPasswordTokenHash( accountId, newPasswordHash ) {
		return;
	}

	async deleteAccount( accountId ) {
		return;
	}

};

// Node only
module.exports = databaseCalls;
