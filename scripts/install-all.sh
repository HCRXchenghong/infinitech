#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)

MIRROR_PROFILE=""
FORWARD_ARGS=()

while [[ $# -gt 0 ]]; do
  case "$1" in
    --mirror-profile=*)
      MIRROR_PROFILE="${1#*=}"
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
    echo "需要 sudo 才能安装系统依赖，但当前系统未安装 sudo。" >&2
    exit 1
  fi
  echo "sudo"
}

SUDO=$(require_sudo)

pick_mirror_profile() {
  if [[ -n "$MIRROR_PROFILE" ]]; then
    return
  fi

  echo
  echo "请选择镜像源："
  echo "  1. 官方源（默认）"
  echo "  2. 阿里云镜像"
  echo "  3. 腾讯云镜像"
  echo "  4. 华为云镜像"
  echo "  5. 清华 / goproxy.cn 组合镜像"
  read -r -p "输入数字选项 [1]: " choice
  case "${choice:-1}" in
    2) MIRROR_PROFILE="aliyun" ;;
    3) MIRROR_PROFILE="tencent" ;;
    4) MIRROR_PROFILE="huawei" ;;
    5) MIRROR_PROFILE="tsinghua" ;;
    *) MIRROR_PROFILE="official" ;;
  esac
}

backup_apt_sources() {
  local backup_dir="/etc/apt/infinite-backup"
  if [[ -n "$SUDO" ]]; then
    $SUDO mkdir -p "$backup_dir"
  else
    mkdir -p "$backup_dir"
  fi

  local file
  for file in /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do
    [[ -f "$file" ]] || continue
    local target="$backup_dir/$(basename "$file")"
    if [[ ! -f "$target" ]]; then
      if [[ -n "$SUDO" ]]; then
        $SUDO cp "$file" "$target"
      else
        cp "$file" "$target"
      fi
    fi
  done
}

replace_in_sources() {
  local search="$1"
  local replace="$2"
  local file
  for file in /etc/apt/sources.list /etc/apt/sources.list.d/*.list /etc/apt/sources.list.d/*.sources; do
    [[ -f "$file" ]] || continue
    if [[ -n "$SUDO" ]]; then
      $SUDO sed -i "s|$search|$replace|g" "$file"
    else
      sed -i "s|$search|$replace|g" "$file"
    fi
  done
}

configure_apt_mirror() {
  local distro="$1"
  local profile="$2"
  if [[ "$profile" == "official" ]]; then
    return
  fi

  backup_apt_sources

  local ubuntu_mirror=""
  local debian_main_mirror=""
  local debian_security_mirror=""

  case "$profile" in
    aliyun)
      ubuntu_mirror="https://mirrors.aliyun.com/ubuntu/"
      debian_main_mirror="https://mirrors.aliyun.com/debian/"
      debian_security_mirror="https://mirrors.aliyun.com/debian-security/"
      ;;
    tencent)
      ubuntu_mirror="https://mirrors.cloud.tencent.com/ubuntu/"
      debian_main_mirror="https://mirrors.cloud.tencent.com/debian/"
      debian_security_mirror="https://mirrors.cloud.tencent.com/debian-security/"
      ;;
    huawei)
      ubuntu_mirror="https://repo.huaweicloud.com/ubuntu/"
      debian_main_mirror="https://repo.huaweicloud.com/debian/"
      debian_security_mirror="https://repo.huaweicloud.com/debian-security/"
      ;;
    tsinghua)
      ubuntu_mirror="https://mirrors.tuna.tsinghua.edu.cn/ubuntu/"
      debian_main_mirror="https://mirrors.tuna.tsinghua.edu.cn/debian/"
      debian_security_mirror="https://mirrors.tuna.tsinghua.edu.cn/debian-security/"
      ;;
  esac

  if [[ "$distro" == "ubuntu" ]]; then
    replace_in_sources "http://archive.ubuntu.com/ubuntu/" "$ubuntu_mirror"
    replace_in_sources "https://archive.ubuntu.com/ubuntu/" "$ubuntu_mirror"
    replace_in_sources "http://security.ubuntu.com/ubuntu/" "$ubuntu_mirror"
    replace_in_sources "https://security.ubuntu.com/ubuntu/" "$ubuntu_mirror"
  elif [[ "$distro" == "debian" ]]; then
    replace_in_sources "http://deb.debian.org/debian/" "$debian_main_mirror"
    replace_in_sources "https://deb.debian.org/debian/" "$debian_main_mirror"
    replace_in_sources "http://security.debian.org/debian-security/" "$debian_security_mirror"
    replace_in_sources "https://security.debian.org/debian-security/" "$debian_security_mirror"
  fi
}

ensure_apt_packages() {
  echo
  echo "正在安装 Ubuntu / Debian 依赖..."
  if [[ -n "$SUDO" ]]; then
    $SUDO apt-get update
    $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y \
      bash ca-certificates curl gnupg lsb-release software-properties-common git nodejs npm docker.io golang-go
    $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-plugin || true
    $SUDO DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose || true
    $SUDO systemctl enable --now docker || true
    $SUDO usermod -aG docker "$USER" || true
  else
    apt-get update
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
      bash ca-certificates curl gnupg lsb-release software-properties-common git nodejs npm docker.io golang-go
    DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose-plugin || true
    DEBIAN_FRONTEND=noninteractive apt-get install -y docker-compose || true
    systemctl enable --now docker || true
  fi
}

ensure_macos_dependencies() {
  echo
  echo "正在安装 macOS 依赖..."
  if ! command_exists brew; then
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [[ -x /opt/homebrew/bin/brew ]]; then
      eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
  fi

  brew update
  brew install node
  brew install go
  brew install --cask docker

  if [[ -d /Applications/Docker.app ]]; then
    open -a Docker || true
  fi
}

wait_for_docker() {
  local attempts=0
  until docker info >/dev/null 2>&1 || [[ -n "$SUDO" ]] && $SUDO docker info >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if [[ "$attempts" -ge 30 ]]; then
      echo "Docker 还未就绪，请确认 Docker 服务 / Docker Desktop 已启动后重试。" >&2
      return 1
    fi
    sleep 2
  done
}

main() {
  local uname_s
  uname_s=$(uname -s)
  local arch
  arch=$(uname -m)

  pick_mirror_profile

  echo "检测到系统：$uname_s $arch"
  echo "选择的镜像源：$MIRROR_PROFILE"

  case "$uname_s" in
    Linux)
      if [[ ! -f /etc/os-release ]]; then
        echo "无法识别 Linux 发行版，当前只自动支持 Ubuntu / Debian。" >&2
        exit 1
      fi
      # shellcheck disable=SC1091
      . /etc/os-release
      local distro="${ID:-}"
      if [[ "$distro" != "ubuntu" && "$distro" != "debian" ]]; then
        echo "当前 Linux 发行版是 $distro，自动安装目前仅支持 Ubuntu / Debian。" >&2
        exit 1
      fi
      configure_apt_mirror "$distro" "$MIRROR_PROFILE"
      ensure_apt_packages
      ;;
    Darwin)
      if [[ "$arch" != "arm64" ]]; then
        echo "当前 macOS 架构是 $arch。脚本优先支持 Apple Silicon（arm64），其余架构按 best-effort 继续。" >&2
      fi
      ensure_macos_dependencies
      ;;
    *)
      echo "当前系统 $uname_s 不支持 bash 安装器，请改用 Windows 安装入口 scripts\\install-all.cmd 或对应平台脚本。" >&2
      exit 1
      ;;
  esac

  if ! command_exists node; then
    echo "Node.js 安装后当前 shell 仍不可用，请重新打开终端后重试。" >&2
    exit 1
  fi
  if ! command_exists go; then
    echo "Go 安装后当前 shell 仍不可用，请重新打开终端后重试。" >&2
    exit 1
  fi

  wait_for_docker || true

  exec node "$SCRIPT_DIR/install-all.mjs" "--mirror-profile=$MIRROR_PROFILE" "${FORWARD_ARGS[@]}"
}

main "$@"
