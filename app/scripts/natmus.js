'use strict';
/*global $ */
////////////////////////////////////////////////////
// JS file containing logic used a cross the site //
////////////////////////////////////////////////////

// Alter asset rows order
$('.asset .text-row').insertAfter('.asset .image-row');

// Open / close main menu nav
$(function() {
    $('#heading-categories-menu a, .gray-overlay').click(function(e) {
      // Show/hide scroll bars with delay due to css animations
      if ($('body').hasClass('categories-menu-open')) {
        $('.nicescroll-rails').hide();
      } else {
        $('.nicescroll-rails').delay(700).fadeIn(300);
      }

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
    var $menu = $('.categories-menu .dropdown-menu-right');
    $menu.html(data);
    
    $menu.niceScroll({
      cursorcolor:'#555',
      background: '',
      cursorwidth: '7px',
      cursorborder: 'none',
      autohidemode: false,
      horizrailenabled: false,
      zindex: 999999
    });

    // Expand menus
    $('.categories-menu ul a.expand-menu').click(function(e) {
      e.preventDefault();
      console.log(e);
      var $toggleButton = $(this);
      $toggleButton.next('ul').slideToggle(300, function() {
        // Update the scrollbar
        $menu.getNiceScroll().resize();
        // Update the icon on the toggle button
        var expanded = $(this).is(':visible');
        $toggleButton.closest('li').toggleClass('expanded', expanded);
      });

    });
  })
  .fail(function(data) {
    $('.categories-menu .dropdown-menu-right').html('<li><a href="' + window.location.pathname + '" class="col-xs-12">Uups, der skete en fejl. Prøv at genindlæse siden...</a></li>');
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


