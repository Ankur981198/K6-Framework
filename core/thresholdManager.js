/**
 * Core Framework Layer: threshold manager
 *
 * Thresholds are generated from SLO/performance-budget config so CI failures
 * represent a policy breach, not a hardcoded script opinion.
 */

export function buildThresholds(sloConfig) {
  if (!sloConfig || (!sloConfig.slo && !sloConfig.systems)) {
    throw new Error('SLO config must include a "slo" or "systems" object.');
  }

  const thresholds = {};

  // Process global SLOs
  if (sloConfig.slo) {
    Object.entries(sloConfig.slo).forEach(([metricName, rules]) => {
      thresholds[metricName] = normalizeRules(metricName, rules);
    });
  }

  // Process system-specific SLOs (Multi-system support)
  // Generates tags like: http_req_duration{system:payment}
  if (sloConfig.systems) {
    Object.entries(sloConfig.systems).forEach(([systemName, systemSlos]) => {
      Object.entries(systemSlos).forEach(([metricName, rules]) => {
        const taggedMetric = `${metricName}{system:${systemName}}`;
        thresholds[taggedMetric] = normalizeRules(taggedMetric, rules);
      });
    });
  }

  return thresholds;
}

function normalizeRules(metricName, rules) {
  const normalizedRules = Array.isArray(rules) ? rules : [rules];

  return normalizedRules.map((rule) => {
    validateRule(metricName, rule);

    const expression = `${rule.stat ? `${rule.stat}` : 'rate'}${rule.operator}${rule.value}`;

    if (rule.abortOnFail || rule.delayAbortEval) {
      return {
        threshold: expression,
        abortOnFail: Boolean(rule.abortOnFail),
        delayAbortEval: rule.delayAbortEval,
      };
    }

    return expression;
  });
}

function validateRule(metricName, rule) {
  if (!rule || typeof rule !== 'object') {
    throw new Error(`Threshold rule for "${metricName}" must be an object.`);
  }

  if (!rule.operator || rule.value === undefined || rule.value === null) {
    throw new Error(`Threshold rule for "${metricName}" requires "operator" and "value".`);
  }
}
