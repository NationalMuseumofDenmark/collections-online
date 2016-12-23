const keystone = require('keystone');
const Types = keystone.Field.Types;

const Gallery = new keystone.List('Gallery', {
    autokey: { path: 'slug', from: 'title', unique: true },
    map: { name: 'title' },
    defaultSort: 'order'
});

Gallery.add({
    title: { type: String, required: true },
    state: { type: Types.Select, options: 'draft, published', default: 'draft' },
    order: { type: Types.Number, format: false },
    items: { type: Types.Relationship, ref: 'Gallery item', many: true },
    description: { type: Types.Textarea }
});

Gallery.defaultColumns = 'title, state|20%, order|20%'

module.exports = Gallery;
