#!/bin/bash
#
# Puts the site live on Cloudflare Pages.
#
#     bash ~/Desktop/Projects/portfolio/ship.sh
#
# To publish WITHOUT the music (see the note below about rights):
#
#     MUSIC=off bash ~/Desktop/Projects/portfolio/ship.sh
#
# No GitHub needed. Wrangler uploads the built folder straight to Cloudflare.
# The first run opens a browser once to log in.

set -e
cd "$(dirname "$0")"

PROJECT="armaanseth"

echo "==> Verifying the pinned scene sources"
npm run verify
echo

if [ "$MUSIC" = "off" ]; then
  echo "==> MUSIC=off: the audio will NOT be uploaded"
  rm -rf public/audio
  echo "    removed public/audio (restore it from the tarball if you change your mind)"
  echo
fi

echo "==> Building"
npm run build >/tmp/portfolio-build.log 2>&1 || {
  echo "BUILD FAILED. Nothing deployed. Last 30 lines:"; tail -30 /tmp/portfolio-build.log; exit 1;
}
grep -E 'dist/assets|dist/index' /tmp/portfolio-build.log || true
echo "    total: $(du -sh dist | cut -f1)"
echo

echo "==> Deploying to Cloudflare Pages"
echo "    Project: $PROJECT"
echo "    A browser window may open for login on the first run."
echo
npx --yes wrangler@latest pages deploy dist --project-name="$PROJECT" --commit-dirty=true

echo
echo "==================================================================="
echo " Live. Two things worth doing next:"
echo
echo " 1. THE POLL. It works right now, but its counts reset whenever"
echo "    Cloudflare recycles the worker. To make votes permanent:"
echo "      Workers & Pages -> KV -> Create namespace -> call it 'poll'"
echo "      Your Pages project -> Settings -> Functions -> KV bindings"
echo "      Variable name: POLL   Namespace: poll   Save, then redeploy."
echo
echo " 2. A REAL DOMAIN, if you ever want one. Pages project ->"
echo "    Custom domains. The free $PROJECT.pages.dev works forever."
echo "==================================================================="
