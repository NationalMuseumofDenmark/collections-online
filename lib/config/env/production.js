'use strict';

module.exports = {
  env: 'production',
  viewsPath: '/views',
  siteTitle: 'Nationalmuseets Samlinger Online',
  esHost: process.env.ES_HOST || '172.16.1.222:80',
  esAssetsIndex: 'assets',
  natmusApiBaseURL: 'http://api.natmus.dk/',
  enableGeotagging: false,
  googleAnalyticsPropertyID: 'UA-2930791-3'
};
