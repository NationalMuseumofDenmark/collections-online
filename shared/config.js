const config = require('../lib/config');
if(process.browser) {
  /* global clientSideConfig */
  if(clientSideConfig) {
    config.setClientSideConfig(clientSideConfig);
  } else {
    throw Error('Missing the clientSideConfig global object');
  }
}
module.exports = config;
