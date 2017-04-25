const pug = require('pug');
const config = require('collections-online/shared/config');
const request = require('request');

exports.save = function save(req, res, next) {
  const { message } = req.body;
  const { id } = req.params;

  renderTemplate(req, message, id)
  .then(html => sendMail(html, id))
  .then(status => res.json({ status }) )
  .catch(error => next(error));
}

function renderTemplate(req, message, id) {
  return new Promise((resolve, reject) => {
    req.app.render('emails/feedback', { message, id }, (error, html) => {
      if(error) {
        reject(error);
      } else {
        resolve(html);
      }
    })
  })
}

function sendMail(html, id) {
  const { mailgunKey, baseUrl } = config.email;
  const url = 'https://api:' + mailgunKey + baseUrl + '/messages';

  const form = {
    from: 'feedback@kbhbilleder.dk',
    to: config.feedback.recipients,
    subject: 'Feedback på asset nr. ' + id,
    html
  }

  return new Promise((resolve, reject) => {
    request.post(url, { form }, (error, response, body) => {
      if(error) {
        reject(error)
      } else {
        resolve({status: 'ok'})
      }
    })
  })
}
