@echo off
setlocal
chcp 65001 >nul

set "SCRIPT_DIR=%~dp0"
set "PS_SCRIPT=%SCRIPT_DIR%bootstrap-install.ps1"
set "RAW_URL=https://raw.githubusercontent.com/HCRXchenghong/infinitech/main/scripts/bootstrap-install.ps1"
set "TEMP_PS=%TEMP%\infinitech-bootstrap-install.ps1"

echo.
echo 正在准备 Windows 安装器...

if exist "%PS_SCRIPT%" (
  powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%" %*
  exit /b %ERRORLEVEL%
)

set "TOKEN=%GITHUB_TOKEN%"
if "%TOKEN%"=="" (
  set "TOKEN=%GITHUB_PAT%"
)

if not "%TOKEN%"=="" (
  powershell -ExecutionPolicy Bypass -Command "irm -Headers @{Authorization='token %TOKEN%'} '%RAW_URL%' -OutFile '%TEMP_PS%'"
) else (
  powershell -ExecutionPolicy Bypass -Command "irm '%RAW_URL%' -OutFile '%TEMP_PS%'"
)

if errorlevel 1 exit /b %ERRORLEVEL%

powershell -ExecutionPolicy Bypass -File "%TEMP_PS%" %*
