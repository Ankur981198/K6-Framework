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
      ...authHeaders,
    },
    timeout: environment.http?.timeout,
    retries: environment.http?.retries,
    retryDelaySeconds: environment.http?.retryDelaySeconds,
  });

  const startedAt = Date.now();

  group('checkout', () => {
    client.get('/public/crocodiles/', {
      tags: { journey: 'checkout', step: 'browse_catalog' },
    });

    client.post('/my/crocodiles/', buildCheckoutPayload(testData), {
      tags: { journey: 'checkout', step: 'create_order' },
      expectedStatuses: [200, 201, 202, 400, 401],
    });
  });

  const duration = Date.now() - startedAt;
  checkoutTransactionDuration.add(duration, { journey: 'checkout' });
  businessTransactionDuration.add(duration, { journey: 'checkout' });
}

function buildCheckoutPayload(testData) {
  return {
    name: testData.productName || `perf-order-${__VU}-${__ITER}`,
    sex: testData.sex || 'M',
    date_of_birth: testData.dateOfBirth || '2020-01-01',
  };
}
