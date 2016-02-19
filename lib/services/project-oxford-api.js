var oxford = require('project-oxford'),
    config = require('../config/config.js');

module.exports = new oxford.Client(config.projectOxfordAPIKey);
