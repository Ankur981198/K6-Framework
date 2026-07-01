const DEFAULT_ENVIRONMENT = 'local';
const DEFAULT_SLO_PROFILE = 'login';

const CONFIG_ROOT = __ENV.CONFIG_ROOT || '../../../config';

/**
 * Load JSON safely
 */
export function loadJsonConfig(relativePath) {
  let rawConfig;

  try {
    rawConfig = open(relativePath);
  } catch (error) {
    throw new Error(
      `Unable to open JSON config at "${relativePath}". ` +
      `Original error: ${error.message}`,
    );
  }

  if (!rawConfig || String(rawConfig).trim().length === 0) {
    throw new Error(`JSON config at "${relativePath}" is empty or unreadable.`);
  }

  try {
    return JSON.parse(rawConfig);
  } catch (error) {
    throw new Error(
      `Unable to parse JSON config at "${relativePath}": ${error.message}`
    );
  }
}

/**
 * ENV config loader (with full resolution)
 */
export function loadEnvironmentConfig(
  environmentName = __ENV.ENVIRONMENT || DEFAULT_ENVIRONMENT
) {
  const raw = loadJsonConfig(`${CONFIG_ROOT}/env/${environmentName}.json`);

  const config = resolvePlaceholders(raw);

  assertRequired(config, ['name', 'baseUrl'], `environment config "${environmentName}"`);

  return config;
}

/**
 * SLO config loader (also resolved now)
 */
export function loadSloConfig(
  sloProfile = __ENV.SLO_PROFILE || DEFAULT_SLO_PROFILE
) {
  const raw = loadJsonConfig(`${CONFIG_ROOT}/slo/${sloProfile}.json`);

  const config = resolvePlaceholders(raw);

  assertRequired(config, ['service', 'slo'], `SLO config "${sloProfile}"`);

  return config;
}

/**
 * Runtime config aggregator
 */
export function resolveRuntimeConfig() {
  return {
    environment: loadEnvironmentConfig(),
    slo: loadSloConfig(),
    execution: {
      scenario: __ENV.SCENARIO || 'load',
      runId: __ENV.RUN_ID || String(Date.now()),
    },
  };
}

/**
 * Required field validation
 */
function assertRequired(config, fields, label) {
  const missing = fields.filter(
    (field) => config[field] === undefined || config[field] === null
  );

  if (missing.length > 0) {
    throw new Error(
      `Invalid ${label}. Missing: ${missing.join(', ')}`
    );
  }
}

/**
 * 🔥 Core improvement: safe recursive placeholder resolver
 */
function resolvePlaceholders(value) {
  if (Array.isArray(value)) {
    return value.map(resolvePlaceholders);
  }

  if (value && typeof value === 'object') {
    const resolved = {};
    for (const key in value) {
      resolved[key] = resolvePlaceholders(value[key]);
    }
    return resolved;
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, envKey) => {
    return __ENV[envKey] !== undefined ? __ENV[envKey] : '';
  });
}