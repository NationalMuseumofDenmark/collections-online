(function(t,d,$) {
  $(d).ready(function(t) {
    $('#heading-categories-menu a').click(function(e){
      $('body').toggleClass('categories-menu-open');
      return false;
    }); 
  });
})(this, document, jQuery);