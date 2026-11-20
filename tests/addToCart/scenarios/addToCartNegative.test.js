import { sleep } from 'k6';
import { SharedArray } from 'k6/data';
import {loadJsonConfig,resolveRuntimeConfig,} from '../../../core/configLoader.js';
import { AuthManager } from '../../../core/authManager.js';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";
import { buildThresholds } from '../../../core/thresholdManager.js';
import {executeAddToCartNegativeJourney,} from '../journeys/addToCartNegative.flow.js';


const runtimeConfig = resolveRuntimeConfig('negative');
const scenarioType = runtimeConfig.execution.scenario;
const scenarioConfig = runtimeConfig.slo.scenarios[scenarioType];

const addToCartNegativeData = new SharedArray(
  'add-to-cart-negative-data', () => loadJsonConfig('../../../data/addToCartNegative-data.json'));

if (!scenarioConfig) { throw new Error(`Scenario "${scenarioType}" not found.`);}

function buildScenarioOptions(type, config) {

  const base = {

    exec: 'addToCartNegativeLoad',

    tags: {
      journey: 'addToCartNegative',
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
    gracefulRampDown:
      config.gracefulRampDown || '30s',

  };

}

export const options = {

  scenarios: {

    [`addToCartNegative_${scenarioType}`]:
      buildScenarioOptions(
        scenarioType,
        scenarioConfig
      ),

  },

  thresholds: buildThresholds(runtimeConfig.slo),

};

export function setup() {

  const authManager =
    new AuthManager(runtimeConfig.environment);

  const auth =
    authManager.authenticate();

  return {

    environment: runtimeConfig.environment,
    authHeaders: auth.headers,
    runId: runtimeConfig.execution.runId,

  };

}

export function addToCartNegativeLoad(data) {

  const iterationData =
    addToCartNegativeData[
      __ITER % addToCartNegativeData.length
    ];

  executeAddToCartNegativeJourney({

    environment: data.environment,
    authHeaders: data.authHeaders,
    testData: iterationData,

  });

  sleep(
    runtimeConfig.environment.pacing?.thinkTimeSeconds || 1
  );

}

export default function (data) {
  addToCartNegativeLoad(data);
}

export function teardown(data) {
  console.log(
    `Completed Add To Cart Negative Test ${data.runId}`
  );
}

export function handleSummary(data) {

  return {

    stdout: textSummary(data),

    [`reports/${runtimeConfig.slo.service}NegativeTest-${scenarioType}.json`]:
      JSON.stringify(data, null, 2),

    [`reports/${runtimeConfig.slo.service}NegativeTest-${scenarioType}.html`]:
      htmlReport(data),

  };

}