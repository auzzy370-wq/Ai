import assert from "assert";
import {
  computeOverall,
  evaluateMandatory,
  weightsForTrack,
  DEFAULT_WEIGHTS,
  CYBERSECURITY_WEIGHTS,
} from "../src/server/scoring/policy";

const scores = {
  frontend: 90,
  backend: 92,
  database: 88,
  architecture: 91,
  infrastructure: 85,
  security: 93,
  testing: 90,
  problemSolving: 91,
  performance: 80,
  collaboration: 85,
};

assert.equal(Object.values(DEFAULT_WEIGHTS).reduce((a, b) => a + b, 0), 100);
assert.equal(Object.values(CYBERSECURITY_WEIGHTS).reduce((a, b) => a + b, 0), 100);

const eng = computeOverall(scores, weightsForTrack("SOFTWARE_ENGINEERING"));
const cyber = computeOverall(scores, weightsForTrack("CYBERSECURITY"));
assert.ok(cyber > eng, "cyber track should weight security higher given strong security score");

const gate = evaluateMandatory({
  overall: 92,
  scores,
  deploymentOk: true,
  hiddenTestsOk: true,
  incidentOk: true,
  architectureOk: true,
  teamOk: true,
  humanApproved: true,
  criticalSecurity: false,
});
assert.equal(gate.qualified, true);
assert.equal(gate.tier, "ELITE");

const failSec = evaluateMandatory({
  overall: 95,
  scores,
  deploymentOk: true,
  hiddenTestsOk: true,
  incidentOk: true,
  architectureOk: true,
  teamOk: true,
  humanApproved: true,
  criticalSecurity: true,
});
assert.equal(failSec.qualified, false);

console.log("unit-smoke OK", { eng, cyber, tier: gate.tier });
