const plugins = require('../plugins');

module.exports = {
  initialize: () => {
    // Nothing really
  },
  registerPlugins: () => {
    plugins.register('document-service', require('./elasticsearch'));
  }
};
