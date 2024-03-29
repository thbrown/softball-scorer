import formData from 'form-data';
import Mailgun from 'mailgun.js';
const mailgun = new Mailgun(formData);
import logger from './logger';
import Client from 'mailgun.js/client';

// This email service sends emails using a configured MailGun account (https://www.mailgun.com/)
export class EmailMailGun {
  restrictEmailsToDomain: string;
  domain: string;
  mg: Client;

  constructor(apiKey: string, domain: string, restrictEmailsToDomain: string) {
    this.restrictEmailsToDomain = restrictEmailsToDomain;
    this.domain = domain;
    this.mg = mailgun.client({
      username: 'api',
      key: apiKey,
    });
  }

  sendMessage(accountId, destinationEmail, subject, message, html) {
    // So we don't email randos during testing, only allow emails to be sent to a particular domain (probably softball.app)
    if (
      this.restrictEmailsToDomain &&
      !destinationEmail.endsWith(this.restrictEmailsToDomain)
    ) {
      logger.warn(
        accountId,
        `Email was not sent because it does not end with a ${this.restrictEmailsToDomain} domain. Emails are restricted to this domain as specified in the config.`,
        destinationEmail,
        subject,
        message
      );
      return;
    }

    // Send the email!
    const data = {
      from: 'Softball.app <support@softball.app>',
      to: destinationEmail,
      bcc: 'notify@softball.app',
      subject: subject,
      text: message,
      html: html,
    };
    this.mg.messages.create(this.domain, data).catch(function (error) {
      if (error) {
        logger.error(accountId, 'Error while sending email', error);
      }
      logger.log(accountId, 'Email sent');
    });
  }
}
