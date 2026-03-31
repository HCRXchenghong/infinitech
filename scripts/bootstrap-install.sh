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

pick_target_dir() {
  if [[ -n "${TARGET_DIR:-}" ]]; then
    local default_dir="$TARGET_DIR"
    if [[ -t 0 ]]; then
      echo
      echo "请选择仓库安装目录："
      echo "  1. 使用默认目录: $default_dir"
      echo "  2. 输入自定义目录"
      read -r -p "输入数字选项 [1]: " mode
      case "${mode:-1}" in
        2)
          read -r -p "请输入安装目录路径: " custom_dir
          if [[ -n "${custom_dir// }" ]]; then
            TARGET_DIR="$custom_dir"
          fi
          ;;
        *)
          TARGET_DIR="$default_dir"
          ;;
      esac
    fi
  fi
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

require_sudo() {
  if [[ "$(id -u)" -eq 0 ]]; then
    echo ""
    return
  fi
  if ! command_exists sudo; then
    echo "当前缺少 sudo，无法安装缺失依赖。" >&2
    exit 1
  fi
  echo "sudo"
}

SUDO=$(require_sudo)

ensure_git() {
  if command_exists git; then
    return
  fi

  echo "未检测到 Git，正在优先安装 Git..."

  case "$(uname -s)" in
    Linux)
      if [[ ! -f /etc/os-release ]]; then
        echo "当前 Linux 发行版暂不支持自动安装 Git，请先手动安装后重试。" >&2
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
          echo "当前 Linux 发行版 ${ID:-unknown} 暂不支持自动安装 Git，请先手动安装后重试。" >&2
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
      echo "当前平台暂不支持 bootstrap bash 脚本，请先手动安装 Git 后重试。" >&2
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
    echo "检测到仓库已存在，正在从 GitHub 更新到最新代码..."
    git -C "$target_dir" remote set-url origin "$repo_url"
    git -C "$target_dir" fetch origin "$branch"
    git -C "$target_dir" checkout "$branch"
    git -C "$target_dir" pull --ff-only origin "$branch"
    return
  fi

  if [[ -e "$target_dir" && ! -d "$target_dir/.git" ]]; then
    echo "目标目录已存在，但不是 Git 仓库：$target_dir" >&2
    exit 1
  fi

  echo "正在从 GitHub 克隆仓库..."
  git clone --branch "$branch" --single-branch "$repo_url" "$target_dir"
}

main() {
  pick_target_dir
  ensure_git
  sync_repo "$REPO_URL" "$REPO_BRANCH" "$TARGET_DIR"

  cd "$TARGET_DIR"
  echo "仓库已准备完成：$TARGET_DIR"
  exec bash scripts/install-all.sh "${FORWARD_ARGS[@]}"
}

main "$@"
