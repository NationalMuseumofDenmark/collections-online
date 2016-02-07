'use strict';

module.exports = {
  env: 'production',
  site_title: 'Nationalmuseets Samlinger Online',
  es_host: process.env.ES_HOST || '172.16.1.222:80',
  es_assets_index: 'assets',
  natmusApiBaseURL: 'http://api.natmus.dk/',
  enableGeotagging: false,
  googleAnalyticsPropertyID: 'UA-2930791-3'
};
