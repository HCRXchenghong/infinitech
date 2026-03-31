@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0install-all.ps1" %*
