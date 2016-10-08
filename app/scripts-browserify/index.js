/* global config */
if(config.features.clientSideSearchResultRendering) {
  require('search');
}
if(config.features.cookieConsent) {
  require('cookie-consent');
}
require('dropdown');
