#!/bin/sh

set -eu

if [ "${CONFIGURATION:-}" != "Release" ]; then
  exit 0
fi

capacitor_config="${SRCROOT}/App/capacitor.config.json"
public_directory="${SRCROOT}/App/public"

if [ ! -f "${capacitor_config}" ]; then
  echo "error: Missing synced Capacitor configuration. Run npm run ios:build before archiving." >&2
  exit 1
fi

if /usr/bin/grep -Eq '"server"[[:space:]]*:' "${capacitor_config}"; then
  echo "error: Release builds must not contain Capacitor server.url. Run npm run ios:build to sync bundled assets." >&2
  exit 1
fi

if [ "${CAPACITOR_DEBUG:-false}" = "true" ]; then
  echo "error: CAPACITOR_DEBUG must be false for Release builds." >&2
  exit 1
fi

if [ ! -f "${public_directory}/index.html" ]; then
  echo "error: Missing bundled native frontend. Run npm run ios:build before archiving." >&2
  exit 1
fi

if /usr/bin/grep -RIEq 'https?://(localhost[.]?|127[.]0[.]0[.]1|10[.]|192[.]168[.]|172[.](1[6-9]|2[0-9]|3[01])[.]|[^/[:space:]]+[.]local[.]?)([:/]|$)' "${public_directory}"; then
  echo "error: Release web assets contain a local or private-network URL." >&2
  exit 1
fi
