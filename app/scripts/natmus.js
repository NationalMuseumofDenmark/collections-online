'use strict';
/*global $ */
////////////////////////////////////////////////////
// JS file containing logic used a cross the site //
////////////////////////////////////////////////////


// Open / close main menu nav
$(function() {
    $('#heading-categories-menu a').click(function(e) {
      $('body').toggleClass('categories-menu-open');
      
      return false;
    });
});


// Typehead autosuggest for search field
$(function() {
  var searchSuggest = new Bloodhound({
    datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: '/suggest.json?text=%QUERY'
  });

  searchSuggest.initialize();

  $('#search-input').typeahead({
    hint: true,
    highlight: true,
    minLength: 2
  }, {
    name: 'dropdown-menu',
    displayKey: function(data) {
      return data.text;
    },
    source: searchSuggest.ttAdapter(),
    templates: {
      suggestion: function (data) { return data.text; }
    }
  });
});

// Retrieve the main menu and its childern
$(function() {
  $.ajax({url: '/catalogs', // Append path to mark active
  })
  .done(function(data) {
    var menu = $('.categories-menu .nav');
    menu.html(data);
    
    menu.niceScroll({
      cursorcolor:'#555',
      background: '',
      cursorwidth: '7px',
      cursorborder: 'none',
      autohidemode: false,
      horizrailenabled: false,
      zindex: 999999
    });

    // Expand menus
    $('.categories-menu ul a.col-xs-2').click(function(e) {
      e.preventDefault();
      $(this).next('ul').slideToggle(300);

      menu.getNiceScroll().resize();
    });
  })
  .fail(function(data) {
    $('.categories-menu .nav').html('<li><a href="' + window.location.pathname + '" class="col-xs-12">Uups, der skete en fejl. Prøv at genindlæse siden...</a></li>');
  });
});


// Toogle asset images - zome in and out
$(function() {
  $('.asset-image').click(function(e) {
    if ($(this).parent('div').hasClass('col-md-6')) {
      $(this).parent('div').removeClass('col-md-6');
      $(this).parent('div').addClass('col-md-12');
      // Also for the div below
      $(this).parent('div').next('div').removeClass('col-md-6');
      $(this).parent('div').next('div').addClass('col-md-12');
    } else {
      $(this).parent('div').removeClass('col-md-12');
      $(this).parent('div').addClass('col-md-6');
      // Also for the div below
      $(this).parent('div').next('div').removeClass('col-md-12');
      $(this).parent('div').next('div').addClass('col-md-6');
    }
  });
});

// Scroll to top button
$(function() {
  $("#toTop").scrollToTop(400);
});


// Set main .container section min-height so footer does not jump
var documentHeight = $(document).height();
$('.container section').css('min-height', documentHeight - 140 -31 - 220 + 'px'); // document - header - heading - footer