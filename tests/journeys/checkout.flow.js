import { group } from 'k6';
import { businessTransactionDuration, checkoutTransactionDuration } from '../../core/customMetrics.js';
import { HttpClient } from '../../core/httpClient.js';

/**
 * Test Design Layer: checkout journey
 *
 * A journey models user intent and business flow. It receives dependencies
 * from the scenario instead of reading global config directly, which keeps it
 * reusable across load, stress, spike, soak, and future distributed execution.
 */

export function executeCheckoutJourney({ environment, authHeaders = {}, testData = {} }) {
  const client = new HttpClient({
    baseUrl: environment.baseUrl,
    defaultHeaders: {
      'Content-Type': 'application/json',
      'X-User-ID': String(testData.userId || `${__VU}${__ITER}`),
      ...authHeaders,
    },
    timeout: environment.http?.timeout,
    retries: environment.http?.retries,
    retryDelaySeconds: environment.http?.retryDelaySeconds,
  });

  const startedAt = Date.now();

  group('checkout', () => {
    client.get('/api/config', {
      tags: { journey: 'checkout', step: 'load_config' },
    });

    client.post('/api/pizza', buildCheckoutPayload(testData), {
      tags: { journey: 'checkout', step: 'request_recommendation' },
      expectedStatuses: [200],
    });
  });

  const duration = Date.now() - startedAt;
  checkoutTransactionDuration.add(duration, { journey: 'checkout' });
  businessTransactionDuration.add(duration, { journey: 'checkout' });
}

function buildCheckoutPayload(testData) {
  return {
    maxCaloriesPerSlice: testData.maxCaloriesPerSlice || 500,
    mustBeVegetarian: Boolean(testData.mustBeVegetarian),
    excludedIngredients: testData.excludedIngredients || ['pepperoni'],
    excludedTools: testData.excludedTools || ['knife'],
    maxNumberOfToppings: testData.maxNumberOfToppings || 6,
    minNumberOfToppings: testData.minNumberOfToppings || 2,
  };
}
