const mailgun = require("mailgun-js");
const config = require("./config.js");
const logger = require("./logger.js");

const { apiKey: apiKey, domain: domain, allowAllDomains: allowAllDomains } =
  config.email || {};
let mg = null;
if (apiKey && domain) {
  mg = mailgun({ apiKey: apiKey, domain: domain });
}

exports.sendMessage = function(accountId, destinationEmail, subject, message) {
  // Don't send an email if mailgun api-key and domain were not provided in the config
  if (!mg) {
    logger.warn(
      accountId,
      "Email was not sent because mailgun was not configured",
      destinationEmail,
      subject,
      message
    );
    return;
  }

  // So we don't email randos during testing, only allow emails to be sent to softball.app domains
  if (!allowAllDomains && !destinationEmail.endsWith("softball.app")) {
    logger.warn(
      accountId,
      "Email was not sent because it does not end with a softball.app domain",
      destinationEmail,
      subject,
      message
    );
    return;
  }

  // Otherwise, do send the email!
  const data = {
    from: "Softball.app <support@softball.app>",
    to: destinationEmail,
    bcc: "notify@softball.app",
    subject: subject,
    text: message
  };
  mg.messages().send(data, function(error, body) {
    if (error) {
      logger.error(accountId, "Error while sending email", error);
    }
    logger.log(accountId, "Email sent");
  });
};
