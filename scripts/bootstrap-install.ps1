[CmdletBinding()]
param(
  [string]$RepoUrl = 'https://github.com/HCRXchenghong/infinitech.git',
  [string]$Branch = 'main',
  [string]$TargetDir = '',
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ForwardArgs
)

$ErrorActionPreference = 'Stop'

if (-not $TargetDir) {
  $TargetDir = Join-Path $HOME 'infinitech'
}

function Select-TargetDir {
  param([string]$Current)

  if (-not $Current) {
    return $Current
  }

  Write-Host ""
  Write-Host "请选择仓库安装目录："
  Write-Host ("  1. 使用默认目录：{0}" -f $Current)
  Write-Host "  2. 输入自定义目录"
  $choice = Read-Host "输入数字选项 [1]"
  switch (($choice | ForEach-Object { $_.Trim() })) {
    '2' {
      $custom = Read-Host "请输入安装目录路径"
      if ($custom -and $custom.Trim()) {
        return $custom.Trim()
      }
      return $Current
    }
    default {
      return $Current
    }
  }
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-Git {
  if (Test-Command git) {
    return
  }

  Write-Host "未检测到 Git，正在优先安装 Git..."

  if (Test-Command winget) {
    & winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
    return
  }

  if (Test-Command choco) {
    & choco install git -y
    return
  }

  throw "当前既没有 winget 也没有 choco，无法自动安装 Git。"
}

function Get-GitExecutable {
  if (Test-Command git) {
    return (Get-Command git).Source
  }

  $candidates = @(
    'C:\Program Files\Git\cmd\git.exe',
    'C:\Program Files\Git\bin\git.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  throw "Git 已安装，但当前终端会话还不可见。请重新打开终端后重试。"
}

function Sync-Repo {
  param(
    [string]$GitExe,
    [string]$RemoteUrl,
    [string]$RemoteBranch,
    [string]$RepoDir
  )

  while ($true) {
    $parentDir = Split-Path -Parent $RepoDir
    if ($parentDir -and -not (Test-Path $parentDir)) {
      New-Item -ItemType Directory -Force -Path $parentDir | Out-Null
    }

    if (Test-Path (Join-Path $RepoDir '.git')) {
      Write-Host "检测到仓库已存在，正在从 GitHub 更新到最新代码..."
      & $GitExe -C $RepoDir remote set-url origin $RemoteUrl
      & $GitExe -C $RepoDir fetch origin $RemoteBranch
      & $GitExe -C $RepoDir checkout $RemoteBranch
      & $GitExe -C $RepoDir pull --ff-only origin $RemoteBranch
      return $RepoDir
    }

    if (Test-Path $RepoDir) {
      $item = Get-Item -LiteralPath $RepoDir
      if (-not $item.PSIsContainer) {
        throw "目标路径已存在，但不是目录：$RepoDir"
      }

      $entries = @(Get-ChildItem -Force -LiteralPath $RepoDir)
      if ($entries.Count -eq 0) {
        Write-Host "检测到目标目录为空，正在直接克隆到该目录..."
        & $GitExe clone --branch $RemoteBranch --single-branch $RemoteUrl $RepoDir
        return $RepoDir
      }

      Write-Host ""
      Write-Host ("目标目录已存在且非空：{0}" -f $RepoDir)
      Write-Host "  1. 在该目录下创建子目录 infinitech"
      Write-Host "  2. 重新输入安装目录"
      Write-Host "  3. 取消安装"
      $choice = Read-Host "输入数字选项 [1]"
      switch (($choice | ForEach-Object { $_.Trim() })) {
        '2' {
          $custom = Read-Host "请输入新的安装目录路径"
          if ($custom -and $custom.Trim()) {
            $RepoDir = $custom.Trim()
            continue
          }
          continue
        }
        '3' {
          throw "安装已取消。"
        }
        default {
          $RepoDir = Join-Path $RepoDir 'infinitech'
          continue
        }
      }
    }

    Write-Host "正在从 GitHub 克隆仓库..."
    & $GitExe clone --branch $RemoteBranch --single-branch $RemoteUrl $RepoDir
    return $RepoDir
  }
}

$TargetDir = Select-TargetDir -Current $TargetDir

Ensure-Git
$gitExe = Get-GitExecutable
$TargetDir = Sync-Repo -GitExe $gitExe -RemoteUrl $RepoUrl -RemoteBranch $Branch -RepoDir $TargetDir

$installCmd = Join-Path $TargetDir 'scripts\install-all.cmd'
if (-not (Test-Path $installCmd)) {
  throw "克隆完成后未找到安装入口：$installCmd"
}

Write-Host ("仓库已准备完成：{0}" -f $TargetDir)
& $installCmd @ForwardArgs
