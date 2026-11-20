import { group } from 'k6';

import {
  businessTransactionDuration,
  transactionDuration,
} from '../../../core/customMetrics.js';

import { HttpClient } from '../../../core/httpClient.js';

import {
  validateAddToCartNegative,
} from '../../../core/validators.js';

/**
 * Business Journey
 *
 * Add To Cart Negative API Performance Test
 *
 * NOTE:
 * Authentication is already completed inside setup()
 * using AuthManager.
 *
 * This journey intentionally sends an invalid payload
 * to validate error handling under load.
 */

export function executeAddToCartNegativeJourney({
  environment,
  authHeaders = {},
  testData = {},
}) {

  const client = new HttpClient({
    baseUrl: environment.baseUrl,

    defaultHeaders: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },

    timeout: environment.http?.timeout,
    retries: environment.http?.retries,
    retryDelaySeconds: environment.http?.retryDelaySeconds,
  });

  const startedAt = Date.now();

  group('addToCartNegative', () => {

    const payload = buildNegativePayload(testData);

    const response = client.post(
      '/api/ecom/user/add-to-cart',
      payload,
      {
        tags: {
          journey: 'addToCartNegative',
          step: 'invalid_add_product',
        },

        // Change according to actual API response
        expectedStatuses: [500],
      }
    );

    const body = response.json();
    validateAddToCartNegative(response, body);

  });

  const duration = Date.now() - startedAt;

  transactionDuration.add(duration, {
    journey: 'addToCartNegative',
  });

  businessTransactionDuration.add(duration, {
    journey: 'addToCartNegative',
  });

}

/**
 * Build an intentionally invalid payload.
 */
function buildNegativePayload(testData) {
  return {
    _id: testData.userId,
    product: testData.product,
  };
}