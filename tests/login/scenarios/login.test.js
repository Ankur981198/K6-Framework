import { sleep } from 'k6';
import { SharedArray } from 'k6/data';

import {loadJsonConfig,resolveRuntimeConfig,} from '../../../core/configLoader.js';
import { htmlReport } from "https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js";
import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.4/index.js";
import {buildThresholds,} from '../../../core/thresholdManager.js';
import {executeLoginJourney,} from '../journeys/login.flow.js';

const runtimeConfig = resolveRuntimeConfig();
const scenarioType = runtimeConfig.execution.scenario;
const scenarioConfig = runtimeConfig.slo.scenarios[scenarioType];

const loginData = new SharedArray(
  'login-data',
  () => loadJsonConfig('../../../data/login-data.json')
);

if (!scenarioConfig) {
  throw new Error(`Scenario "${scenarioType}" not found.`);
}

function buildScenarioOptions(type, config) {
  const base = {
    exec: 'loginLoad',
    tags: {
      journey: 'login',
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

  // Default: ramping-vus (load, stress, spike, breakpoint)
  return {
    ...base,
    executor: 'ramping-vus',
    stages: config.stages,
    gracefulRampDown: config.gracefulRampDown || '30s',
  };
}

export const options = {
  scenarios: {
    [`login_${scenarioType}`]: buildScenarioOptions(scenarioType, scenarioConfig),
  },
  thresholds: buildThresholds(runtimeConfig.slo),
};

export function setup() {
  return {
    environment: runtimeConfig.environment,
    runId: runtimeConfig.execution.runId,
  };
}

export function loginLoad(data) {

  // SharedArray is accessed directly here — it cannot be passed via setup()
  const iterationData = loginData[__ITER % loginData.length];

  executeLoginJourney({
    environment: data.environment,
    testData: iterationData,
  });

  sleep(
    runtimeConfig.environment.pacing?.thinkTimeSeconds || 1
  );

}

export default function (data) {
  loginLoad(data);
}

export function teardown(data) {
  console.log(
    `Completed Login Test ${data.runId}`
  );
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