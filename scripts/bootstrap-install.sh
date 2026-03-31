#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/HCRXchenghong/infinitech.git"
REPO_BRANCH="main"
TARGET_DIR="${HOME}/infinitech"
FORWARD_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-url=*)
      REPO_URL="${1#*=}"
      shift
      ;;
    --branch=*)
      REPO_BRANCH="${1#*=}"
      shift
      ;;
    --target-dir=*)
      TARGET_DIR="${1#*=}"
      shift
      ;;
    *)
      FORWARD_ARGS+=("$1")
      shift
      ;;
  esac
done

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    echo ""
    return
  fi
  if ! command_exists sudo; then
    echo "sudo is required to install missing dependencies." >&2
    exit 1
  fi
  echo "sudo"
}

SUDO=$(require_sudo)

ensure_git() {
  if command_exists git; then
    return
  fi

  echo "Git is missing. Installing Git first..."

  case "$(uname -s)" in
    Linux)
      if [[ ! -f /etc/os-release ]]; then
        echo "Unsupported Linux distribution. Install git manually and rerun." >&2
        exit 1
      fi
      # shellcheck disable=SC1091
      . /etc/os-release
      case "${ID:-}" in
        ubuntu|debian)
          if [[ -n "$SUDO" ]]; then
            $SUDO apt-get update
            $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y git
          else
            apt-get update
            DEBIAN_FRONTEND=noninteractive apt-get install -y git
          fi
          ;;
        *)
          echo "Unsupported Linux distribution: ${ID:-unknown}. Install git manually and rerun." >&2
          exit 1
          ;;
      esac
      ;;
    Darwin)
      if ! command_exists brew; then
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        if [[ -x /opt/homebrew/bin/brew ]]; then
          eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
      fi
      brew install git
      ;;
    *)
      echo "Unsupported platform for bootstrap script. Install git manually and rerun." >&2
      exit 1
      ;;
  esac
}

sync_repo() {
  local repo_url="$1"
  local branch="$2"
  local target_dir="$3"

  mkdir -p "$(dirname "$target_dir")"

  if [[ -d "$target_dir/.git" ]]; then
    echo "Repository already exists. Updating latest code from GitHub..."
    git -C "$target_dir" remote set-url origin "$repo_url"
    git -C "$target_dir" fetch origin "$branch"
    git -C "$target_dir" checkout "$branch"
    git -C "$target_dir" pull --ff-only origin "$branch"
    return
  fi

  if [[ -e "$target_dir" && ! -d "$target_dir/.git" ]]; then
    echo "Target directory exists but is not a git repository: $target_dir" >&2
    exit 1
  fi

  echo "Cloning repository from GitHub..."
  git clone --branch "$branch" --single-branch "$repo_url" "$target_dir"
}

main() {
  ensure_git
  sync_repo "$REPO_URL" "$REPO_BRANCH" "$TARGET_DIR"

  cd "$TARGET_DIR"
  echo "Repository is ready at: $TARGET_DIR"
  exec bash scripts/install-all.sh "${FORWARD_ARGS[@]}"
}

main "$@"
