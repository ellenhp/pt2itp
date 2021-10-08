#!/bin/bash

set -eo pipefail

if [[ -z ${CIRCLE_TAG} ]]; then
  echo "ok - No tag, skipping release."
  exit
fi

echo "ok - Publishing release."

export NODE_PRE_GYP_GITHUB_TOKEN=$(./mbx-ci github writer token)
if [[ -z ${NODE_PRE_GYP_GITHUB_TOKEN} ]]; then
  echo "not ok - Unable to retrieve GitHub token."
  exit 1
fi

yarn package
bash ./scripts/upload_asset.sh
