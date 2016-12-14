/* global config */
module.exports = options => {
  require('search');
  if(config.features.cookieConsent) {
    require('cookie-consent');
  }
  require('dropdown');

  window.helpers = options.helpers;
};
