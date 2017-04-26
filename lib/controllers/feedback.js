const pug = require('pug');
const config = require('collections-online/shared/config');
const request = require('request');
const mailgun = require('../services/mailgun');

exports.save = function save(req, res, next) {
  const { message } = req.body;
  const { collection, id } = req.params;
  const { user } = res.locals;
  const { fromAddress, recipients } = config.feedback;

  const subject = `[Feedback] Asset ${collection}-${id}`

  renderTemplate(req, message, collection, id, user)
  .then(html => mailgun.sendMessage(fromAddress, recipients, subject, html))
  .then(status => res.json(status))
  .catch(error => next(error));
}

function renderTemplate(req, message, collection, id, user) {
  return new Promise((resolve, reject) => {
    req.app.render('emails/feedback', { message, collection, id, user }, (error, html) => {
      if(error) {
        reject(error);
      } else {
        resolve(html);
      }
    })
  })
}
