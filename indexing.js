// Loading the configuration
var co = require('.');
var plugins = require('./plugins');

module.exports.run = (state) => {
  // Run the indexing with the first available indexing-engine
  var indexingEngine = plugins.getFirst('indexing-engine');
  return indexingEngine(state || {}).then(function() {
    console.log('\nAll done - good bye!');
    process.exit(0);
  }, function(err) {
    console.error('An error occured!');
    console.error(err.stack || err);
    process.exit(1);
  });
};
