/**
 * This file contains the common middleware used by your routes.
 *
 * Extend or replace these functions as your application requires.
 *
 * This structure is not enforced, and just a starting point. If
 * you have more middleware you may want to group it as separate
 * modules in your project's /lib directory.
 */

/**
	Initialises the standard view locals

	The included layout depends on the navLinks array to generate
	the navigation in the header, you may wish to change this array
	or replace it with your own templates / logic.
*/
exports.initLocals = (req, res, next) => {
  res.locals.menus = req.app.get('menus');
  next();
};

exports.error404 = (req, res, next) => {
  next();
};

exports.error500 = (err, req, res, next) => {
  next(err);
};

/**
	Prevents people from accessing protected pages when they're not signed in
 */
exports.requireUser = (req, res, next) => {
  if (!req.user) {
    req.flash('error', 'Please sign in to access this page.');
    res.redirect('/keystone/signin');
  } else {
    next();
  }
};
