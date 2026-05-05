import { authFailureRate } from './customMetrics.js';
import { HttpClient } from './httpClient.js';

/**
 * Core Framework Layer: token auth manager
 *
 * Auth is isolated from journeys so tests can move between local mocks, shared
 * test environments, and production-like stages without rewriting flows.
 */

export class AuthManager {
  constructor(environmentConfig) {
    this.environmentConfig = environmentConfig;
    this.authConfig = environmentConfig.auth || {};
  }

  authenticate() {
    if (!this.authConfig.enabled) {
      return {
        token: null,
        headers: {},
      };
    }

    assertNoUnresolvedPlaceholders(this.authConfig.credentials || {}, 'auth.credentials');

    const client = new HttpClient({
      baseUrl: this.environmentConfig.baseUrl,
      defaultHeaders: this.authConfig.headers || { 'Content-Type': 'application/json' },
      timeout: this.environmentConfig.http?.timeout,
      retries: this.environmentConfig.http?.retries || 0,
      retryDelaySeconds: this.environmentConfig.http?.retryDelaySeconds || 1,
    });

    const response = client.request(
      this.authConfig.method || 'POST',
      this.authConfig.tokenUrl,
      this.authConfig.credentials || {},
      {
        tags: { operation: 'authenticate' },
        expectedStatuses: this.authConfig.expectedStatuses || [200],
      },
    );

    if (response.status < 200 || response.status >= 300) {
      authFailureRate.add(true);
      throw new Error(`Authentication failed with status ${response.status}.`);
    }

    const token = extractToken(response, this.authConfig.tokenPath || 'access_token');

    if (!token) {
      authFailureRate.add(true);
      throw new Error(`Authentication response did not contain token at "${this.authConfig.tokenPath}".`);
    }

    authFailureRate.add(false);

    return {
      token,
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }
}

function extractToken(response, tokenPath) {
  let payload;

  try {
    payload = response.json();
  } catch (error) {
    throw new Error(`Authentication response was not valid JSON: ${error.message}`);
  }

  return tokenPath.split('.').reduce((value, key) => (value ? value[key] : undefined), payload);
}

function assertNoUnresolvedPlaceholders(value, path) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoUnresolvedPlaceholders(item, `${path}[${index}]`));
    return;
  }

  if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, nestedValue]) => {
      assertNoUnresolvedPlaceholders(nestedValue, `${path}.${key}`);
    });
    return;
  }

  if (typeof value === 'string' && /\$\{[A-Z0-9_]+\}/.test(value)) {
    throw new Error(`Unresolved environment variable placeholder at ${path}.`);
  }
}
