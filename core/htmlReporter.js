/**
 * Lightweight HTML summary reporter for k6 handleSummary().
 *
 * This keeps reporting self-contained in the starter framework instead of
 * depending on a remote import during CI execution.
 */

export function htmlReport(data, metadata = {}) {
  const metrics = data.metrics || {};
  const rootGroup = data.root_group || {};
  const thresholds = collectThresholds(metrics);
  const checks = collectChecks(rootGroup);
  const summaryRows = [
    metricRow('HTTP request duration', metrics.http_req_duration, 'ms'),
    metricRow('Checkout transaction duration', metrics.checkout_transaction_duration, 'ms'),
    metricRow('Business transaction duration', metrics.business_transaction_duration, 'ms'),
    metricRow('HTTP request failed rate', metrics.http_req_failed, 'rate'),
    metricRow('Custom error rate', metrics.error_rate, 'rate'),
    metricRow('Retry rate', metrics.retry_rate, 'rate'),
    metricRow('Checks', metrics.checks, 'rate'),
    metricRow('Iterations', metrics.iterations, 'count'),
  ].filter(Boolean);

  const generatedAt = new Date().toISOString();
  const title = `${metadata.service || 'k6'} performance summary`;
  const passCount = thresholds.filter((threshold) => threshold.ok).length;
  const failCount = thresholds.filter((threshold) => !threshold.ok).length;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --panel: #ffffff;
      --text: #1f2933;
      --muted: #6b7280;
      --border: #d9dee7;
      --pass: #0f766e;
      --fail: #b42318;
      --accent: #1d4ed8;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font: 14px/1.5 Arial, Helvetica, sans-serif;
    }
    main {
      width: min(1180px, calc(100% - 32px));
      margin: 32px auto;
    }
    header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
      margin-bottom: 24px;
    }
    h1 {
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.2;
    }
    h2 {
      margin: 0 0 14px;
      font-size: 18px;
    }
    .meta {
      color: var(--muted);
      margin: 0;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }
    .stat, section {
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .stat strong {
      display: block;
      font-size: 24px;
      line-height: 1.2;
    }
    .stat span {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    section {
      margin-bottom: 20px;
      overflow-x: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      min-width: 760px;
    }
    th, td {
      border-bottom: 1px solid var(--border);
      padding: 10px 8px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: var(--muted);
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    tr:last-child td {
      border-bottom: 0;
    }
    .badge {
      display: inline-block;
      border-radius: 999px;
      padding: 2px 8px;
      font-size: 12px;
      font-weight: 700;
    }
    .pass {
      background: #ccfbf1;
      color: var(--pass);
    }
    .fail {
      background: #fee4e2;
      color: var(--fail);
    }
    .mono {
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      font-size: 12px;
    }
    @media (max-width: 760px) {
      header { display: block; }
      .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      main { width: min(100% - 20px, 1180px); margin: 20px auto; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>${escapeHtml(title)}</h1>
        <p class="meta">Generated ${escapeHtml(generatedAt)}</p>
      </div>
      <p class="meta">
        Environment: ${escapeHtml(metadata.environment || 'unknown')}<br>
        Scenario: ${escapeHtml(metadata.scenario || 'unknown')}<br>
        Run ID: ${escapeHtml(metadata.runId || 'unknown')}
      </p>
    </header>

    <div class="grid">
      <div class="stat"><strong>${passCount}</strong><span>Thresholds passed</span></div>
      <div class="stat"><strong>${failCount}</strong><span>Thresholds failed</span></div>
      <div class="stat"><strong>${formatMetricValue(metrics.iterations, 'count')}</strong><span>Iterations</span></div>
      <div class="stat"><strong>${formatMetricValue(metrics.http_reqs, 'count')}</strong><span>HTTP requests</span></div>
    </div>

    <section>
      <h2>Key Metrics</h2>
      <table>
        <thead>
          <tr><th>Metric</th><th>Avg</th><th>P95</th><th>P99</th><th>Rate</th><th>Count</th></tr>
        </thead>
        <tbody>
          ${summaryRows.map(renderMetricRow).join('')}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Thresholds</h2>
      <table>
        <thead>
          <tr><th>Status</th><th>Metric</th><th>Threshold</th></tr>
        </thead>
        <tbody>
          ${thresholds.length ? thresholds.map(renderThresholdRow).join('') : '<tr><td colspan="3">No thresholds found.</td></tr>'}
        </tbody>
      </table>
    </section>

    <section>
      <h2>Checks</h2>
      <table>
        <thead>
          <tr><th>Status</th><th>Check</th><th>Passes</th><th>Fails</th></tr>
        </thead>
        <tbody>
          ${checks.length ? checks.map(renderCheckRow).join('') : '<tr><td colspan="4">No checks found.</td></tr>'}
        </tbody>
      </table>
    </section>
  </main>
</body>
</html>`;
}

export function textSummary(data, metadata = {}) {
  const metrics = data.metrics || {};
  const thresholds = collectThresholds(metrics);
  const failedThresholds = thresholds.filter((threshold) => !threshold.ok);

  return [
    '',
    'k6 performance summary',
    `Service: ${metadata.service || 'unknown'}`,
    `Environment: ${metadata.environment || 'unknown'}`,
    `Scenario: ${metadata.scenario || 'unknown'}`,
    `Run ID: ${metadata.runId || 'unknown'}`,
    `Iterations: ${formatMetricValue(metrics.iterations, 'count')}`,
    `HTTP requests: ${formatMetricValue(metrics.http_reqs, 'count')}`,
    `HTTP P95: ${valueFor(metrics.http_req_duration || {}, 'p(95)', 'ms') || 'n/a'} ms`,
    `HTTP P99: ${valueFor(metrics.http_req_duration || {}, 'p(99)', 'ms') || 'n/a'} ms`,
    `Thresholds passed: ${thresholds.length - failedThresholds.length}`,
    `Thresholds failed: ${failedThresholds.length}`,
    '',
  ].join('\n');
}

function collectThresholds(metrics) {
  return Object.entries(metrics).flatMap(([metricName, metric]) => {
    const thresholds = metric.thresholds || {};

    return Object.entries(thresholds).map(([expression, result]) => ({
      metricName,
      expression,
      ok: Boolean(result.ok),
    }));
  });
}

function collectChecks(group) {
  const checks = [];

  walkGroups(group, (currentGroup) => {
    (currentGroup.checks || []).forEach((check) => {
      checks.push({
        name: check.name,
        passes: check.passes || 0,
        fails: check.fails || 0,
        ok: (check.fails || 0) === 0,
      });
    });
  });

  return checks;
}

function walkGroups(group, visit) {
  if (!group) {
    return;
  }

  visit(group);
  (group.groups || []).forEach((nestedGroup) => walkGroups(nestedGroup, visit));
}

function metricRow(label, metric, type) {
  if (!metric || !metric.values) {
    return null;
  }

  return {
    label,
    avg: valueFor(metric, 'avg', type),
    p95: valueFor(metric, 'p(95)', type),
    p99: valueFor(metric, 'p(99)', type),
    rate: valueFor(metric, 'rate', 'rate'),
    count: valueFor(metric, 'count', 'count') || valueFor(metric, 'passes', 'count'),
  };
}

function valueFor(metric, key, type) {
  if (!metric.values || metric.values[key] === undefined) {
    return '';
  }

  return formatValue(metric.values[key], type);
}

function formatMetricValue(metric, type) {
  if (!metric || !metric.values) {
    return '0';
  }

  return valueFor(metric, 'count', type) || valueFor(metric, 'rate', type) || '0';
}

function formatValue(value, type) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '';
  }

  if (type === 'rate') {
    return `${(Number(value) * 100).toFixed(2)}%`;
  }

  if (type === 'count') {
    return String(Math.round(Number(value)));
  }

  return Number(value).toFixed(2);
}

function renderMetricRow(row) {
  return `<tr>
    <td>${escapeHtml(row.label)}</td>
    <td>${escapeHtml(row.avg)}</td>
    <td>${escapeHtml(row.p95)}</td>
    <td>${escapeHtml(row.p99)}</td>
    <td>${escapeHtml(row.rate)}</td>
    <td>${escapeHtml(row.count)}</td>
  </tr>`;
}

function renderThresholdRow(threshold) {
  const statusClass = threshold.ok ? 'pass' : 'fail';
  const statusText = threshold.ok ? 'PASS' : 'FAIL';

  return `<tr>
    <td><span class="badge ${statusClass}">${statusText}</span></td>
    <td class="mono">${escapeHtml(threshold.metricName)}</td>
    <td class="mono">${escapeHtml(threshold.expression)}</td>
  </tr>`;
}

function renderCheckRow(check) {
  const statusClass = check.ok ? 'pass' : 'fail';
  const statusText = check.ok ? 'PASS' : 'FAIL';

  return `<tr>
    <td><span class="badge ${statusClass}">${statusText}</span></td>
    <td>${escapeHtml(check.name)}</td>
    <td>${escapeHtml(String(check.passes))}</td>
    <td>${escapeHtml(String(check.fails))}</td>
  </tr>`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
