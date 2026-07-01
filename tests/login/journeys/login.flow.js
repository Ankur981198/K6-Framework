import { group } from 'k6';

import {businessTransactionDuration,transactionDuration,} from '../../../core/customMetrics.js';
import {validateLogin,} from '../../../core/validators.js';
import { HttpClient } from '../../../core/httpClient.js';

/**
 * Business Journey
 * Login API Performance Test
 * NOTE:
 * This journey DOES NOT use AuthManager because Login itself
 * is the API under test.
 */

export function executeLoginJourney({
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
    retryDelaySeconds: environment.http?.retryDelaySeconds,
  });

  const startedAt = Date.now();

  group('login', () => {

    const payload = buildLoginPayload(testData);

    const response = client.post('/api/ecom/auth/login', payload,
      {
        tags: {
          journey: 'login',
          step: 'authenticate',
        },
        expectedStatuses: [200],
      });

    const body = response.json();
    validateLogin(response, body);

    if (!body.token) {
        throw new Error("Token not found");
    }

  });

  const duration = Date.now() - startedAt;

  businessTransactionDuration.add(duration, {
    journey: 'login',
  });

}

function buildLoginPayload(testData) {
  return {
    userEmail: testData.userEmail,
    userPassword: testData.userPassword,
  };
}