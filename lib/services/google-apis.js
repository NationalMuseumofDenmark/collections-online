'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const limiter = require('limiter');

const config = require('../config');
const gcloud = require('google-cloud');

const KEY_FILE_PATH = path.join(config.childPath, 'google-key.json');
assert.ok(fs.existsSync(KEY_FILE_PATH), 'Missing the Google API key file');

const vision = gcloud.vision({
  keyFilename: KEY_FILE_PATH
});

// const visionLimiter = new limiter.RateLimiter(8, 'second');
const visionLimiter = new limiter.RateLimiter(1, 'second');

// Override the vision.annotate method to apply throttling
const originalAnnotate = vision.annotate;
vision.annotate = function() {
  return new Promise((resolve, reject) => {
    visionLimiter.removeTokens(1, (err) => {
      if(err) {
        reject(err);
      } else {
        const result = originalAnnotate.apply(vision, arguments);
        resolve(result);
      }
    });
  });
};

const translate = gcloud.translate({
  keyFilename: KEY_FILE_PATH
});

module.exports  = {
  vision: vision,
  translate: translate
};
