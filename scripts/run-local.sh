#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${ENVIRONMENT:-local}"
SLO_PROFILE="${SLO_PROFILE:-checkout}"
SCENARIO="${SCENARIO:-load}"

mkdir -p reports

k6 run \
  -e ENVIRONMENT="${ENVIRONMENT}" \
  -e SLO_PROFILE="${SLO_PROFILE}" \
  -e SCENARIO="${SCENARIO}" \
  --summary-export "reports/${SLO_PROFILE}-summary.json" \
  tests/scenarios/load.test.js
