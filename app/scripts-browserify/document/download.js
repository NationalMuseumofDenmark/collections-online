/* global ga */
// Capture downloads as Google Analytics events

if (ga) {
  $('[data-content="asset-download"] .btn').on('click', e => {
    const size = $(e.target).data('size');
    // TODO: Get the id and catalog from another element
    const id = $('.document').data('id');
    const collection = $('.document').data('collection');
    const catalogIdSize = collection + '-' + id + '-' + size;
    ga('send', 'event', 'asset', 'download', catalogIdSize);
    console.log('send', 'event', 'asset', 'download', catalogIdSize);
  });
}
