#!/bin/bash

set -eu

token="$NODE_PRE_GYP_GITHUB_TOKEN"
platform=$(uname)

# https://gist.github.com/stefanbuck/ce788fee19ab6eb0b4447a85fc99f447
GH_API="https://api.github.com"
owner="mapbox"
repo="pt2itp"
tag="$CIRCLE_TAG"
GH_REPO="$GH_API/repos/$owner/$repo"
GH_TAGS="$GH_REPO/releases/tags/$tag"
AUTH="Authorization: token $token"
file_path="build/stage/$tag/node-v83-${platform,,}-x64.tar.gz"

function generate_post_data()
{
  branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ $branch == 'HEAD' ]]; then
    branch=master
  fi
  cat <<EOF
{
  "tag_name": "${tag}",
  "target_commitish": "${branch}",
  "name": "${tag}",
  "body": "@mapbox/pt2itp ${tag}",
  "draft": false,
  "prerelease": false
}
EOF
}

curl -o /dev/null --silent --show-error -H "$AUTH" $GH_REPO || { echo "Error: Invalid repo, token or network issue!";  exit 1; }
response=$(curl -sH "$AUTH" $GH_TAGS)

if [[ ${response} =~ 'Not Found' ]]; then
  # release does not exist yet, create it
  curl --silent --show-error --data "$(generate_post_data)" -H "Authorization: token $token" "$GH_REPO/releases"
  # query again
  response=$(curl --silent --show-error -H "$AUTH" $GH_TAGS)
fi

eval $(echo "$response" | grep -m 1 "id.:" | grep -w id | tr : = | tr -cd '[[:alnum:]]=')
[ "${id:-}" ] || { echo "Error: Failed to get release id for tag: $tag"; echo "$response" | awk 'length($0)<100' >&2; exit 1; }

# Upload asset
echo "Uploading ${file_path}... "
# Construct url
GH_ASSET="https://uploads.github.com/repos/$owner/$repo/releases/$id/assets?name=$(basename $file_path)"
curl --show-error -vv --data-binary @"$file_path" -H "Authorization: token $token" -H "Content-Type: application/octet-stream" $GH_ASSET
