'use strict';

// Retrieve the main menu and its childern
$(function() {
  var $menu = $('.categories-menu .dropdown-menu-right');

  // Open / close main menu nav
  $('#heading-categories-menu, .gray-overlay').click(function() {
    $('body').toggleClass('categories-menu-open');
    return false;
  });

  $.ajax({
      url: '/catalogs', // Append path to mark active
    })
    .done(function(data) {
      $menu.html(data);

      // Expand menus
      $('a.expand-menu').click(function(e) {
        e.preventDefault();
        var $toggleButton = $(e.currentTarget);
        var $use = $toggleButton.children().children();
        var $icon = $use.attr('xlink:href');
        // Show minus icon if plus and vice versa
        if ($icon === '#icon-plus') {
          $use.attr('xlink:href', '#icon-minus');
        } else {
          $use.attr('xlink:href', '#icon-plus');
        }
        $toggleButton.parent().next('ul').slideToggle(100, function() {
          // Update the icon on the toggle button
          var expanded = $(this).is(':visible');
          $toggleButton.closest('li').toggleClass('expanded',
            expanded);
        });
      });
    })
    .fail(function() {
      var message = 'Uups, der skete en fejl. Prøv at genindlæse siden...';
      $('.categories-menu .dropdown-menu-right').html(
        '<li><a href="' +
        window.location.pathname +
        '" class="col-xs-12">' + message + '</a></li>'
      );
    });
});

// Toogle asset images - zome in and out
$(function() {
  // We only want zooming on asset's primary images.
  $('.asset .zoomable').click(function() {
    var $thisRow = $(this).closest('.image-row');
    if ($thisRow.hasClass('col-md-6')) {
      $thisRow.removeClass('col-md-6').addClass('col-md-12');
      $thisRow.next('div').addClass('col-md-offset-3').removeClass('pull-right');
    } else {
      $thisRow.removeClass('col-md-12').addClass('col-md-6');
      $thisRow.next('div').removeClass('col-md-offset-3').addClass('pull-right');
    }
  });
});

// Scroll to top button
$(function() {
  $('#toTop').scrollToTop(400);
});
