[CmdletBinding()]
param(
  [string]$MirrorProfile = '',
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ForwardArgs
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..')

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Select-MirrorProfile {
  param([string]$Current)
  if ($Current) {
    return $Current.ToLowerInvariant()
  }

  Write-Host ""
  Write-Host "请选择镜像源："
  Write-Host "  1. 官方源（默认）"
  Write-Host "  2. 阿里云"
  Write-Host "  3. 腾讯云"
  Write-Host "  4. 华为云"
  Write-Host "  5. 清华 / goproxy.cn"
  $choice = Read-Host "输入数字选项 [1]"
  switch (($choice | ForEach-Object { $_.Trim() })) {
    '2' { return 'aliyun' }
    '3' { return 'tencent' }
    '4' { return 'huawei' }
    '5' { return 'tsinghua' }
    default { return 'official' }
  }
}

function Ensure-Node {
  if (Test-Command node) {
    return
  }

  Write-Host ""
  Write-Host "正在安装 Node.js LTS..."

  if (Test-Command winget) {
    & winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    return
  }

  if (Test-Command choco) {
    & choco install nodejs-lts -y
    return
  }

  throw "当前既没有 winget 也没有 choco，无法自动安装 Node.js。"
}

function Ensure-DockerDesktop {
  if (Test-Command docker) {
    return
  }

  Write-Host ""
  Write-Host "正在安装 Docker..."

  $os = Get-CimInstance Win32_OperatingSystem
  $isServer = $os.ProductType -ne 1

  if (-not $isServer) {
    if (Test-Command winget) {
      & winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
      return
    }
    if (Test-Command choco) {
      & choco install docker-desktop -y
      return
    }
    throw "当前既没有 winget 也没有 choco，无法自动安装 Docker Desktop。"
  }

  Write-Host "检测到 Windows Server，切换到 Docker Engine 安装路径..."

  if (Get-Command Install-WindowsFeature -ErrorAction SilentlyContinue) {
    Install-WindowsFeature -Name Containers | Out-Null
  } else {
    Enable-WindowsOptionalFeature -Online -FeatureName containers -All -NoRestart | Out-Null
  }

  Install-PackageProvider -Name NuGet -Force | Out-Null
  if (-not (Get-Module -ListAvailable -Name DockerMsftProvider)) {
    Install-Module -Name DockerMsftProvider -Repository PSGallery -Force | Out-Null
  }
  Install-Package -Name docker -ProviderName DockerMsftProvider -Force | Out-Null
  Start-Service docker -ErrorAction SilentlyContinue
  Set-Service docker -StartupType Automatic -ErrorAction SilentlyContinue
}

function Wait-ForDocker {
  $desktopPath = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  if (Test-Path $desktopPath) {
    Start-Process -FilePath $desktopPath -ErrorAction SilentlyContinue | Out-Null
  }

  for ($i = 0; $i -lt 45; $i++) {
    if (Test-Command docker) {
      try {
        & docker info | Out-Null
        return
      } catch {
        Start-Sleep -Seconds 2
      }
    } else {
      Start-Sleep -Seconds 2
    }
  }

  throw "Docker 已安装，但当前还未就绪。请启动 Docker Desktop / Docker Engine 后重试。"
}

function Get-NodeExecutable {
  if (Test-Command node) {
    return (Get-Command node).Source
  }

  $candidates = @(
    'C:\Program Files\nodejs\node.exe',
    'C:\Program Files (x86)\nodejs\node.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "Node.js 已安装，但当前终端会话还不可见。请重新打开终端后重试。"
}

$mirror = Select-MirrorProfile -Current $MirrorProfile
$computer = Get-ComputerInfo
$arch = (Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty AddressWidth)
Write-Host ("检测到系统：{0} / {1} 位" -f $computer.WindowsProductName, $arch)
Write-Host ("已选择镜像源：{0}" -f $mirror)

Ensure-Node
Ensure-DockerDesktop
Wait-ForDocker

$nodeExe = Get-NodeExecutable
$installArgs = @((Join-Path $ScriptDir 'install-all.mjs'), "--mirror-profile=$mirror") + $ForwardArgs
& $nodeExe @installArgs
