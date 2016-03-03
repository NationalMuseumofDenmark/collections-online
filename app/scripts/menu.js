'use strict';

// Retrieve the main menu and its childern
$(function() {
  var $menu = $('.categories-menu .dropdown-menu-right');
  var slideDuration = 500;

  // Open / close main menu nav
  $('#heading-categories-menu, .gray-overlay').click(function() {
    $('body').toggleClass('categories-menu-open');
  });

  $.ajax({url: '/catalogs'}) // Append path to mark active
    .done(function(data) {
      $menu.html(data);

      // Expand menus
      $('.expand').on('click', function() {
        var $use = $(this).find('use');
        var $ul = $(this).closest('li').children('ul');
        if ($use.attr('xlink:href') === '#icon-plus') {
          $ul.slideDown(slideDuration, function() {
            $use.attr('xlink:href', '#icon-minus');
          });
        } else {
          $ul.slideUp(slideDuration, function() {
            $use.attr('xlink:href', '#icon-plus');
          });
        }
        return false;
      });
    })
    .fail(function() {
      var message =
        'Uups, der skete en fejl. Prøv at genindlæse siden.';
      $('.categories-menu .dropdown-menu-right').html(
        '<li><a href="' +
        window.location.pathname +
        '" class="col-xs-12">' + message + '</a></li>'
      );
    });
});
