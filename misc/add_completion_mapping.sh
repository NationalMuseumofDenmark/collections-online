curl -XPUT 'localhost:9200/assets/asset/_mapping' -d '{
  "asset" : {
    "properties" : {
      "suggest": {
        "type": "completion",
        "index_analyzer": "simple",
        "search_analyzer": "simple",
        "payloads": true
      }
    }
  }
}'
