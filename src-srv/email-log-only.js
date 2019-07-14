const logger = require('./logger.js');

// This is an email service that doesn't actually send an email, it just prints the email it would have sent to the logs as a warning
module.exports = class EmailLogOnly {
  constructor() {}

  sendMessage(accountId, destinationEmail, subject, message) {
    logger.warn(
      accountId,
      'Email was not sent because mailgun was not configured',
      destinationEmail,
      subject,
      message
    );
    return;
  }
};
