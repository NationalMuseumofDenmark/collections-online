const config = require('../lib/config');
const plugins = require('../plugins');

module.exports = {
  initialize: () => {
    // Nothing really
  },
  registerPlugins: () => {
    if(config.es) {
      plugins.register('document-service', require('./elasticsearch'));
    }
  }
};
