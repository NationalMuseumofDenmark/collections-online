var _ = require('lodash');
var pug = require('pug');

module.exports = function(config) {
  var postfix = '\nmodule.exports = template;';

  var pugResolvePlugin = require('../lib/pug-resolve-plugin')(config);

  var originalCompileClient = pug.compileClient;
  pug.compileClient = function(contents, opts) {
    opts = _.merge(opts, {
      plugins: [pugResolvePlugin]
    });
    return originalCompileClient(contents, opts) + postfix;
  };

  return pug;
};
