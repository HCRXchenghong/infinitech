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

function L {
  param([string]$Text)
  return [regex]::Unescape($Text)
}

function Select-TargetDir {
  param([string]$Current)

  if (-not $Current) {
    return $Current
  }

  Write-Host ''
  Write-Host (L '\u8bf7\u9009\u62e9\u4ed3\u5e93\u5b89\u88c5\u76ee\u5f55\uff1a')
  Write-Host ((L '  1. \u4f7f\u7528\u9ed8\u8ba4\u76ee\u5f55\uff1a{0}') -f $Current)
  Write-Host (L '  2. \u8f93\u5165\u81ea\u5b9a\u4e49\u76ee\u5f55')
  $choice = Read-Host (L '\u8f93\u5165\u6570\u5b57\u9009\u9879 [1]')
  switch (($choice | ForEach-Object { $_.Trim() })) {
    '2' {
      $custom = Read-Host (L '\u8bf7\u8f93\u5165\u5b89\u88c5\u76ee\u5f55\u8def\u5f84')
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

  Write-Host (L '\u672a\u68c0\u6d4b\u5230 Git\uff0c\u6b63\u5728\u5148\u5b89\u88c5 Git...')

  if (Test-Command winget) {
    & winget install -e --id Git.Git --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -eq 0) {
      return
    }
  }

  if (Test-Command choco) {
    & choco install git -y
    if ($LASTEXITCODE -eq 0) {
      return
    }
  }

  throw (L '\u5f53\u524d\u65e2\u6ca1\u6709 winget \u4e5f\u6ca1\u6709 choco\uff0c\u65e0\u6cd5\u81ea\u52a8\u5b89\u88c5 Git\u3002')
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

  throw (L 'Git \u5df2\u5b89\u88c5\uff0c\u4f46\u5f53\u524d\u7ec8\u7aef\u4f1a\u8bdd\u8fd8\u4e0d\u53ef\u89c1\u3002\u8bf7\u91cd\u65b0\u6253\u5f00\u7ec8\u7aef\u540e\u91cd\u8bd5\u3002')
}

function Invoke-ExternalToHost {
  param(
    [string]$FilePath,
    [string[]]$Arguments,
    [string]$ErrorMessage
  )

  & $FilePath @Arguments | Out-Host
  if ($LASTEXITCODE -ne 0) {
    if ($ErrorMessage) {
      throw $ErrorMessage
    }
    throw ((L '\u547d\u4ee4\u6267\u884c\u5931\u8d25\uff1a{0} {1}') -f $FilePath, ($Arguments -join ' '))
  }
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
      Write-Host (L '\u68c0\u6d4b\u5230\u4ed3\u5e93\u5df2\u5b58\u5728\uff0c\u6b63\u5728\u4ece GitHub \u66f4\u65b0\u6700\u65b0\u4ee3\u7801...')
      Invoke-ExternalToHost -FilePath $GitExe -Arguments @('-C', $RepoDir, 'remote', 'set-url', 'origin', $RemoteUrl) -ErrorMessage (L '\u66f4\u65b0 Git \u8fdc\u7a0b\u5730\u5740\u5931\u8d25\u3002')
      Invoke-ExternalToHost -FilePath $GitExe -Arguments @('-C', $RepoDir, 'fetch', 'origin', $RemoteBranch) -ErrorMessage (L '\u4ece GitHub \u6293\u53d6\u6700\u65b0\u4ee3\u7801\u5931\u8d25\u3002')
      Invoke-ExternalToHost -FilePath $GitExe -Arguments @('-C', $RepoDir, 'checkout', $RemoteBranch) -ErrorMessage (L '\u5207\u6362\u5230\u76ee\u6807\u5206\u652f\u5931\u8d25\u3002')
      Invoke-ExternalToHost -FilePath $GitExe -Arguments @('-C', $RepoDir, 'pull', '--ff-only', 'origin', $RemoteBranch) -ErrorMessage (L '\u540c\u6b65\u6700\u65b0\u4ee3\u7801\u5931\u8d25\u3002')
      return $RepoDir
    }

    if (Test-Path $RepoDir) {
      $item = Get-Item -LiteralPath $RepoDir
      if (-not $item.PSIsContainer) {
        throw ((L '\u76ee\u6807\u8def\u5f84\u5df2\u5b58\u5728\uff0c\u4f46\u4e0d\u662f\u76ee\u5f55\uff1a{0}') -f $RepoDir)
      }

      $entries = @(Get-ChildItem -Force -LiteralPath $RepoDir)
      if ($entries.Count -eq 0) {
        Write-Host (L '\u76ee\u6807\u76ee\u5f55\u5df2\u5b58\u5728\u4e14\u4e3a\u7a7a\uff0c\u6b63\u5728\u76f4\u63a5\u514b\u9686\u5230\u8be5\u76ee\u5f55...')
        Invoke-ExternalToHost -FilePath $GitExe -Arguments @('clone', '--branch', $RemoteBranch, '--single-branch', $RemoteUrl, $RepoDir) -ErrorMessage (L '\u514b\u9686\u4ed3\u5e93\u5931\u8d25\u3002')
        return $RepoDir
      }

      Write-Host ''
      Write-Host ((L '\u76ee\u6807\u76ee\u5f55\u5df2\u5b58\u5728\u4e14\u4e0d\u4e3a\u7a7a\uff1a{0}') -f $RepoDir)
      Write-Host (L '  1. \u5728\u8be5\u8def\u5f84\u4e0b\u521b\u5efa infinitech \u5b50\u76ee\u5f55')
      Write-Host (L '  2. \u91cd\u65b0\u8f93\u5165\u5b89\u88c5\u76ee\u5f55')
      Write-Host (L '  3. \u53d6\u6d88\u5b89\u88c5')
      $choice = Read-Host (L '\u8f93\u5165\u6570\u5b57\u9009\u9879 [1]')
      switch (($choice | ForEach-Object { $_.Trim() })) {
        '2' {
          $custom = Read-Host (L '\u8bf7\u8f93\u5165\u65b0\u7684\u5b89\u88c5\u76ee\u5f55\u8def\u5f84')
          if ($custom -and $custom.Trim()) {
            $RepoDir = $custom.Trim()
            continue
          }
          continue
        }
        '3' {
          throw (L '\u5df2\u53d6\u6d88\u5b89\u88c5\u3002')
        }
        default {
          $RepoDir = Join-Path $RepoDir 'infinitech'
          continue
        }
      }
    }

    Write-Host (L '\u6b63\u5728\u4ece GitHub \u514b\u9686\u4ed3\u5e93...')
    Invoke-ExternalToHost -FilePath $GitExe -Arguments @('clone', '--branch', $RemoteBranch, '--single-branch', $RemoteUrl, $RepoDir) -ErrorMessage (L '\u514b\u9686\u4ed3\u5e93\u5931\u8d25\u3002')
    return $RepoDir
  }
}

$TargetDir = Select-TargetDir -Current $TargetDir

Ensure-Git
$gitExe = Get-GitExecutable
$TargetDir = Sync-Repo -GitExe $gitExe -RemoteUrl $RepoUrl -RemoteBranch $Branch -RepoDir $TargetDir

$installCmd = Join-Path $TargetDir 'scripts\install-all.cmd'
if (-not (Test-Path $installCmd)) {
  throw ((L '\u514b\u9686\u5b8c\u6210\u540e\u672a\u627e\u5230\u5b89\u88c5\u5165\u53e3\uff1a{0}') -f $installCmd)
}

Write-Host ((L '\u4ed3\u5e93\u5df2\u51c6\u5907\u5b8c\u6210\uff1a{0}') -f $TargetDir)
& $installCmd @ForwardArgs
