[CmdletBinding()]
param(
  [string]$MirrorProfile = '',
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$ForwardArgs
)

$ErrorActionPreference = 'Stop'

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RepoRoot = Resolve-Path (Join-Path $ScriptDir '..')

function L {
  param([string]$Text)
  return [regex]::Unescape($Text)
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Get-DockerExecutable {
  if (Test-Command docker) {
    return (Get-Command docker).Source
  }

  $candidates = @(
    'C:\Program Files\Docker\Docker\resources\bin\docker.exe',
    'C:\Program Files\Docker\Docker\resources\docker.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Get-DockerDesktopPath {
  $candidates = @(
    'C:\Program Files\Docker\Docker\Docker Desktop.exe',
    'C:\Program Files\Docker\Docker Desktop.exe'
  )

  foreach ($candidate in $candidates) {
    if (Test-Path $candidate) {
      return $candidate
    }
  }

  return $null
}

function Test-DockerDesktopInstalled {
  return [bool](Get-DockerExecutable) -or [bool](Get-DockerDesktopPath)
}

function Select-MirrorProfile {
  param([string]$Current)
  if ($Current) {
    return $Current.ToLowerInvariant()
  }

  Write-Host ''
  Write-Host (L '\u8bf7\u9009\u62e9\u955c\u50cf\u6e90\uff1a')
  Write-Host (L '  1. \u5b98\u65b9\u6e90\uff08\u9ed8\u8ba4\uff09')
  Write-Host (L '  2. \u963f\u91cc\u4e91')
  Write-Host (L '  3. \u817e\u8baf\u4e91')
  Write-Host (L '  4. \u534e\u4e3a\u4e91')
  Write-Host (L '  5. \u6e05\u534e / goproxy.cn')
  $choice = Read-Host (L '\u8f93\u5165\u6570\u5b57\u9009\u9879 [1]')
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

  Write-Host ''
  Write-Host (L '\u6b63\u5728\u5b89\u88c5 Node.js LTS...')

  if (Test-Command winget) {
    & winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    if ($LASTEXITCODE -eq 0) {
      return
    }
  }

  if (Test-Command choco) {
    & choco install nodejs-lts -y
    if ($LASTEXITCODE -eq 0) {
      return
    }
  }

  throw (L '\u5f53\u524d\u65e2\u6ca1\u6709 winget \u4e5f\u6ca1\u6709 choco\uff0c\u65e0\u6cd5\u81ea\u52a8\u5b89\u88c5 Node.js\u3002')
}

function Ensure-DockerDesktop {
  if (Test-DockerDesktopInstalled) {
    return
  }

  Write-Host ''
  Write-Host (L '\u6b63\u5728\u5b89\u88c5 Docker...')

  $os = Get-CimInstance Win32_OperatingSystem
  $isServer = $os.ProductType -ne 1

  if (-not $isServer) {
    $wingetAvailable = Test-Command winget
    $chocoAvailable = Test-Command choco

    if ($wingetAvailable) {
      & winget install -e --id Docker.DockerDesktop --accept-source-agreements --accept-package-agreements
      if ($LASTEXITCODE -eq 0 -or (Test-DockerDesktopInstalled)) {
        return
      }
    }
    if ($chocoAvailable) {
      & choco install docker-desktop -y
      if ($LASTEXITCODE -eq 0 -or (Test-DockerDesktopInstalled)) {
        return
      }
    }

    Write-Host ''
    Write-Host (L '\u672a\u80fd\u5b8c\u5168\u81ea\u52a8\u5b89\u88c5 Docker Desktop\u3002')

    if (-not $wingetAvailable -and -not $chocoAvailable) {
      Write-Host (L '\u5f53\u524d\u672a\u68c0\u6d4b\u5230 winget \u6216 choco\uff0c\u65e0\u6cd5\u7ee7\u7eed\u81ea\u52a8\u4e0b\u8f7d Docker Desktop\u3002')
      Write-Host (L '\u4e0b\u4e00\u6b65\u8bf7\u5148\u624b\u52a8\u5b89\u88c5 Docker Desktop\uff1a')
      Write-Host 'https://docs.docker.com/desktop/setup/install/windows-install/'
      Write-Host (L '\u5b89\u88c5\u5b8c\u6210\u540e\uff0c\u91cd\u65b0\u6267\u884c scripts\install-all.cmd \u6216 scripts\install-all.ps1\u3002')
      throw (L '\u5f53\u524d\u65e2\u6ca1\u6709 winget \u4e5f\u6ca1\u6709 choco\uff0c\u65e0\u6cd5\u81ea\u52a8\u5b89\u88c5 Docker Desktop\u3002')
    }

    Write-Host (L '\u5982\u679c Docker Desktop \u5b9e\u9645\u5df2\u5b89\u88c5\uff0c\u8bf7\u5148\u624b\u52a8\u6253\u5f00\u5b83\u5b8c\u6210\u9996\u6b21\u521d\u59cb\u5316\uff0c\u7136\u540e\u91cd\u65b0\u6267\u884c\u5b89\u88c5\u811a\u672c\u3002')
    throw (L '\u65e0\u6cd5\u786e\u8ba4 Docker Desktop \u5df2\u53ef\u7528\uff0c\u8bf7\u5148\u5b8c\u6210 Docker Desktop \u5b89\u88c5\u6216\u542f\u52a8\u3002')
  }

  Write-Host (L '\u68c0\u6d4b\u5230 Windows Server\uff0c\u5207\u6362\u5230 Docker Engine \u5b89\u88c5\u8def\u5f84...')

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

function Start-DockerRuntime {
  $desktopPath = Get-DockerDesktopPath

  foreach ($serviceName in @('com.docker.service', 'docker')) {
    $service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
    if ($service) {
      if ($service.Status -ne 'Running') {
        Start-Service $serviceName -ErrorAction SilentlyContinue
      }
      Set-Service $serviceName -StartupType Automatic -ErrorAction SilentlyContinue
    }
  }

  if ($desktopPath) {
    Start-Process -FilePath $desktopPath -ErrorAction SilentlyContinue | Out-Null
  }
}

function Wait-ForDocker {
  $desktopPath = Get-DockerDesktopPath
  if ($desktopPath) {
    Write-Host (L '\u6b63\u5728\u5c1d\u8bd5\u542f\u52a8 Docker Desktop...')
  }

  for ($i = 0; $i -lt 90; $i++) {
    if (($i % 10) -eq 0) {
      Start-DockerRuntime
    }

    $dockerExe = Get-DockerExecutable
    if ($dockerExe) {
      try {
        & $dockerExe info | Out-Null
        return
      } catch {
        Start-Sleep -Seconds 2
      }
    } else {
      Start-Sleep -Seconds 2
    }
  }

  Write-Host ''
  Write-Host (L '\u811a\u672c\u5df2\u5c1d\u8bd5\u81ea\u52a8\u542f\u52a8 Docker Desktop / Docker Engine\uff0c\u4f46\u8fd8\u6ca1\u6709\u7b49\u5230 Docker \u5c31\u7eea\u3002')
  Write-Host (L '\u4e0b\u4e00\u6b65\u8bf7\u5148\u624b\u52a8\u786e\u8ba4\uff1a')
  Write-Host (L '  1. Docker Desktop \u5df2\u6253\u5f00')
  Write-Host (L '  2. \u9996\u6b21\u542f\u52a8\u65f6\u5df2\u7ecf\u63a5\u53d7 Docker \u534f\u8bae')
  Write-Host (L '  3. Docker Engine \u663e\u793a\u4e3a Running')
  Write-Host (L '  4. \u5982\u679c\u63d0\u793a WSL / \u865a\u62df\u5316\uff0c\u5148\u6309 Docker Desktop \u6307\u5f15\u5b8c\u6210\u521d\u59cb\u5316')
  Write-Host (L '\u786e\u8ba4\u5b8c\u6210\u540e\uff0c\u91cd\u65b0\u6267\u884c scripts\install-all.cmd \u6216 scripts\install-all.ps1\u3002')
  Write-Host 'https://docs.docker.com/desktop/setup/install/windows-install/'
  throw (L 'Docker \u5df2\u5b89\u88c5\uff0c\u4f46\u5f53\u524d\u8fd8\u672a\u5c31\u7eea\u3002')
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

  throw (L 'Node.js \u5df2\u5b89\u88c5\uff0c\u4f46\u5f53\u524d\u7ec8\u7aef\u4f1a\u8bdd\u8fd8\u4e0d\u53ef\u89c1\u3002\u8bf7\u91cd\u65b0\u6253\u5f00\u7ec8\u7aef\u540e\u91cd\u8bd5\u3002')
}

$mirror = Select-MirrorProfile -Current $MirrorProfile
$computer = Get-ComputerInfo
$arch = (Get-CimInstance Win32_Processor | Select-Object -First 1 -ExpandProperty AddressWidth)
Write-Host ((L '\u68c0\u6d4b\u5230\u7cfb\u7edf\uff1a{0} / {1} \u4f4d') -f $computer.WindowsProductName, $arch)
Write-Host ((L '\u5df2\u9009\u62e9\u955c\u50cf\u6e90\uff1a{0}') -f $mirror)

Ensure-Node
Ensure-DockerDesktop
Wait-ForDocker

$nodeExe = Get-NodeExecutable
$installArgs = @((Join-Path $ScriptDir 'install-all.mjs'), "--mirror-profile=$mirror") + $ForwardArgs
& $nodeExe @installArgs
