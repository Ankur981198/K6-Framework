import { group } from 'k6';

import {
  businessTransactionDuration,
  transactionDuration,
} from '../../../core/customMetrics.js';
import { HttpClient } from '../../../core/httpClient.js';
import { validateCreateOrder,} from '../../../core/validators.js';
import { executeAddToCartJourney,} from '../../addToCart/journeys/addToCart.flow.js';

/**
 * Business Journey
 *
 * Create Order API Performance Test
 *
 * Flow:
 * Login (setup/AuthManager)
 *        ↓
 * Add To Cart
 *        ↓
 * Create Order
 */

export function executeCreateOrderJourney({
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

  group('createOrder', () => {

    // Step 1: Add product to cart
    executeAddToCartJourney({
      environment,
      authHeaders,
      testData,
    });

    // Step 2: Create order
    const payload = buildCreateOrderPayload(testData);

    const response = client.post(
      '/api/ecom/order/create-order',
      payload,
      {
        tags: {
          journey: 'createOrder',
          step: 'create_order',
          system: 'payment_gateway'
        },
        expectedStatuses: [201],
      }
    );

    const body = response.json();

    validateCreateOrder(response, body);
  });

  const duration = Date.now() - startedAt;

  transactionDuration.add(duration, {
    journey: 'createOrder',
  });

  businessTransactionDuration.add(duration, {
    journey: 'createOrder',
  });
}

function buildCreateOrderPayload(testData) {
 if (!testData.product) {
    throw new Error(
      'Test data is invalid. "product" object is missing.'
    );
  }

  if (!testData.product._id) {
    throw new Error(
      'Test data is invalid. "product._id" is missing.'
    );
  }
  return {

    orders: [
      {
        country: testData.country,
        productOrderedId: testData.product._id,
      },
    ],

  };

}