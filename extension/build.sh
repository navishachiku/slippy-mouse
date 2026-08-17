#!/bin/sh
# Generate the MV3 extension from the userscript (single source of truth)
# and package it for store submission.
set -e
cd "$(dirname "$0")"

# content.js = userscript minus the Tampermonkey metadata block
sed '1,/==\/UserScript==/d' ../SlippyMouse.user.js | sed '/./,$!d' > content.js

VERSION=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' manifest.json | head -1)
rm -f "../dist/slippy-mouse-$VERSION.zip"
mkdir -p ../dist
zip -q -r "../dist/slippy-mouse-$VERSION.zip" manifest.json content.js icons
echo "Packaged dist/slippy-mouse-$VERSION.zip"
