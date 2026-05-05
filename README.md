# k6 Performance Engineering Framework

This framework separates configuration, core framework concerns, business journeys, scenario execution, and CI policy enforcement.

## Structure

```text
k6-framework/
  config/
    env/                 # Environment-specific base URLs, auth, pacing, HTTP settings
    slo/                 # SLOs, SLIs, performance budgets, and scenario shapes
  core/
    authManager.js       # Token-based authentication
    configLoader.js      # JSON config loading and validation
    customMetrics.js     # Trend and Rate metrics used as SLIs
    httpClient.js        # Reusable HTTP wrapper with retry-ready behavior
    thresholdManager.js  # Dynamic threshold generation from SLO config
  tests/
    journeys/            # Business flows, reusable across scenario types
    scenarios/           # k6 scenario definitions and lifecycle hooks
  scripts/
  data/
  reports/
```

## Run Locally

Install k6 first:

- Windows: `winget install k6.k6` or `choco install k6`
- macOS: `brew install k6`
- Linux: use the official k6 package for your distribution

PowerShell:

```powershell
cd k6-framework
.\scripts\run-local.ps1
```

If your local execution policy blocks scripts, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\run-local.ps1
```

Command Prompt:

```bat
cd k6-framework
scripts\run-local.cmd
```

Bash:

```bash
cd k6-framework
chmod +x scripts/run-local.sh
./scripts/run-local.sh
```

Or run directly:

```bash
k6 run -e ENVIRONMENT=local -e SLO_PROFILE=checkout -e SCENARIO=load tests/scenarios/load.test.js
```

Threshold breaches fail the k6 process, which fails CI.

Use `SCENARIO=stress`, `SCENARIO=spike`, or `SCENARIO=soak` to reuse the same checkout journey with a different execution profile from `config/slo/checkout.json`.

Windows examples:

```powershell
$env:SCENARIO = "stress"
.\scripts\run-local.ps1
```

```bat
set SCENARIO=spike
scripts\run-local.cmd
```

## Scaling Pattern

Add a new journey under `tests/journeys`, add a new SLO file under `config/slo`, and add or reuse a scenario under `tests/scenarios`. This keeps 30+ scenarios manageable because policies live in config and common behavior lives in `core`.

## Future Integrations

The framework is ready for Prometheus/Grafana through k6 outputs, and for distributed execution through the k6 operator by mounting the same config, data, and tests into a runner pod.
