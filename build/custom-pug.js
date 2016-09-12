module.exports = function(config) {
  var pug = require('../lib/pug')(config);
  var postfix = '\nmodule.exports = template;';

  var originalCompileClient = pug.compileClient;
  pug.compileClient = function(contents, opts) {
    return originalCompileClient(contents, opts) + postfix;
  };

  return pug;
};
