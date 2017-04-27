# Dependencies

To successfully deploy and run collections-online you need:

- **A customization** to customize, configure and deploy collections-online.
- **A digital asset management system** to store, edit and serve digital assets.
- **A search index** / document service to temporarily store and search for
  documents representing digital assets.
- **A document database** to store pages, galleries and menu items for the CMS.

## A customization

A folder to keep your configurations and potential customizations of the
collections-online templates, scripts and styling.

Read more about [customizations](./CUSTOMIZATIONS.md) and see [natmus-samlinger](https://github.com/NationalMuseumofDenmark/natmus-samlinger) or [kbh-billeder](https://github.com/CopenhagenCityArchives/kbh-billeder) as examples of such customizations.

## A digital assets management system (typically the Canto Cumulus DAMS)

This serves a couple of purposes:
- Persisting any media and metadata (from which a search index can be derived).
- Serve any media to visitors on demand.
- Giving editors/archivists a user interface to modify and curate media and
  metadata.

A DAMS would typically accessed through plugins of the type `image-controller`
or `indexing-engine`. But can also persist metadata through the
`geo-tag-controller` and `motif-tag-controller` plugins.

## A search index / document service (typically Elasticsearch)

The document service is used to store and enable searching in a volatile
representation of the entities from the DAMS.

Note: This external system needs to implement the Elasticsearch interface or
alternatively some wrapper needs to be implemented, as it is done for the
[natmus-api](https://github.com/NationalMuseumofDenmark/natmus-samlinger/blob/master/services/natmus-api.js).

## A document database (typically MongoDB)

This database is required only when the Keystone CMS feature is enabled, used to
store pages, menu items and curated galleries on the frontpage.
