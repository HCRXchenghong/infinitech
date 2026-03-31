@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0bootstrap-install.ps1" %*
