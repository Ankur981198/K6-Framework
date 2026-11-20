import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * Generic Business Transaction Metrics
 */
export const transactionDuration = new Trend('transaction_duration',true);
export const businessTransactionDuration = new Trend('business_transaction_duration',true);

/**
 * Business API Duration
 */

export const loginDuration = new Trend('login_duration', true);
export const addToCartDuration =new Trend('add_to_cart_duration', true);

/**
 * Success / Failure
 */

export const loginSuccessRate =new Rate('login_success_rate');
export const addToCartSuccessRate = new Rate('add_to_cart_success_rate');
export const businessFailureRate = new Rate('business_failure_rate');
export const authFailureRate = new Rate('auth_failure_rate');
export const errorRate =new Rate('error_rate');
export const retryRate =new Rate('retry_rate');

/**
 * Business Counters
 */

export const loginCount =new Counter('login_count');
export const addToCartCount =new Counter('add_to_cart_count');