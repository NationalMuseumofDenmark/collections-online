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

// Retrieve the main menu and its childern
$(function() {
  $.ajax({
  url: 'main-menu/catalogs?url=' + window.location.pathname.split('/')[1], // Append path to mark active
  // dataType: 'default: Intelligent Guess (Other values: xml, json, script, or html)',
  })
  .done(function(data) {
    console.log("success");
    console.log(data);
    $('.categories-menu .nav').html(data);
  })
  .fail(function(data) {
    console.log("error");
  })
  .always(function(data) {
    console.log("complete");
  });
});