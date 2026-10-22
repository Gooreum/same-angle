#!/usr/bin/env bash
# Original implementation, MIT. FFmpeg is a local development dependency.
set -euo pipefail
cd "$(dirname "$0")/.."
command -v ffmpeg >/dev/null || { echo 'Install ffmpeg before making fake-camera fixtures.' >&2; exit 1; }
mkdir -p tests/fixtures
same='img/sample/wall-window.jpg'
other='img/sample/kitchen.jpg'
if [ ! -f "$same" ] || [ ! -f "$other" ]; then
  echo 'Generated wall-window.jpg and kitchen.jpg are required in img/sample.' >&2
  exit 1
fi
# Keep identical framing and frame rate across every fake camera stream.
base='scale=640:480:force_original_aspect_ratio=increase,crop=640:480,setsar=1'
ffmpeg -hide_banner -loglevel error -y -loop 1 -i "$same" -vf "$base" -t 5 -r 15 -pix_fmt yuv420p -f yuv4mpegpipe tests/fixtures/same.y4m
# Shift right by 64 pixels (10% of 640); the newly uncovered strip is black.
ffmpeg -hide_banner -loglevel error -y -loop 1 -i "$same" -vf "$base,pad=704:480:64:0:black,crop=640:480:0:0" -t 5 -r 15 -pix_fmt yuv420p -f yuv4mpegpipe tests/fixtures/shift.y4m
ffmpeg -hide_banner -loglevel error -y -loop 1 -i "$other" -vf "$base" -t 5 -r 15 -pix_fmt yuv420p -f yuv4mpegpipe tests/fixtures/other.y4m
printf 'Created same, shift (10%% right), and other fixtures: 640x480, 5 seconds, 15 fps.\n'
