var Q = require('q');
var keystone = require('keystone');

const MENUS = ['main', 'footer'];
var app;

function reload() {
  var MenuItem = keystone.list('Menu item');
  var menuItems = {};
  Q.all(MENUS.map((menu) => {
    return MenuItem.model.find({
      placement: menu
    })
    .populate('page')
    .sort('order')
    .exec(function(err, items) {
      menuItems[menu] = items.map((item) => {
        item.url = item.getUrl();
        return item;
      });
    });
  })).then(() => {
    app.set('menus', menuItems);
  });
}

module.exports = function(expressApp) {
  app = expressApp;
  reload();
};

module.exports.reload = reload;
module.exports.MENUS = MENUS;
