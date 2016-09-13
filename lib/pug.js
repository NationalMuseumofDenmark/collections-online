var pug = require('pug');
var _ = require('lodash');

module.exports = function(config) {
  var pugResolvePlugin = require('./pug-resolve-plugin')(config);

  var originalCompileClient = pug.compileClient;
  pug.compileClient = function(contents, opts) {
    opts = _.merge(opts, {
      plugins: [pugResolvePlugin]
    });
    return originalCompileClient(contents, opts);
  };

  return pug;
};