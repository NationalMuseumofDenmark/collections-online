'use strict';

const config = require('collections-online/lib/config');

const keystone = require('keystone');
const csrf = require('csurf');

module.exports = {
  type: 'cms',
  module: keystone,
  initialize: (app) => {
    if(!config.keystone) {
      throw new Error('Missing a keystone object in the configuration');
    }

    // Set up Keystone
    keystone.init(config.keystone.options);

    if(config.cloudinaryUrl) {
      keystone.set('wysiwyg cloudinary images', true);
      // Set up cloudinary
      keystone.set('cloudinary config', config.cloudinaryUrl);
      // Prefix all built-in tags with 'keystone_'
      keystone.set('cloudinary prefix', 'keystone');
      // Prefix each image public_id with [{prefix}]/{list.path}/{field.path}/
      keystone.set('cloudinary folders', true);
      // Force cloudinary to serve images over https
      keystone.set('cloudinary secure', true);
    }

    const models = require('./models');
    // Registering models
    Object.keys(models).forEach(modelClass => {
      let model = models[modelClass];
      model.register();
    });

    keystone.initExpressApp(app);

    // Keystone form validation
    app.use('/keystone', csrf());
    app.use('/keystone', function(req, res, next) {
      res.locals.csrftoken = req.csrfToken();
      return next();
    });

    // Register the keystone specific routes
    keystone.set('routes', require('./routes')(app));

    keystone.set('nav', config.keystone.nav);

    app.use('/keystone', keystone.Admin.Server.createStaticRouter(keystone));
    app.use('/keystone', keystone.Admin.Server.createDynamicRouter(keystone));

    keystone.openDatabaseConnection(function() {
      require('./menus')(app);
    });
  }
};
