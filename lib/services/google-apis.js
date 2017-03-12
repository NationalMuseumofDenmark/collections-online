'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const config = require('../config');
const gcloud = require('google-cloud');

const KEY_FILE_PATH = path.join(config.childPath, 'google-key.json');
assert.ok(fs.existsSync(KEY_FILE_PATH), 'Missing the Google API key file');

const vision = gcloud.vision({
  keyFilename: KEY_FILE_PATH
});

const translate = gcloud.translate({
  keyFilename: KEY_FILE_PATH
});

module.exports  = {
  vision: vision,
  translate: translate
};
