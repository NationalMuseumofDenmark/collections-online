'use strict';

module.exports = {
  env: 'production',
  ip:   process.env.OPENSHIFT_NODEJS_IP ||
        process.env.IP ||
        '0.0.0.0',
  port: process.env.OPENSHIFT_NODEJS_PORT ||
        process.env.PORT ||
        9000,
  site_title: 'Nationalmuseets Samlinger Online',
  es_host: process.env.ES_HOST || '172.16.1.222:80',
  es_assets_index: 'assets',
  natmusApiBaseURL: 'http://api.natmus.dk/',
};
