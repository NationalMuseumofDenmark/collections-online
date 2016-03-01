'use strict';

function contributionCount() {
  // Check if localStorage i supported
  if (typeof(Storage) !== 'undefined') {
    var assetNumber = window.location.href.split('/').pop();
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
        if (localStorage.contributionCount === '5'){
          console.log('god-mode');
          $('.facebook-group').addClass('god-mode');
        }
      }
    }
    console.log('Contribution count = ' + localStorage.contributionCount);
    console.log('Assets cuntributed to = ' + localStorage.contributedAssets);
  }
}

jQuery(function ($) {

  $('.facebook-group a.ok').click(function(e){
    e.preventDefault();
    $('.facebook-group').removeClass('god-mode');
  });

  $('.count').click(function() {
    contributionCount();
  });
});
