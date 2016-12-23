var keystone = require('keystone');

module.exports = function (req, res, next) {
  var locals = res.locals;
  // locals.section is used to set the currently selected
  // item in the header navigation.
  locals.section = 'page'; // fix me

  locals.filters = {
    slug: req.params.slug,
  };

  locals.data = {
    page: []
  };
  locals.req = req;

  var q = keystone.list('Page').model.findOne({
    slug: locals.filters.slug,
  });

  q.exec(function (err, result) {
    if(result && !err) {
      locals.data.page = result;
      // Create a view and render
      var view = new keystone.View(req, res);
      // Render the view
      view.render('page');
    } else if(err) {
      err.status = 500;
      next(err);
    } else {
      next();
    }
  });
};
