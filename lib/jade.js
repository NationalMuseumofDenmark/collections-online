var config = require('./config');
var path = require('path');
var fs = require('fs');
var jade = require('jade');

var viewsPaths = config.appPaths.map((p) => {
  return path.normalize(path.join(p, 'views'));
});

function resolvePath(relativePathToResolve, purpose) {
  var candidatePaths = viewsPaths.map((viewPath) => {
    var candidatePath = path.join(viewPath, relativePathToResolve);
    if (path.basename(candidatePath).indexOf('.') === -1) {
      candidatePath += '.jade';
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

  if (resolvedPath === false) {
    throw new Error('Failed ' + purpose + ' of ' + relativePathToResolve);
  } else {
    return resolvedPath;
  }
}

var Parser = jade.Parser;
Parser.prototype.orginalResolvePath = Parser.prototype.resolvePath;
Parser.prototype.resolvePath = function (pathToResolve, purpose) {
  // Figure out what the filepath of the current file is
  var filepath = path.dirname(this.filename);
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
    return this.orginalResolvePath(pathToResolve, purpose);
  }

  return resolvePath(path.join(relativeFilepath, pathToResolve), purpose);
};

module.exports = jade;
module.exports.resolvePath = resolvePath;
