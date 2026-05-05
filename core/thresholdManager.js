/**
 * Core Framework Layer: threshold manager
 *
 * Thresholds are generated from SLO/performance-budget config so CI failures
 * represent a policy breach, not a hardcoded script opinion.
 */

export function buildThresholds(sloConfig) {
  if (!sloConfig || !sloConfig.slo) {
    throw new Error('SLO config must include a "slo" object.');
  }

  return Object.entries(sloConfig.slo).reduce((thresholds, [metricName, rules]) => {
    thresholds[metricName] = normalizeRules(metricName, rules);
    return thresholds;
  }, {});
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
