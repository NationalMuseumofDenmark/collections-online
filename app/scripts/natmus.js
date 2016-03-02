'use strict';

// Retrieve the main menu and its childern
$(function() {
  var $menu = $('.categories-menu .dropdown-menu-right');

  // Open / close main menu nav
  $('#heading-categories-menu, .gray-overlay').click(function() {
    $('body').toggleClass('categories-menu-open');
  });

  $.ajax({
      url: '/catalogs', // Append path to mark active
    })
    .done(function(data) {
      $menu.html(data);

      // Expand menus
      $('a.expand-menu').click(function(e) {
        e.preventDefault();
        var $use = $(this).find('use');
        var $ul = $(this).closest('li').children('ul');
        if ($use.attr('xlink:href') === '#icon-plus'){
          $ul.slideDown(100);
          $use.attr('xlink:href', '#icon-minus');
        } else {
          $ul.slideUp(100);
          $use.attr('xlink:href', '#icon-plus');
        }
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
