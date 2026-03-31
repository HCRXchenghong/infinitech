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
  Write-Host "Choose repository install directory:"
  Write-Host ("  1. Use default directory: {0}" -f $Current)
  Write-Host "  2. Enter a custom directory"
  $choice = Read-Host "Enter menu number [1]"
  switch (($choice | ForEach-Object { $_.Trim() })) {
    '2' {
      $custom = Read-Host "Enter install directory path"
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

  Write-Host "Git is missing. Installing Git first..."

  if (Test-Command winget) {
    & winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
    return
  }

  if (Test-Command choco) {
    & choco install git -y
    return
  }

  throw "Neither winget nor choco is available. Cannot auto-install Git."
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

  throw "Git is installed but not visible in the current session. Reopen the terminal and retry."
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
      Write-Host "Repository already exists. Updating latest code from GitHub..."
      & $GitExe -C $RepoDir remote set-url origin $RemoteUrl
      & $GitExe -C $RepoDir fetch origin $RemoteBranch
      & $GitExe -C $RepoDir checkout $RemoteBranch
      & $GitExe -C $RepoDir pull --ff-only origin $RemoteBranch
      return $RepoDir
    }

    if (Test-Path $RepoDir) {
      $item = Get-Item -LiteralPath $RepoDir
      if (-not $item.PSIsContainer) {
        throw "Target path already exists but is not a directory: $RepoDir"
      }

      $entries = @(Get-ChildItem -Force -LiteralPath $RepoDir)
      if ($entries.Count -eq 0) {
        Write-Host "Target directory exists and is empty. Cloning directly into it..."
        & $GitExe clone --branch $RemoteBranch --single-branch $RemoteUrl $RepoDir
        return $RepoDir
      }

      Write-Host ""
      Write-Host ("Target directory already exists and is not empty: {0}" -f $RepoDir)
      Write-Host "  1. Create subdirectory infinitech under this path"
      Write-Host "  2. Enter another install directory"
      Write-Host "  3. Cancel installation"
      $choice = Read-Host "Enter menu number [1]"
      switch (($choice | ForEach-Object { $_.Trim() })) {
        '2' {
          $custom = Read-Host "Enter a new install directory path"
          if ($custom -and $custom.Trim()) {
            $RepoDir = $custom.Trim()
            continue
          }
          continue
        }
        '3' {
          throw "Installation cancelled."
        }
        default {
          $RepoDir = Join-Path $RepoDir 'infinitech'
          continue
        }
      }
    }

    Write-Host "Cloning repository from GitHub..."
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
  throw "Installer entry was not found after clone: $installCmd"
}

Write-Host ("Repository is ready at: {0}" -f $TargetDir)
& $installCmd @ForwardArgs
