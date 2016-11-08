var path = require('path');
var pug = require('pug');
var _ = require('lodash');

module.exports = function(config) {
  var pugResolvePlugin = require('./pug-resolve-plugin')(config);
  var viewsPath = path.join(__dirname, '..', 'app', 'views', '*');

  // Resolve non-absolute paths
  function replacePathMaybe(path) {
    if (path[0] !== '/') {
      path = pugResolvePlugin.resolve(path, viewsPath);
    }
    return path;
  }

  // Add pug resolve plugin
  function addResolvePlugin(opts) {
    opts = _.merge(opts, {
      plugins: [pugResolvePlugin]
    });
    return opts;
  }

  // Add pug-resolve-plugin when pug.compileClient is run
  var originalCompileClient = pug.compileClient;
  pug.compileClient = function(source, opts) {
    opts = addResolvePlugin(opts);
    return originalCompileClient(source, opts);
  };


  // Add pug-resolve-plugin when pug.compileFile is run
  var originalCompileFile = pug.compileFile;
  pug.compileFile = function(path, opts) {
    path = replacePathMaybe(path);
    opts = addResolvePlugin(opts);
    return originalCompileFile(path, opts);
  };

  // Add pug-resolve-plugin when pug.compileFile is run
  var originalCompileFileClient = pug.compileFileClient;
  pug.compileFileClient = function(path, opts) {
    path = replacePathMaybe(path);
    opts = addResolvePlugin(opts);
    return originalCompileFileClient(path, opts);
  };

  // Add pug-resolve-plugin when pug.compileFile is run
  var originalRenderFile = pug.renderFile;
  pug.renderFile = function(path, opts, fn) {
    path = replacePathMaybe(path);
    opts = addResolvePlugin(opts);
    return originalRenderFile(path, opts, fn);
  };

  return pug;
};
