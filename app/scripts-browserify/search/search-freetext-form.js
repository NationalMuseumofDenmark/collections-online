// Add and remove a class on the form when an input or button has control
const FOCUS_CLASS = 'search-freetext-form--focus';
const $inputOrButton = $('.search-freetext-form__input, .search-freetext-form__btn');

$inputOrButton.on('focus', function() {
  $(this).closest('.search-freetext-form')
    .addClass(FOCUS_CLASS);
});
$inputOrButton.on('blur', function() {
  $(this).closest('.search-freetext-form')
    .removeClass(FOCUS_CLASS);
});
