#!/bin/bash

HOST='beta.samlinger.natmus.dk'
CATALOG='FHM'
ASSET_ID='25757'
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
N="100"
C="1"

#ab \
#  -n $N -c $C \
#  -w \
#  -T 'application/x-www-form-urlencoded; charset=UTF-8' \
#  -p $DIR/geotagging-test-coords \
#  http://$HOST/$CATALOG/$ASSET_ID/save-geotag \
#  > $DIR/geotagging-test-result-$N-$C.html

ab \
  -n $N -c $C \
  -T 'application/x-www-form-urlencoded; charset=UTF-8' \
  -p $DIR/geotagging-test-coords \
  http://$HOST/$CATALOG/$ASSET_ID/save-geotag \
  > $DIR/geotagging-result-$N-$C
