'use strict';

$('.facebook-group').addClass('show-face');

window.contributionAdded = function() {
  if (typeof(Storage) !== 'undefined') {
    var asset = $('article').data('uniq');
    var assets;
    var count;
    var facebook;
    if (!localStorage.contribution) {
      localStorage.setItem('contribution', asset);
      localStorage.setItem('facebookShown', false);
    } else {
      assets = localStorage.getItem('contribution');
      if (assets.search(asset) === -1) {
        assets += ',' + asset;
        localStorage.setItem('contribution', assets);
      }
      count = localStorage.getItem('contribution').split(',').length;
      facebook = localStorage.getItem('facebookShown');
    }
    console.log(assets + ' ' + count + ' ' + facebook);
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
