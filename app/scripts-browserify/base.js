module.exports = options => {
  const config = require('collections-online/shared/config');

  require('./search');
  if(config.features.cookieConsent) {
    require('./cookie-consent');
  }

  require('./asset');
  if(config.features.geoTagging || config.features.motifTagging) {
    require('./document/contribution-counter');
  }
  if(config.features.geoTagging) {
    require('./document/geo-tagging');
  }
  if(config.features.motifTagging) {
    require('./document/motif-tagging');
  }
  if(config.features.scrollToTop) {
    require('./scroll-to-top');
  }

  require('./sidebar-menu');
  require('./dropdown');

  window.helpers = options.helpers;
};
