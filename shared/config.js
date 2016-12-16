const config = require('../lib/config');
if(process.browser) {
  /* global clientSideConfig */
  config.setClientSideConfig(clientSideConfig);
}
module.exports = config;
