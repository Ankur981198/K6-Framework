import { Rate, Trend } from 'k6/metrics';

/**
 * Core Framework Layer: custom SLIs
 *
 * These metrics are intentionally domain-oriented rather than endpoint-only.
 * They can be exported to Prometheus/Grafana through the k6 output layer
 * without changing journey code.
 */

export const checkoutTransactionDuration = new Trend('checkout_transaction_duration', true);
export const businessTransactionDuration = new Trend('business_transaction_duration', true);

export const errorRate = new Rate('error_rate');
export const authFailureRate = new Rate('auth_failure_rate');
export const retryRate = new Rate('retry_rate');
