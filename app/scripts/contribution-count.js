'use strict';

window.contributionAdded = function() {
  if (typeof(Storage) !== 'undefined') {
    var asset = $('article').data('catalog') + $('article').data('id');
    var assets;
    var count;
    if (!localStorage.contribution) {
      localStorage.setItem('contribution', asset);
      localStorage.setItem('showFacebook', false);
    } else {
      assets = localStorage.getItem('contribution');
      if (assets.search(asset) === -1) {
        assets += ',' + asset;
        localStorage.setItem('contribution', assets);

        count = localStorage.getItem('contribution').split(',').length;
        if (count === 5) {
          localStorage.setItem('showFacebook', true);
        }
      }
    }
  }
};

window.showFacebookMaybe = function() {
  if (localStorage.getItem('showFacebook') === 'true') {
    $('.facebook-group').addClass('show-face');
    localStorage.setItem('showFacebook', false);
  }
};

jQuery(function($) {

  $('.facebook-group a.ok').click(function(e) {
    e.preventDefault();
    $('.facebook-group').removeClass('show-face');
    return false;
  });

  if (typeof(Storage) !== 'undefined') {
    if (localStorage.geoFive) {
      localStorage.geoFive = false;
    }
  }

});
