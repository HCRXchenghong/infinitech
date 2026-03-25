#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
APP_NAME="${APP_NAME:-悦享e食}"
SCHEME="${SCHEME:-悦享e食}"
BUNDLE_ID="${BUNDLE_ID:-com.user.infinite.yuexiang}"
DEVICE_NAME="${DEVICE_NAME:-iPhone 16}"
DERIVED_DATA_PATH="${DERIVED_DATA_PATH:-$ROOT_DIR/.derivedData}"
APP_PATH="$DERIVED_DATA_PATH/Build/Products/Debug-iphonesimulator/${APP_NAME}.app"
AUTO_START_BACKEND="${AUTO_START_BACKEND:-1}"

if [[ "$AUTO_START_BACKEND" == "1" ]]; then
  echo "[iOS] Step 0/4: Ensure local backend is running"
  "$ROOT_DIR/scripts/start_local_backend.sh"
fi

echo "[iOS] Step 1/4: Build app"
SCHEME="$SCHEME" DERIVED_DATA_PATH="$DERIVED_DATA_PATH" "$ROOT_DIR/scripts/build_ios_sim.sh"

if [[ ! -d "$APP_PATH" ]]; then
  echo "[iOS] ERROR: App bundle not found at:"
  echo "       $APP_PATH"
  exit 1
fi

echo "[iOS] Step 2/4: Resolve simulator device"
DEVICE_LINE="$(xcrun simctl list devices available | grep -E "^[[:space:]]*${DEVICE_NAME} \\(" | head -n 1 || true)"
if [[ -z "$DEVICE_LINE" ]]; then
  DEVICE_LINE="$(xcrun simctl list devices available | grep -E "^[[:space:]]*iPhone .*\\(" | head -n 1 || true)"
fi

if [[ -z "$DEVICE_LINE" ]]; then
  echo "[iOS] ERROR: No available iPhone simulator found."
  echo "       Open Xcode -> Settings -> Platforms and install an iOS Simulator runtime."
  exit 1
fi

UDID="$(echo "$DEVICE_LINE" | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')"
if [[ -z "$UDID" ]]; then
  echo "[iOS] ERROR: Failed to parse simulator UDID."
  echo "       line: $DEVICE_LINE"
  exit 1
fi

echo "[iOS] Using simulator: $DEVICE_LINE"

echo "[iOS] Step 3/4: Boot simulator and install app"
xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
xcrun simctl bootstatus "$UDID" -b
open -a Simulator --args -CurrentDeviceUDID "$UDID" >/dev/null 2>&1 || true

xcrun simctl uninstall "$UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
xcrun simctl install "$UDID" "$APP_PATH"

echo "[iOS] Step 4/4: Launch app"
xcrun simctl launch "$UDID" "$BUNDLE_ID" || {
  echo "[iOS] ERROR: Launch failed. Check BUNDLE_ID: $BUNDLE_ID"
  exit 1
}

echo "[iOS] App is now running in Simulator."
