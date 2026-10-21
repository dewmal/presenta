#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "install:macos is only available on macOS." >&2
  exit 1
fi

app_name="Presenta.app"
source_app="src-tauri/target/release/bundle/macos/$app_name"
install_dir="/Applications"
installed_app="$install_dir/$app_name"

npm run tauri -- build --bundles app

if [ ! -d "$source_app" ]; then
  echo "Release bundle not found: $source_app" >&2
  exit 1
fi

echo "Installing Presenta to $installed_app (macOS may ask for administrator access)…"
osascript -e 'tell application "Presenta" to quit' >/dev/null 2>&1 || true
if [ -e "$installed_app" ]; then
  sudo rm -rf "$installed_app"
fi
sudo ditto "$source_app" "$installed_app"

version=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$installed_app/Contents/Info.plist")
echo "Installed Presenta $version at $installed_app"
