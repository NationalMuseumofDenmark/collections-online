var path = require('path');
var fs = require('fs');
var pugLoad = require('pug-load');

module.exports = function(config) {
  if(!config) {
    config = require('./config');
  }

  var viewsPaths = config.appPaths.map((p) => {
    return path.normalize(path.join(p, 'views'));
  });

  function resolvePath(relativePathToResolve) {
    var candidatePaths = viewsPaths.map((viewPath) => {
      var candidatePath = path.join(viewPath, relativePathToResolve);
      if (path.basename(candidatePath).indexOf('.') === -1) {
        candidatePath += '.pug';
      }
      return candidatePath;
    });

    var resolvedPath = candidatePaths.reduce((result, candidatePath) => {
      if(!result) {
        try {
          if (fs.statSync(candidatePath)) {
            return candidatePath;
          }
        } catch(e) {
          // We expect that this might fail - if the file does not exist.
        }
      } else {
        return result;
      }
    }, false);

    if (!resolvedPath) {
      throw new Error('Failed to resolve ' + relativePathToResolve + ' tried ' +
                      candidatePaths);
    } else {
      return resolvedPath;
    }
  }

  return {
    resolve: function(filename, source, options) {
      // Figure out what the filepath of the current file is
      var filepath = path.dirname(source);
      // What is this path, relative to the relevant views directory path?
      var relativeFilepath = viewsPaths.reduce((result, viewPath) => {
        if(filepath.indexOf(viewPath) === 0) {
          return filepath.substring(viewPath.length);
        } else {
          return result;
        }
      }, false);

      if(relativeFilepath === false) {
        // Rely on the original resolve path method.
        return pugLoad.resolve(filename, source, options);
      }

      return resolvePath(path.join(relativeFilepath, filename));
    }
  };
};
