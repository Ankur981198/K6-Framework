import { group } from 'k6';

import {
  businessTransactionDuration,
  transactionDuration,
} from '../../../core/customMetrics.js';

import { HttpClient } from '../../../core/httpClient.js';

import {
  validateLoginNegative,
} from '../../../core/validators.js';

/**
 * Business Journey
 *
 * Login Negative API Performance Test
 *
 * Purpose:
 * Validate that the Login API gracefully handles
 * invalid requests under load.
 *
 * Expected Response:
 * HTTP 400 Bad Request
 */

export function executeLoginNegativeJourney({
  environment,
  testData = {},
}) {

  const client = new HttpClient({
    baseUrl: environment.baseUrl,

    defaultHeaders: {
      'Content-Type': 'application/json',
    },

    timeout: environment.http?.timeout,
    retries: environment.http?.retries,
    retryDelaySeconds:
      environment.http?.retryDelaySeconds,
  });

  const startedAt = Date.now();

  group('loginNegative', () => {

    const payload = buildLoginNegativePayload(testData);

    const response = client.post(
      '/api/ecom/auth/login',
      payload,
      {
        tags: {
          journey: 'loginNegative',
          step: 'authenticate_invalid',
        },
        expectedStatuses: [400],
      }
    );

    const body = response.json();

    validateLoginNegative(response, body);

  });

  const duration = Date.now() - startedAt;

  transactionDuration.add(duration, {
    journey: 'loginNegative',
  });

  businessTransactionDuration.add(duration, {
    journey: 'loginNegative',
  });

}

function buildLoginNegativePayload(testData) {

  return {

    // Invalid test data
    userEmail: testData.userEmail,
    userPassword: testData.userPassword,

  };

}