'use strict';

angular.module('natmusSamlingerApp')
  .factory('Session', function ($resource) {
    return $resource('/api/session/');
  });
