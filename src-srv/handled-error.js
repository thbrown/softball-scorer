const HandledError = class HandledError extends Error {

	constructor(statusCode, external, internal) {
		super(external);
		this.statusCode = statusCode;
		this.external = external;
		this.internal = internal;
	}

	getStatusCode() {
		return this.statusCode ? this.statusCode : 500;
	}

	getExternalMessage() {
		return this.external ? this.external : "No error message available";
	}

	getInternalMessage() {
		return this.internal;
	}

	print() {
		console.log('HANDLED ERROR WITH INTERNAL MESSAGE');
		console.log(`STATUS: ${this.getStatusCode()}`);
		console.log(`EXTERNAL: ${this.getExternalMessage()}`);
		console.log(`INTERNAL: ${this.getInternalMessage()}`);
		console.log(`TRACE: ${this.stack}`);
	}
};

// Node only
module.exports = HandledError;
