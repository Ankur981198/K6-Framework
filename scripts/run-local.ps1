Param(
  [string]$Environment = $(if ($env:ENVIRONMENT) { $env:ENVIRONMENT } else { "local" }),
  [string]$SloProfile = $(if ($env:SLO_PROFILE) { $env:SLO_PROFILE } else { "checkout" }),
  [string]$Scenario = $(if ($env:SCENARIO) { $env:SCENARIO } else { "load" })
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $repoRoot

$reportsPath = Join-Path $repoRoot "reports"
if (-not (Test-Path $reportsPath)) {
  New-Item -ItemType Directory -Path $reportsPath | Out-Null
}

k6 run `
  -e "ENVIRONMENT=$Environment" `
  -e "SLO_PROFILE=$SloProfile" `
  -e "SCENARIO=$Scenario" `
  --summary-export "reports/$SloProfile-summary.json" `
  "tests/scenarios/load.test.js"

exit $LASTEXITCODE
