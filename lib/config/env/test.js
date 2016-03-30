'use strict';

module.exports = {
  env: 'test',
  ip:   process.env.OPENSHIFT_NODEJS_IP ||
        process.env.IP ||
        '0.0.0.0',
  port: process.env.OPENSHIFT_NODEJS_PORT ||
        process.env.PORT ||
        9000,
  viewsPath: '/views',
  siteTitle: 'Nationalmuseets Samlinger Online (beta)',
  esHost: '172.16.1.222:80',
  esAssetsIndex: 'test_assets',
  natmusApiBaseURL: 'http://testapi.natmus.dk/',
  googleAnalyticsPropertyID: 'UA-2930791-7'
};
