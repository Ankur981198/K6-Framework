import http from 'k6/http';
import { check, sleep } from 'k6';
import { errorRate, retryRate } from './customMetrics.js';

/**
 * Core Framework Layer: HTTP client wrapper
 *
 * Centralizing HTTP behavior keeps journeys small and lets the framework add
 * cross-cutting behavior later: correlation IDs, distributed tracing headers,
 * circuit breaking, richer retry policies, or service virtualization toggles.
 */

export class HttpClient {
  constructor({ baseUrl, defaultHeaders = {}, timeout = '30s', retries = 0, retryDelaySeconds = 1 }) {
    if (!baseUrl) {
      throw new Error('HttpClient requires a baseUrl.');
    }

    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.defaultHeaders = defaultHeaders;
    this.timeout = timeout;
    this.retries = Number(retries);
    this.retryDelaySeconds = Number(retryDelaySeconds);
  }

  get(path, options = {}) {
    return this.request('GET', path, null, options);
  }

  post(path, body, options = {}) {
    return this.request('POST', path, body, options);
  }

  request(method, path, body = null, options = {}) {
    const url = this.buildUrl(path);
    const expectedStatuses = options.expectedStatuses || [200, 201, 202, 204];
    const params = this.buildParams(options);
    const maxAttempts = 1 + (options.retries ?? this.retries);

    let response;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      response = this.execute(method, url, body, params);

      const isExpected = expectedStatuses.includes(response.status);
      errorRate.add(!isExpected, params.tags);

      check(response, {
        [`${method} ${path} returned expected status`]: (res) => expectedStatuses.includes(res.status),
      });

      if (isExpected || attempt === maxAttempts) {
        return response;
      }

      retryRate.add(true, params.tags);
      sleep(options.retryDelaySeconds ?? this.retryDelaySeconds);
    }

    return response;
  }

  execute(method, url, body, params) {
    if (method === 'GET') {
      return http.get(url, params);
    }

    if (method === 'POST') {
      return http.post(url, serializeBody(body, params.headers), params);
    }

    return http.request(method, url, serializeBody(body, params.headers), params);
  }

  buildUrl(path) {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }

    return `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  }

  buildParams(options) {
    return {
      headers: {
        ...this.defaultHeaders,
        ...(options.headers || {}),
      },
      tags: {
        component: 'api',
        ...(options.tags || {}),
      },
      timeout: options.timeout || this.timeout,
    };
  }
}

function serializeBody(body, headers = {}) {
  if (body === null || body === undefined || typeof body === 'string') {
    return body;
  }

  const contentType = headers['Content-Type'] || headers['content-type'];
  return contentType && contentType.includes('application/json') ? JSON.stringify(body) : body;
}
