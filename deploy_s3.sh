#!/bin/bash

mkdir deploy
zip -r deploy/get-topic-subscription-arn.zip index.js index_impl.js snsApi.js node_modules/