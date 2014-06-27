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
    $scope.catalogs = [];
    $scope.categories = [];

    $scope.loading = false;
    $scope.updated = false;

    $scope.catalog = '';
    $scope.q = '';

    $scope.ngProgress = ngProgress;

    $scope.offset = 0;

    $scope.$watch('loading', function(value) {
        // Add spinner or something
    });

    $scope.getBaseUrl = function() {
        var base_url = 'http://' + window.location.host + window.location.pathname;

        if(base_url.slice(-1) != '/') {
            base_url = base_url + '/';
        }

        return base_url;
    };

    $scope.doSearch = function() {
        $scope.offset = 0;
        $scope.results = [];
        $scope.nextPage();
    };

    $scope.setCatalog = function(alias) {
        $scope.catalog = alias;

        if($scope.catalog != '') {
            $scope.loadCategories();
        }

        $scope.doSearch();
    };

    $scope.isLoading = function() {
        return $scope.loading;
    };

    $scope.nextPage = function() {
        $scope.loading = true;

        var url = $scope.getBaseUrl();
        if($scope.catalog != '') {
            url = url + $scope.catalog + '/';
        }
        url = url + "search.json?offset=" + $scope.offset;
        url = url + '&q=' + $scope.q;

        $http.get(url).success(function(data) {
            var results = data.results;
            for (var i = 0; i < results.length; i++) {
                $scope.results.push(results[i]);
            }
            $scope.offset = this.offset + results.length;
            $scope.updated = true;
            $scope.loading = false;
        }.bind($scope));
    };

    $scope.loadCatalogs = function() {
        var url = $scope.getBaseUrl() + 'catalogs.json';
        $http.get(url).success(function(data) {
            $scope.catalogs = data;
        });
    };

    $scope.loadCategories = function() {
        var url = $scope.getBaseUrl() + $scope.catalog + '/categories.json';
        $http.get(url).success(function(data) {
            $scope.categories = [data];
        });
    };

    $scope.loadCatalogs();
});


app.directive('updateMasonryContainer', function() {
    return {
        restrict: 'A',
        link: function(scope) {
            if(scope.updated) {
                var container = document.querySelector('#masonry-container');
                var msnry;
                // Initialize Masonry after all images have loaded
                imagesLoaded(container, function() {
                    msnry = new Masonry(container);
                    scope.updated = false;
                });
            }
        }
    };
});
