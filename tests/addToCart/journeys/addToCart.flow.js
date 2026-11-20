import { group } from 'k6';
import { businessTransactionDuration,transactionDuration,} from '../../../core/customMetrics.js';
import { HttpClient } from '../../../core/httpClient.js';
import { validateAddToCart,} from '../../../core/validators.js';
/**
 * Business Journey
 * Add To Cart API Performance Test
 * NOTE:
 * Authentication is already completed inside setup()
 * using AuthManager.
 * This journey only executes the Add To Cart API.
 */

export function executeAddToCartJourney({
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

  group('addToCart', () => {

    const payload = buildAddToCartPayload(testData);
    const response = client.post( '/api/ecom/user/add-to-cart',payload,
      {
        tags: 
        {
          journey: 'addToCart',
          step: 'add_product',},
          expectedStatuses: [200],
      });

    const body = response.json();
    validateAddToCart(response, body);
  });

  const duration = Date.now() - startedAt;

  transactionDuration.add(duration, { journey: 'addToCart',});
  businessTransactionDuration.add(duration, { journey: 'addToCart',});

}

function buildAddToCartPayload(testData) {
  return {
    _id: testData.userId,
    product: testData.product,
  };
}