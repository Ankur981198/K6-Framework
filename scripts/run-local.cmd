@echo off
setlocal

if "%ENVIRONMENT%"=="" set "ENVIRONMENT=local"
if "%SLO_PROFILE%"=="" set "SLO_PROFILE=checkout"
if "%SCENARIO%"=="" set "SCENARIO=load"

pushd "%~dp0.."
if not exist "reports" mkdir "reports"

k6 run ^
  -e ENVIRONMENT=%ENVIRONMENT% ^
  -e SLO_PROFILE=%SLO_PROFILE% ^
  -e SCENARIO=%SCENARIO% ^
  --summary-export reports/%SLO_PROFILE%-summary.json ^
  tests/scenarios/load.test.js

set "K6_EXIT_CODE=%ERRORLEVEL%"
popd
exit /b %K6_EXIT_CODE%
