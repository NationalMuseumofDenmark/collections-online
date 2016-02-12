var config = require('./config/config.js');
var Q = require('q');

var querystring = require('querystring');

function determine_player(asset) {
    var format = (asset.file_format || '').toLowerCase();
    if(format === 'gif image') {
        return "image-single-animated";
    } else if(format === 'mp3 format') {
        return "audio";
    } else if(format.indexOf('video') !== -1) {
        return "video";
    } else {
        var inRotationCategory = asset.categories.some(function(category) {
            return category.name === config.cip_rotation_category_name;
        });
        if(inRotationCategory) {
            return "image-rotation";
        } else {
            // If the asset has no significant category, let's use the
            // image-single player.
            return "image-single";
        }
    }
}

exports.determine_player = determine_player;

function rotary_image_comparison(asset_a, asset_b) {
    var filename_a = asset_a.filename;
    var filename_b = asset_b.filename;
    return filename_a.localeCompare(filename_b);
}

function generate_rotation_sources(req, metadata) {
    var deferred = Q.defer();

    var rotary_assets = [];

    for(var a in metadata.related_sub_assets) {
        var related_asset = metadata.related_sub_assets[a];
        if(related_asset.relation === '9ed0887f-40e8-4091-a91c-de356c869251') {
            rotary_assets.push( related_asset );
        }
    }

    rotary_assets.push({
        id: metadata.id,
        filename: metadata.filename
    });

    rotary_assets.sort( rotary_image_comparison );

    var result = {
        small: [],
        large: []
    };

    for(var r in rotary_assets) {
        var asset_id = rotary_assets[r].id;
        if(asset_id) {
            var image_url = '/' + metadata.catalog + '/' + asset_id + '/image/';
            result.small.push(image_url+'1000');
            result.large.push(image_url+'3000');
        }
    }

    return result;
}

exports.generate_rotation_sources = generate_rotation_sources;

function generate_sources(req, player, url, metadata) {
    var filename = metadata.filename;

    var sources = {
        download: url + '/download/' + filename,
        image_set: [] // Default is no images.
    };

    if(player === 'image-single') {
        var item_title = metadata.short_title || 'Ingen titel';
        item_title = item_title.replace(/(\r\n|\n|\r)/gm, '');
        var dashed_title = item_title.replace(/ /gi, '-').replace('/' ,'-');
        var encoded_title = querystring.escape(dashed_title);

        sources.image = url + '/image/2000/';
        sources.image_set = {
            400: url + '/image/400',
            800: url + '/image/800',
            1200: url + '/image/1200',
            2000: url + '/image/2000',
            // Downloads
            download_400: url + '/download/400/' + encoded_title + '.jpg',
            download_800: url + '/download/800/' + encoded_title + '.jpg',
            download_1200: url + '/download/1200/' + encoded_title + '.jpg',
            download_2000: url + '/download/2000/' + encoded_title + '.jpg',
        };
    } else if(player === 'image-single-animated') {
        sources.image = url + '/download/' + filename;
    } else if(player === 'image-rotation') {
        var asset_id = metadata.asset_id;
        var catalog_alias = metadata.catalog;
        var rotation_sources = generate_rotation_sources(req, metadata);

        sources.image = url + '/image/2000/';
        sources.image_rotation_set = rotation_sources;
    } else if(player === 'audio') {
        sources.audio = sources.download;
    } else if(player === 'video') {
        sources.video = sources.download;
    }

    return sources;
}

exports.generate_sources = generate_sources;
