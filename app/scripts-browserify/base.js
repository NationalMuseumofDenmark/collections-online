/* global config */
require('search');
if(config.features.cookieConsent) {
  require('cookie-consent');
}
require('dropdown');

window.helpers = require('helpers');
