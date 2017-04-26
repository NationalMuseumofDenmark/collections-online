# Features

Below is a list of the features that can be enabled or disabled per deployment:

- **watermarks**
  Will stream another image onto thumbnails as they are requested from the
  digital asset management system.
- **keystone**
  A simple CMS for editors to produce simple pages with guides and galleries
  as curations of content.
- **cookieConsent**
  Provides a simple popup to comply with the EU Cookie Law.
- **motifTagging**
  Let's visitors contribute additional information in the form of tags that
  describes what is depicted on the piece of content (typically an image).
- **geoTagging** Let's visitors contribute a coordinate associated with a
  piece of content. Positioning a marker on a map or by navigating street
  view to match the perspective depicted on an image.
- **users**
  Let's visitors creating a user profile, which helps prevent spam and
  provides an identity when interacting with the system.
- **lazyLoadExpandedAssets**
  Assets gets loaded in a higher resolution once the contents landing-page is
  loaded. *Deprecated: No deployment is actively using this, as it creates misses on the image cache on the Cumulus DAMS.*
- **sitewidePassword**
  Prevents the spread of the website before its launched, by asking the
  visitor to provide a site-wide password.
