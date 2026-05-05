/**
 * Configuration Layer
 *
 * k6 executes this code in the init context before setup/default/teardown.
 * `open()` is intentionally wrapped here so every test uses the same config
 * loading and validation behavior.
 */

const DEFAULT_ENVIRONMENT = 'local';
const DEFAULT_SLO_PROFILE = 'checkout';
const CONFIG_ROOT = '../../config';

export function loadJsonConfig(relativePath) {
  let rawConfig;

  try {
    rawConfig = open(relativePath);
  } catch (error) {
    throw new Error(
      `Unable to open JSON config at "${relativePath}". ` +
        `Run k6 from a scenario under tests/scenarios or use the provided runner script. ` +
        `Original error: ${error.message}`,
    );
  }

  if (!rawConfig || String(rawConfig).trim().length === 0) {
    throw new Error(`JSON config at "${relativePath}" is empty or could not be read.`);
  }

  try {
    return JSON.parse(rawConfig);
  } catch (error) {
    throw new Error(`Unable to parse JSON config at "${relativePath}": ${error.message}`);
  }
}

export function loadEnvironmentConfig(environmentName = __ENV.ENVIRONMENT || DEFAULT_ENVIRONMENT) {
  const config = resolveEnvPlaceholders(loadJsonConfig(`${CONFIG_ROOT}/env/${environmentName}.json`));
  assertRequired(config, ['name', 'baseUrl'], `environment config "${environmentName}"`);
  return config;
}

export function loadSloConfig(sloProfile = __ENV.SLO_PROFILE || DEFAULT_SLO_PROFILE) {
  const config = loadJsonConfig(`${CONFIG_ROOT}/slo/${sloProfile}.json`);
  assertRequired(config, ['service', 'slo'], `SLO config "${sloProfile}"`);
  return config;
}

export function resolveRuntimeConfig() {
  return {
    environment: loadEnvironmentConfig(),
    slo: loadSloConfig(),
    execution: {
      scenario: __ENV.SCENARIO || 'load',
      runId: __ENV.RUN_ID || `${Date.now()}`,
    },
  };
}

function assertRequired(config, fields, label) {
  const missing = fields.filter((field) => config[field] === undefined || config[field] === null);

  if (missing.length > 0) {
    throw new Error(`Invalid ${label}. Missing required field(s): ${missing.join(', ')}`);
  }
}

function resolveEnvPlaceholders(value) {
  if (Array.isArray(value)) {
    return value.map(resolveEnvPlaceholders);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((resolved, [key, nestedValue]) => {
      resolved[key] = resolveEnvPlaceholders(nestedValue);
      return resolved;
    }, {});
  }

  if (typeof value !== 'string') {
    return value;
  }

  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (match, envKey) => {
    return __ENV[envKey] === undefined ? match : __ENV[envKey];
  });
}
