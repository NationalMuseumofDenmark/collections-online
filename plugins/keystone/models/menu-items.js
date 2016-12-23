const keystone = require('keystone');
const Types = keystone.Field.Types;

const MENUS = require('../menus').MENUS;

const MenuItem = new keystone.List('Menu item', {
    map: { name: 'title' },
    defaultSort: 'placement,order,title'
});

MenuItem.add({
    title: { type: String, required: true },
    placement: { type: Types.Select, options: MENUS.join(', '), default: MENUS[0] },
    order: { type: Types.Number, format: false },
    page: { type: Types.Relationship, ref: 'Page' },
    link: { type: Types.Url }
});

MenuItem.schema.methods.getUrl = function() {
  if(this.page) {
    return '/' + this.page.slug;
  } else if(this.link) {
    return this.link;
  }
}

// When menu items are saved or removed, the menues are reloaded.
MenuItem.schema.post('save', function(doc) {
  require('../menus').reload();
});
MenuItem.schema.post('remove', function(doc) {
  require('../menus').reload();
});

MenuItem.defaultColumns = 'title, placement, order|20%'

module.exports = MenuItem;
