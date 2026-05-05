import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { loadJsonConfig, resolveRuntimeConfig } from '../../core/configLoader.js';
import { AuthManager } from '../../core/authManager.js';
import { buildThresholds } from '../../core/thresholdManager.js';
import { executeCheckoutJourney } from '../journeys/checkout.flow.js';

const runtimeConfig = resolveRuntimeConfig();
const scenarioType = runtimeConfig.execution.scenario;
const scenarioConfig = runtimeConfig.slo.scenarios[scenarioType];

const checkoutData = new SharedArray('checkout-data', () => loadJsonConfig('../../data/checkout-data.json'));

if (!scenarioConfig) {
  throw new Error(`Scenario "${scenarioType}" is not defined in SLO profile "${runtimeConfig.slo.journey}".`);
}

export const options = {
  scenarios: {
    [`checkout_${scenarioType}`]: {
      executor: 'ramping-vus',
      exec: 'checkoutLoad',
      stages: scenarioConfig.stages,
      gracefulRampDown: scenarioConfig.gracefulRampDown || '30s',
      tags: {
        test_type: scenarioType,
        service: runtimeConfig.slo.service,
        journey: 'checkout',
      },
    },
  },
  thresholds: buildThresholds(runtimeConfig.slo),
};

export function setup() {
  const authManager = new AuthManager(runtimeConfig.environment);
  const auth = authManager.authenticate();

  return {
    environment: runtimeConfig.environment,
    authHeaders: auth.headers,
    testData: checkoutData,
    runId: runtimeConfig.execution.runId,
  };
}

export function checkoutLoad(data) {
  const iterationData = data.testData[__ITER % data.testData.length] || {};

  executeCheckoutJourney({
    environment: data.environment,
    authHeaders: data.authHeaders,
    testData: iterationData,
  });

  sleep(runtimeConfig.environment.pacing?.thinkTimeSeconds || 1);
}

export default function defaultScenario(data) {
  checkoutLoad(data);
}

export function teardown(data) {
  // Keep cleanup explicit so environment-specific teardown can be added without
  // touching journey code. Examples: delete test orders, release reservations.
  console.log(`Completed k6 run ${data.runId}`);
}
