'use strict';
////////////////////////////////////////////////////
// JS file containing logic used a cross the site //
////////////////////////////////////////////////////


// Open / close main menu nav
$(function() {
    $('#heading-categories-menu a').click(function(e){
      $('body').toggleClass('categories-menu-open');
      return false;
    });
});


// Typehead autosuggest for search field
$(function() {
  var searchSuggest = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: 'suggest.json?text=%QUERY'
  });

  searchSuggest.initialize();

  $('#search-input').typeahead(null, {
    name: 'dropdown-menu',
    displayKey: 'text',
    source: searchSuggest.ttAdapter()
  });
});