module.exports = options => {
  const config = require('collections-online/shared/config');

  require('search');
  if(config.features.cookieConsent) {
    require('cookie-consent');
  }
  
  require('asset');
  if(config.features.geotagging) {
    require('document/geo-tags');
  }
  require('dropdown');

  window.helpers = options.helpers;
};
