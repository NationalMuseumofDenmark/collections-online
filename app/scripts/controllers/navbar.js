'use strict';

angular.module('natmusSamlingerApp')
  .controller('NavbarCtrl', function ($scope, $location, Auth) {
    $scope.menu = [{
      'title': 'Home',
      'link': '/'
    }];

    $scope.isActive = function(route) {
      return route === $location.path();
    };
  });
