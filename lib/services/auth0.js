const assert = require('assert');

const domain = process.env.AUTH0_DOMAIN;
const clientID = process.env.AUTH0_CLIENT_ID;
const clientSecret = process.env.AUTH0_CLIENT_SECRET;

assert.ok(domain, 'Missing a AUTH0_DOMAIN environment variable');
assert.ok(clientID, 'Missing a AUTH0_CLIENT_ID environment variable');
assert.ok(clientSecret, 'Missing a AUTH0_CLIENT_SECRET environment variable');

let callbackURL = process.env.AUTH0_CALLBACK_URL;
if(!callbackURL) {
  callbackURL = 'http://localhost:9000/auth/callback';
  console.warn('Missing AUTH0_CALLBACK_URL env variable, using', callbackURL);
}

const Auth0Strategy = require('passport-auth0');

const strategy = new Auth0Strategy({
  domain, clientID, clientSecret, callbackURL
}, function(accessToken, refreshToken, extraParams, profile, done) {
  // accessToken is the token to call Auth0 API (not needed in the most cases)
  // extraParams.id_token has the JSON Web Token
  // profile has all the information from the user
  return done(null, profile);
});

module.exports = {
  strategy
};
