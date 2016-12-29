'use strict';

const Snackbar = require('../snackbar');

const contributionCount = {
  init: function() {
    $('.facebook-group a.ok').click(function(e) {
      e.preventDefault();
      $('.facebook-group').removeClass('show-face');
      // Make sure the dialog is no longer shown
      if (localStorage) {
        localStorage.setItem('showFacebook', false);
      }
      return false;
    });

    if (localStorage) {
      if (localStorage.geoFive) {
        localStorage.geoFive = false;
      }
    }

    // Check if we should show facebook-thanks on load
    this.showFacebookMaybe();
  },
  contributionAdded: function() {
    if (localStorage) {
      var $article = $('article');
      var asset = $('article').data('catalog') + '-' + $('article').data('id');
      var contributions = localStorage.getItem('contributions');
      // Split or default to an empty array
      contributions = contributions ? contributions.split(',') : [];

      if(contributions.indexOf(asset) === -1) {
        contributions.push(asset);
        // If this was the fifth contribution - show the facebook dialog
        localStorage.setItem('showFacebook', contributions.length === 5);
      }
      localStorage.setItem('contributions', contributions.join());

      this.showFacebookMaybe();
    }
  },
  showFacebookMaybe: function() {
    if (localStorage.getItem('showFacebook') === 'true') {
      $('.facebook-group').addClass('show-face');
      // Make sure that no snackbar messages will overlay the modal
      Snackbar.clear();
      return true;
    }
    return false;
  }
};

module.exports = contributionCount;

$(function($) {
  contributionCount.init();
});
