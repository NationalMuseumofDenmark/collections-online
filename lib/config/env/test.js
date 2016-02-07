'use strict';

module.exports = {
  env: 'test',
  ip:   process.env.OPENSHIFT_NODEJS_IP ||
        process.env.IP ||
        '0.0.0.0',
  port: process.env.OPENSHIFT_NODEJS_PORT ||
        process.env.PORT ||
        9000,
  site_title: 'Nationalmuseets Samlinger Online (beta)',
  es_host: '172.16.1.222:80',
  es_assets_index: 'test_assets',
  natmusApiBaseURL: 'http://testapi.natmus.dk/',
  googleAnalyticsPropertyID: 'UA-2930791-7'
};
