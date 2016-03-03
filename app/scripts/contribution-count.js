'use strict';

function godMode() {
  $('.facebook-group').addClass('god-mode');
}

var contributionCount = function(type) {
  // Check if localStorage i supported
  if (typeof(Storage) !== 'undefined') {
    var assetNumber = window.location.href.split('/').splice(-2).join('');
    // Check if user is a contribution virgin
    if (!localStorage.contributionCount) {
      localStorage.contributedAssets = assetNumber;
      localStorage.contributionCount = 1;
    } else {
      // Make sure that the user isn't humping the same old asset
      if (localStorage.contributedAssets.search(assetNumber) === -1) {
        localStorage.contributedAssets += ',' + assetNumber;
        localStorage.contributionCount++;
        // Check if we've reached the magic number
        // TODO change to 5
        if (localStorage.contributionCount === '2'){
          // Did the user geo tag (results in page reload)
          if (type === 'geo') {
            localStorage.geoFive = true;
          } else {
            godMode();
          }
        }
      }
    }
    console.log('Contribution count = ' + localStorage.contributionCount);
    console.log('Assets cuntributed to = ' + localStorage.contributedAssets);
  }
};

jQuery(function ($) {

  $('.facebook-group a.ok').click(function(e){
    e.preventDefault();
    $('.facebook-group').removeClass('god-mode');
  });

  // Check if 5th contribution was geo on page load
  if (typeof(Storage) !== 'undefined') {
    if (localStorage.geoFive) {
      godMode();
      localStorage.geoFive = false;
    }
  }

});
