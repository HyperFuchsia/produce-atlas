#!/bin/sh
# Assemble the single self-contained page: three.js, then the scene.
# The artifact host blocks every external request, so everything is inlined.
set -e
OUT=index.html
{
  sed -e '/@@THREE@@/,$d' src/shell.html
  echo '<script>'
  cat src/three.iife.js
  echo '</script>'
  echo '<script>'
  cat src/app.js
  echo '</script>'
  sed -n '/@@THREE@@/,$p' src/shell.html | tail -n +2
} > "$OUT"
echo "built $OUT  ($(wc -c < "$OUT") bytes)"
