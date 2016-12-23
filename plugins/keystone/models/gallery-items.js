const keystone = require('keystone');
const Types = keystone.Field.Types;

const GalleryItem = new keystone.List('Gallery item', {
    autokey: { path: 'slug', from: 'title', unique: true },
    map: { name: 'title' },
    defaultSort: 'title'
});

GalleryItem.add({
    title: { type: String, required: true },
    description: { type: Types.Textarea },
    image: { type: Types.CloudinaryImage, autoCleanup : true },
    link: { type: Types.Url }
});

GalleryItem.defaultColumns = 'title'

module.exports = GalleryItem;
