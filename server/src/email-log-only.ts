import logger from './logger';

// This is an email service that doesn't actually send an email, it just prints the email it would have sent to the logs as a warning
export default class EmailLogOnly {
  constructor() {}

  sendMessage(
    accountId: string,
    destinationEmail: string,
    subject: string,
    message: string,
    html: string
  ) {
    logger.warn(
      accountId,
      'Email was not sent because mailgun was not configured',
      destinationEmail,
      subject,
      message
    );
    return;
  }
}
