import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { loadJsonConfig, resolveRuntimeConfig, } from '../../../core/configLoader.js';
import { AuthManager } from '../../../core/authManager.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';
import { buildThresholds } from '../../../core/thresholdManager.js';
import {executeCreateOrderNegativeJourney,} from '../journeys/createOrderNegative.flow.js';

const runtimeConfig = resolveRuntimeConfig();
const scenarioType = runtimeConfig.execution.scenario;
const scenarioConfig = runtimeConfig.slo.scenarios[scenarioType];

/**
 * Test data
 */
const createOrderNegativeData = new SharedArray(
  'create-order-negative-data',
  () =>
    loadJsonConfig('../../../data/createOrderNegative-data.json')
      .scenarios
);

if (!scenarioConfig) {
  throw new Error(`Scenario "${scenarioType}" not found.`);
}

/**
 * Scenario options builder
 */
function buildScenarioOptions(type, config) {
  const base = {
    exec: 'createOrderNegativeLoad',

    tags: {
      journey: 'createOrderNegative',
      service: runtimeConfig.slo.service,
      test_type: type,
    },
  };

  const executor = config.executor || 'ramping-vus';

  if (executor === 'constant-vus') {
    return {
      ...base,
      executor: 'constant-vus',
      vus: config.vus,
      duration: config.duration,
    };
  }

  return {
    ...base,
    executor: 'ramping-vus',
    stages: config.stages,
    gracefulRampDown: config.gracefulRampDown || '30s',
  };
}

/**
 * k6 options
 */
export const options = {
  scenarios: {
    [`createOrderNegative_${scenarioType}`]: buildScenarioOptions(
      scenarioType,
      scenarioConfig
    ),
  },

  thresholds: buildThresholds(runtimeConfig.slo),
};

/**
 * setup (auth)
 */
export function setup() {
  const authManager = new AuthManager(runtimeConfig.environment);
  const auth = authManager.authenticate();

  return {
    environment: runtimeConfig.environment,
    authHeaders: auth.headers,
    runId: runtimeConfig.execution.runId,
  };
}

/**
 * main load function
 */
export function createOrderNegativeLoad(data) {
  const iterationData =
    createOrderNegativeData[
      __ITER % createOrderNegativeData.length
    ];

  executeCreateOrderNegativeJourney({
    environment: data.environment,
    authHeaders: data.authHeaders,
    testData: iterationData,
  });

  sleep(runtimeConfig.environment.pacing?.thinkTimeSeconds || 1);
}

/**
 * default entry
 */
export default function (data) {
  createOrderNegativeLoad(data);
}

/**
 * teardown
 */
export function teardown(data) {
  console.log(
    `Completed Create Order Negative Test ${data.runId}`
  );
}

/**
 * reports
 */
export function handleSummary(data) {
  return {
    stdout: textSummary(data),

    [`reports/${runtimeConfig.slo.service}NegativeTest-${scenarioType}.json`]:
      JSON.stringify(data, null, 2),

    [`reports/${runtimeConfig.slo.service}NegativeTest-${scenarioType}.html`]:
      htmlReport(data),
  };
}