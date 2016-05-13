'use strict';

var oxford = require('project-oxford'),
    config = require('../config');

module.exports = new oxford.Client(config.projectOxfordAPIKey);
