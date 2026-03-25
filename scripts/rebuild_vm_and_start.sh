#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
IOS_DIR="$ROOT_DIR/ios-user-app/悦享e食"
ANDROID_DIR="$ROOT_DIR/android-user-app"

IOS_DEVICE_NAME="${IOS_DEVICE_NAME:-iPhone 17 Pro}"
IOS_BUNDLE_ID="${IOS_BUNDLE_ID:-com.user.infinite.yuexiang}"

ANDROID_APP_ID="${ANDROID_APP_ID:-com.user.infinite}"
APK_OUTPUT_REL="${APK_OUTPUT_REL:-app/build/outputs/apk/debug/app-debug.apk}"
ANDROID_SERIAL="${ANDROID_SERIAL:-}"

RUN_ANDROID=1
RESET_IOS=1
BUILD_ANDROID=1

usage() {
  cat <<'EOF'
Usage: ./scripts/rebuild_vm_and_start.sh [options]

Options:
  --no-android            Skip Android APK build/install
  --no-reset-ios          Do not erase simulator before launch
  --skip-android-build    Install existing APK without rebuilding
  --ios-device NAME       iOS simulator device name (default: iPhone 17 Pro)
  --android-serial SERIAL Target Android device serial
  -h, --help              Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-android)
      RUN_ANDROID=0
      shift
      ;;
    --no-reset-ios)
      RESET_IOS=0
      shift
      ;;
    --skip-android-build)
      BUILD_ANDROID=0
      shift
      ;;
    --ios-device)
      IOS_DEVICE_NAME="${2:-}"
      shift 2
      ;;
    --android-serial)
      ANDROID_SERIAL="${2:-}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[error] Unknown option: $1"
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "[error] Missing command: $cmd"
    exit 1
  fi
}

resolve_ios_udid() {
  local line udid
  line="$(xcrun simctl list devices available | grep -E "^[[:space:]]*${IOS_DEVICE_NAME} \\(" | head -n 1 || true)"
  if [[ -z "$line" ]]; then
    line="$(xcrun simctl list devices available | grep -E "^[[:space:]]*iPhone .*\\(" | head -n 1 || true)"
  fi
  if [[ -z "$line" ]]; then
    echo ""
    return
  fi
  udid="$(echo "$line" | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')"
  echo "$udid"
}

ensure_android_adb() {
  local adb_path=""
  if [[ -x "$HOME/Library/Android/sdk/platform-tools/adb" ]]; then
    adb_path="$HOME/Library/Android/sdk/platform-tools/adb"
  elif command -v adb >/dev/null 2>&1; then
    adb_path="$(command -v adb)"
  fi
  echo "$adb_path"
}

echo "[step] 1/3 rebuild + start iOS simulator"
require_cmd xcrun
require_cmd xcodebuild
require_cmd open

IOS_UDID="$(resolve_ios_udid)"
if [[ -z "$IOS_UDID" ]]; then
  echo "[error] No available iOS simulator runtime found."
  exit 1
fi

if [[ "$RESET_IOS" == "1" ]]; then
  echo "[ios] Reset simulator $IOS_DEVICE_NAME ($IOS_UDID)"
  xcrun simctl shutdown "$IOS_UDID" >/dev/null 2>&1 || true
  xcrun simctl erase "$IOS_UDID"
fi

(
  cd "$IOS_DIR"
  AUTO_START_BACKEND=0 DEVICE_NAME="$IOS_DEVICE_NAME" BUNDLE_ID="$IOS_BUNDLE_ID" ./scripts/run_ios_sim.sh
)

if [[ "$RUN_ANDROID" == "1" ]]; then
  echo "[step] 2/3 build + install Android APK"
  ADB_BIN="$(ensure_android_adb)"
  if [[ -z "$ADB_BIN" ]]; then
    echo "[warn] adb not found, skip Android install"
  else
    if [[ "$BUILD_ANDROID" == "1" ]]; then
      (
        cd "$ANDROID_DIR"
        ./gradlew :app:assembleDebug
      )
    fi

    APK_PATH="$ANDROID_DIR/$APK_OUTPUT_REL"
    if [[ ! -f "$APK_PATH" ]]; then
      echo "[warn] APK not found at $APK_PATH, skip Android install"
    else
      if [[ -z "$ANDROID_SERIAL" ]]; then
        ANDROID_SERIAL="$("$ADB_BIN" devices | awk 'NR>1 && $2=="device" {print $1; exit}')"
      fi

      if [[ -z "$ANDROID_SERIAL" ]]; then
        echo "[warn] No connected Android device, skip install"
      else
        echo "[android] target serial: $ANDROID_SERIAL"
        "$ADB_BIN" -s "$ANDROID_SERIAL" uninstall "$ANDROID_APP_ID" >/dev/null 2>&1 || true
        "$ADB_BIN" -s "$ANDROID_SERIAL" install -r "$APK_PATH"
        "$ADB_BIN" -s "$ANDROID_SERIAL" push "$APK_PATH" /sdcard/Download/yuexiang-app-debug.apk >/dev/null
      fi
    fi
  fi
else
  echo "[step] 2/3 skip Android"
fi

echo "[step] 3/3 summary"
APK_PATH="$ANDROID_DIR/$APK_OUTPUT_REL"
echo "----------------------------------------"
echo "iOS device:        $IOS_DEVICE_NAME"
if [[ "$RUN_ANDROID" == "1" ]]; then
  echo "Android app id:    $ANDROID_APP_ID"
  echo "Android serial:    ${ANDROID_SERIAL:-auto-detected}"
  echo "APK path:          $APK_PATH"
  echo "APK pushed to:     /sdcard/Download/yuexiang-app-debug.apk (when device connected)"
fi
echo "----------------------------------------"
echo "[done] Rebuild and startup complete."
