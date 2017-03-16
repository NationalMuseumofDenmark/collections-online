const Q = require('q');

// An object of lists of modules, keyed on their type
const pluginModulesByType = {};
// An array of plugins
const plugins = [];

var requiredMethods = {
  'image-controller': [
    'proxy',
    'proxyDownload',
    'proxyThumbnail'
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

exports.register = (plugin) => {
  if(!plugin.type) {
    throw new Error('The plugin was missing a type');
  } else if(!plugin.module) {
    throw new Error('The plugin was missing a module');
  }
  // Validate the plugin, throwing an error if invalid
  validatePlugin(plugin.type, plugin.module);
  // Let's notify the developer that the plugin was registered
  console.log('A plugin of type "' + plugin.type + '" was registered');
  // Create an array for the plugins of this type, if it doesn't exist
  if(typeof(pluginModulesByType[plugin.type]) !== 'object') {
    pluginModulesByType[plugin.type] = [];
  }
  // Push the plugin to the list
  pluginModulesByType[plugin.type].push(plugin.module);
  plugins.push(plugin);
};

exports.getFirst = (type) => {
  if(pluginModulesByType[type] && pluginModulesByType[type].length > 0) {
    return pluginModulesByType[type][0];
  }
  throw new Error('No plugins of the desired type (' + type + ')');
};

exports.initialize = (app, config) => {
  // Initialize every plugin package
  var pluginPromises = plugins.map((plugin) => {
    if(typeof(plugin.initialize) === 'function') {
      return Q.when(plugin.initialize(app, config));
    } else {
      return Q.when(undefined);
    }
  });
  // Return a promise that gets resolved when all plugins have initialized
  return Q.all(pluginPromises);
};

exports.all = () => {
  return plugins;
};
