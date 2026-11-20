import { group } from 'k6';
import { businessTransactionDuration, transactionDuration, } from '../../../core/customMetrics.js';
import { HttpClient } from '../../../core/httpClient.js';
import { validateCreateOrderNegative, } from '../../../core/validators.js';

/**
 * Business Journey
 *
 * Create Order Negative API Performance Test
 *
 * NOTE:
 * Auth is already handled in setup()
 *
 * This journey sends invalid payloads
 * to validate error handling under load.
 */

export function executeCreateOrderNegativeJourney({
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

  group('createOrderNegative', () => {

    // Step 1: Build invalid payload
    const payload = buildNegativePayload(testData);

    // Step 2: API call
    const response = client.post(
      '/api/ecom/order/create-order',
      payload,
      {
        tags: {
          journey: 'createOrderNegative',
          step: 'invalid_create_order',
        },

        // negative APIs often return:
        expectedStatuses: [400, 422, 500],
      }
    );

    const body = response.json();

    // Step 3: validation
    validateCreateOrderNegative(response, body);
  });

  const duration = Date.now() - startedAt;

  transactionDuration.add(duration, {
    journey: 'createOrderNegative',
  });

  businessTransactionDuration.add(duration, {
    journey: 'createOrderNegative',
  });
}

/**
 * Build intentionally invalid payload
 */
function buildNegativePayload(testData) {
  return {
    orders: [
      {
        // Missing required productOrderedId OR invalid value
        productOrderedId: testData.invalidProductId || '',
        country: testData.country || null
      }
    ]
  };
}