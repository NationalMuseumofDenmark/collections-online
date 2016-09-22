var Q = require('q');

var plugins = {};

var requiredMethods = {
  'image-controller': [
    'proxy',
    'image',
    'downloadImage',
    'thumbnail',
    'download'
  ]
};

function validateMethods(type, plugin) {
  var expectedMethods = requiredMethods[type] || [];
  expectedMethods.forEach((method) => {
    if(!plugin[method]) {
      throw new Error('The image controller is missing a method: ' + method);
    }
  });
}

function validatePlugin(type, plugin) {
  validateMethods(type, plugin);
}

exports.validatePlugin = validatePlugin;

exports.register = (type, plugin) => {
  // validatePlugin throws exceptions when invalid
  validatePlugin(type, plugin);
  // Create an array for the plugins of this type, if it doesn't exist
  if(typeof(plugins[type]) !== 'object') {
    plugins[type] = [];
  }
  // Push the plugin to the list
  plugins[type].push(plugin);
};

exports.getFirst = (type) => {
  if(plugins[type] && plugins[type].length > 0) {
    return plugins[type][0];
  }
  throw new Error('No plugins of the desired type (' + type + ')');
};

exports.all = plugins;

exports.initialize = (pluginPackages, app, config) => {
  // Initialize all the plugins
  if(!pluginPackages) {
    pluginPackages = [];
  }
  // Register plugins
  pluginPackages.forEach((package) => {
    if(typeof(package.registerPlugins) !== 'function') {
      throw new Error('Expected plugin to have a registerPlugins function');
    } else {
      package.registerPlugins();
    }
  });
  // Initialize every plugin package
  var pluginPromises = pluginPackages.map((package) => {
    if(typeof(package.initialize) !== 'function') {
      throw new Error('Expected plugin to have an initialize function');
    } else {
      var result = package.initialize(app, config);
      if(!result.then) {
        throw new Error('Expected plugin return a promise when initialized');
      }
      return result;
    }
  });
  return Q.all(pluginPromises);
};
