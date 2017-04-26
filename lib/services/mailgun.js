const config = require('collections-online/shared/config');
const request = require('request');
const assert = require('assert');

const { mailgunKey, baseUrl } = config.email;
const URL = 'https://api:' + mailgunKey + baseUrl;

function sendMessage(from, to, subject, html) {
  assert.ok(from, 'Missing from parameter');
  assert.ok(to, 'Missing to parameter');
  assert.ok(subject, 'Missing subject parameter');
  assert.ok(html, 'Missing html parameter');
  assert.ok(mailgunKey, 'Missing Mailgun API key.')

  return new Promise((resolve, reject) => {
    request.post(URL + '/messages', { form: { from, to, subject, html }}, (error, response, body) => {
      if(error) {
        reject(error)
      } else {
        resolve({status: 'ok'})
      }
    })
  })
}

module.exports = { sendMessage }
