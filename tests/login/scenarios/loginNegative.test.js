import { sleep } from 'k6';
import { SharedArray } from 'k6/data';

import {loadJsonConfig,resolveRuntimeConfig,} from '../../../core/configLoader.js';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";
import { buildThresholds,} from '../../../core/thresholdManager.js';
import { executeLoginNegativeJourney } from '../journeys/loginNegative.flow.js';

const runtimeConfig = resolveRuntimeConfig('negative');
const scenarioType = runtimeConfig.execution.scenario;
const scenarioConfig = runtimeConfig.slo.scenarios[scenarioType];

const loginNegativeData = new SharedArray(
  'login-negative-data',() => loadJsonConfig('../../../data/loginNegative-data.json')
);

if (!scenarioConfig) {
  throw new Error(`Scenario "${scenarioType}" not found.`);
}

function buildScenarioOptions(type, config) {

  const base = {
    exec: 'loginNegativeLoad',

    tags: {
      journey: 'loginNegative',
      service: runtimeConfig.slo.service,
      test_type: type,
    },
  };

  const executor =
    config.executor || 'ramping-vus';

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
    [`loginNegative_${scenarioType}`]:
      buildScenarioOptions(
        scenarioType,
        scenarioConfig
      ),
  },

  thresholds: buildThresholds(
    runtimeConfig.slo
  ),

};

export function setup() {

  return {
    environment: runtimeConfig.environment,
    runId: runtimeConfig.execution.runId,
  };

}

export function loginNegativeLoad(data) {

  const iterationData = loginNegativeData[__ITER % loginNegativeData.length];
  executeLoginNegativeJourney({environment: data.environment,testData: iterationData,});
  sleep(runtimeConfig.environment.pacing?.thinkTimeSeconds || 1);

}

export default function (data) {
  loginNegativeLoad(data);
}

export function teardown(data) {
  console.log(`Completed Login Negative Test ${data.runId}`);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data),

    [`reports/${runtimeConfig.slo.service}Test-${scenarioType}.json`]:
      JSON.stringify(data, null, 2),

    [`reports/${runtimeConfig.slo.service}Test-${scenarioType}.html`]:
      htmlReport(data),
  };
}