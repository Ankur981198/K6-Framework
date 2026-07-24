const DEFAULT_ENVIRONMENT = 'local';
const DEFAULT_SLO_PROFILE = 'positive';

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
export function loadSloConfig(defaultSloProfile) {
  const profileToUse = __ENV.SLO_PROFILE || defaultSloProfile || DEFAULT_SLO_PROFILE;
  const raw = loadJsonConfig(`${CONFIG_ROOT}/slo/${profileToUse}.json`);

  const config = resolvePlaceholders(raw);

  assertRequired(config, ['service', 'slo'], `SLO config "${profileToUse}"`);

  return config;
}

/**
 * Runtime config aggregator
 */
export function resolveRuntimeConfig(defaultSloProfile) {
  return {
    environment: loadEnvironmentConfig(),
    slo: loadSloConfig(defaultSloProfile),
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

let parsedEnv = null;

function getEnvVariables() {
  if (parsedEnv !== null) return parsedEnv;
  
  parsedEnv = {};
  try {
    const envFileContent = open(`${CONFIG_ROOT}/../.env`);
    const lines = envFileContent.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const index = trimmed.indexOf('=');
      if (index > -1) {
        const key = trimmed.substring(0, index).trim();
        const val = trimmed.substring(index + 1).trim();
        // Remove quotes if present
        parsedEnv[key] = val.replace(/^["'](.*)["']$/, '$1');
      }
    }
  } catch (error) {
    // Ignore if .env doesn't exist
  }
  
  return parsedEnv;
}

/**
 *  Core improvement: safe recursive placeholder resolver
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

  const customEnv = getEnvVariables();

  return value.replace(/\$\{([A-Z0-9_]+)\}/g, (_, envKey) => {
    if (__ENV[envKey] !== undefined) {
      return __ENV[envKey];
    }
    if (customEnv[envKey] !== undefined) {
      return customEnv[envKey];
    }
    return '';
  });
}