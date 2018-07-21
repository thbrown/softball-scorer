let databaseCalls = class DatabaseCalls {

	constructor() {
		this.state = {};
		// Passwsord is pizza
		this.userNameAndPasssword = {id:1, password:'$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2'};
	}

	reset() {
		this.state = {};
		this.userNameAndPasssword = {id:1, password:'$2b$12$pYo/XmmYN27OK08.ZyNqtealmhaFRfg6TgIHbuTJFbAiNO7M2rwb2'};
	}

	setAccountIdAndPassword( info ) {
		this.userNameAndPasssword = info;
	}

	async getAccountIdAndPassword( email ) {
		return this.userNameAndPasssword
	}

	setState( state ) {
		this.state = state;
	}

	getState( account_id ) {
		return this.state;
	}

}

// Node only
module.exports = databaseCalls;