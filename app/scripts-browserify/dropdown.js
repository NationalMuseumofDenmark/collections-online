var hideAllDropdowns = function(e) {
  var $target = $(e.target);
  var $dropdown = $target.closest('.dropdown');
  var isInputInDropdown = $target.is('input') || $dropdown.size() > 0;
  if (isInputInDropdown === false) {
    $('.dropdown').removeClass('dropdown--active');
    $('body').off('click', hideAllDropdowns);
  }
};

$('body').on('click', '.dropdown__selected', function() {
  var $this = $(this);
  var $dropdown = $this.closest('.dropdown');
  var wasActive = $dropdown.hasClass('dropdown--active');

  $('.dropdown').removeClass('dropdown--active');

  if (wasActive === true) {
    return;
  }

  $('body').off('click', hideAllDropdowns);

  $dropdown.addClass('dropdown--active');

  // Clicking an option in a dropdown makes it deactivate
  $dropdown.on('click', '.dropdown__options a', function() {
    $dropdown.removeClass('dropdown--active');
  })

  setTimeout(function() {
    $('body').on('click', hideAllDropdowns);
  }, 1);

});

// Check that dropdown options are on screen
var repositionDropdowns = function() {
  $('.dropdown__options').each(function() {
    var dropOffLeft = $(this).offset().left;
    var dropdownWidth = $(this).width();
    var wrapWidth = $('.main-wrapper').width();
    var isEntirelyVisible = (dropOffLeft + dropdownWidth <=
      wrapWidth);
    if (!isEntirelyVisible) {
      var topOffset = $(this).offset().top;
      var paddingLeft = $(this).position().left;
      var newLeftOffset = wrapWidth - dropdownWidth + paddingLeft /
        2;
      $(this).offset({
        top: topOffset,
        left: newLeftOffset
      });
    }
  });
};

repositionDropdowns();
