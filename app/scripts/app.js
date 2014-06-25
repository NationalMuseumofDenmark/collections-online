'use strict';

var app = angular.module('natmusSamlingerApp', [
  'ngCookies',
  'ngResource',
  'ngSanitize',
  'ngProgress',
  'infinite-scroll'
]);

app.controller('searchController', function($scope, $http, ngProgress) {
    $scope.results = [];
    $scope.offset = 0;
    $scope.updated = false;
    $scope.q = '';
    $scope.ngProgress = ngProgress;

    $scope.doSearch = function() {
        $scope.offset = 0;
        $scope.results = [];
        $scope.nextPage();
    };

    $scope.nextPage = function() {
        $scope.ngProgress.height(5);
        $scope.ngProgress.reset();
        $scope.ngProgress.start();

        var base_url = 'http://' + window.location.host + window.location.pathname;
        if(base_url.slice(-1) != '/') {
            base_url = base_url + '/';
        }
        var url = base_url + "search.json?offset=" + $scope.offset;
        url = url + '&q=' + $scope.q;

        $http.get(url).success(function(data) {
            var results = data.results;
            for (var i = 0; i < results.length; i++) {
                $scope.results.push(results[i]);
            }
            $scope.offset = this.offset + results.length;
            $scope.updated = true;
            $scope.ngProgress.complete();
        }.bind($scope));
    };
});


app.directive('updateMasonryContainer', function() {
    return {
        restrict: 'A',
        link: function(scope) {
            if(scope.updated) {
                scope.updated = false;
                var container = document.querySelector('#masonry-container');
                var msnry;
                // Initialize Masonry after all images have loaded
                imagesLoaded(container, function() {
                    msnry = new Masonry(container);
                });
                scope.ngProgress.complete();
            }
        }
    };
});
