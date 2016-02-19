var elasticsearch = require('elasticsearch'),
    config = require('../config/config.js');

module.exports = new elasticsearch.Client({
  host: config.es_host
});
