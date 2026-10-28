import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COURSE, FINISH_Z, DEFAULT_SETTINGS, DRONE_RADIUS, FRAME_THICKNESS,
  createSimulation, stepSimulation, triggerGust, getTelemetry, routeAt, assessGatePassage, gateObstacleBoxes,
} from './flightPhysics.js';

const STEP = 1 / 120;
function fly(settings = DEFAULT_SETTINGS, seconds = 40, state = createSimulation()) {
  for (let frame = 0; frame < Math.round(seconds / STEP); frame += 1) stepSimulation(state, settings, STEP);
  return state;
}

test('calm course follows every opening and baseline is identical without disturbances', () => {
  const settings = { ...DEFAULT_SETTINGS, wind: 0 };
  const state = fly(settings);
  assert.equal(state.status, 'complete');
  assert.equal(state.z, FINISH_Z);
  assert.equal(state.cleared, COURSE.length);
  assert.equal(state.hits, 0);
  assert.equal(state.missed, 0);
  assert.equal(state.groundContacts, 0);
  assert.deepEqual(state.drone, state.ghost);
  assert.ok(getTelemetry(state, settings).rmsError < 0.02);
  for (const gate of COURSE) {
    const target = routeAt(gate.z);
    assert.ok(Math.abs(target.x - gate.x) < 1e-9);
    assert.ok(Math.abs(target.y - gate.y) < 1e-9);
  }
});

test('adaptive disturbance compensation reduces real crosswind tracking error', () => {
  const state = fly();
  const telemetry = getTelemetry(state);
  assert.equal(state.cleared, COURSE.length);
  assert.ok(telemetry.ghostRmsError > 0.7, 'baseline must actually drift under wind');
  assert.ok(telemetry.rmsError < telemetry.ghostRmsError * 0.2);
  assert.ok(state.drone.correctionX < -1, 'estimated counterforce opposes crosswind');
  assert.ok(Math.abs(state.drone.roll) > 0.1, 'counterforce must visibly tilt the drone');
});

test('both drones use the same controller when adaptive compensation is off', () => {
  const state = fly({ ...DEFAULT_SETTINGS, adaptive: false, wind: 9, payload: 20, motor: 85 });
  assert.deepEqual(state.drone, state.ghost);
  assert.deepEqual(state.gates, state.ghostGates);
  assert.equal(state.metrics.errorIntegral, state.metrics.ghostErrorIntegral);
});

test('unexpected gust deflects the vehicle, then feedback recovers', () => {
  const state = fly(DEFAULT_SETTINGS, 5);
  const before = { x: state.drone.x, y: state.drone.y, vx: state.drone.vx };
  assert.equal(triggerGust(state), true);
  assert.equal(triggerGust(state), false, 'gusts cannot stack while one is active');
  assert.equal(state.drone.x, before.x, 'a disturbance cannot teleport the vehicle');
  let peakError = 0;
  for (let frame = 0; frame < 10 / STEP; frame += 1) {
    stepSimulation(state, DEFAULT_SETTINGS, STEP);
    peakError = Math.max(peakError, getTelemetry(state).error);
  }
  assert.ok(peakError > 0.4, 'gust should visibly displace the drone');
  assert.ok(peakError < 1.5, 'default controller should retain useful control');
  assert.ok(getTelemetry(state).error < 0.12, 'drone should recover after gust');
  assert.equal(state.gustRemaining, 0);
  assert.ok(state.metrics.ghostErrorIntegral > state.metrics.errorIntegral * 4);
});

test('swept gate clearance distinguishes clear opening, contact and complete miss', () => {
  const gate = COURSE[0];
  const passage = (x, y) => assessGatePassage(gate, { x, y, z: gate.z - 2 }, { x, y, z: gate.z + 2 });
  assert.equal(passage(gate.x, gate.y), 'cleared');
  assert.equal(passage(gate.x + gate.width / 2 - DRONE_RADIUS + 0.01, gate.y), 'hit');
  assert.equal(passage(gate.x, gate.y + gate.height / 2 - DRONE_RADIUS + 0.01), 'hit');
  assert.equal(passage(gate.x + gate.width / 2 + FRAME_THICKNESS + DRONE_RADIUS + 0.01, gate.y), 'missed');
  assert.equal(passage(gate.x, gate.y - gate.height / 2 - FRAME_THICKNESS - DRONE_RADIUS - 0.01), 'missed');
  assert.equal(assessGatePassage(gate, { x: gate.x, y: gate.y, z: gate.z + 1 }, { x: gate.x, y: gate.y, z: gate.z + 2 }), null);
  // Endpoints are outside the frame, but the swept midpoint goes through its opening.
  assert.equal(assessGatePassage(gate, { x: gate.x - 6, y: gate.y, z: gate.z - 2 }, { x: gate.x + 6, y: gate.y, z: gate.z + 2 }), 'cleared');
});

test('higher wind changes computed gate outcomes rather than assigning a score', () => {
  const settings = { ...DEFAULT_SETTINGS, wind: 12 };
  const state = fly(settings);
  assert.equal(state.cleared, COURSE.length);
  assert.equal(state.ghostCleared, 0);
  assert.ok(state.ghostHits + state.ghostMissed === COURSE.length);
  assert.ok(getTelemetry(state, settings).ghostRmsError > 3);
});

test('gate clearance includes visible support posts and base feet beneath the opening', () => {
  const gate = COURSE[0];
  const parts = gateObstacleBoxes(gate);
  assert.equal(parts.filter(part => part.kind === 'frame').length, 4);
  assert.equal(parts.filter(part => part.kind === 'support').length, 2);
  assert.equal(parts.filter(part => part.kind === 'foot').length, 2);
  const passage = (x, y) => assessGatePassage(gate, { x, y, z: gate.z - 1 }, { x, y, z: gate.z + 1 });
  for (const support of parts.filter(part => part.kind === 'support')) {
    assert.equal(passage(support.x, DRONE_RADIUS), 'hit', 'grounded drone can strike the support post');
    assert.equal(passage(support.x, support.y), 'hit');
  }
  const foot = parts.find(part => part.kind === 'foot' && part.x > gate.x);
  // Clear of the narrow support itself, but close enough to overlap the base.
  assert.equal(passage(foot.x + 0.65, DRONE_RADIUS), 'hit');
  assert.equal(passage(gate.x, DRONE_RADIUS), 'missed', 'space between supports remains a missed opening, not a phantom collision');
  // An inflated bounding box would incorrectly report contact at this empty corner.
  assert.equal(passage(gate.x + gate.width / 2 + FRAME_THICKNESS + 0.5, gate.y + gate.height / 2 + FRAME_THICKNESS + 0.5), 'missed');
});

test('low-thrust crosswind regression records actual right support contact', () => {
  const settings = { ...DEFAULT_SETTINGS, wind: 9, payload: 25, motor: 55 };
  const state = createSimulation();
  while (state.z < COURSE[0].z) stepSimulation(state, settings, STEP);
  assert.ok(Math.abs(state.drone.x - 3.159) < 0.03);
  assert.equal(state.drone.y, DRONE_RADIUS);
  assert.equal(state.gates[0], 'hit');
  assert.equal(state.hits, 1);
});

test('added load and reduced motor authority are estimated and compensated within limits', () => {
  const settings = { ...DEFAULT_SETTINGS, wind: 5, payload: 40, motor: 75 };
  const state = fly(settings);
  const telemetry = getTelemetry(state, settings);
  assert.equal(state.cleared, COURSE.length);
  assert.equal(state.groundContacts, 0);
  assert.ok(state.drone.correctionY > 7, 'load and reduced motors require upward compensation');
  assert.ok(telemetry.thrust > 0.7, 'extra weight requires more throttle');
  assert.ok(telemetry.rmsError < telemetry.ghostRmsError * 0.2);
});

test('excess load with weak motors saturates thrust and can fail the course', () => {
  const settings = { ...DEFAULT_SETTINGS, wind: 12, payload: 50, motor: 55 };
  const state = fly(settings);
  const telemetry = getTelemetry(state, settings);
  assert.equal(telemetry.thrust, 1);
  assert.equal(telemetry.saturated, true);
  assert.ok(state.groundContacts > 0);
  assert.ok(state.cleared < COURSE.length);
  assert.equal(state.drone.y, DRONE_RADIUS);
  for (const drone of [state.drone, state.ghost]) {
    for (const key of ['x', 'y', 'z', 'vx', 'vy', 'roll', 'pitch', 'thrust']) assert.ok(Number.isFinite(drone[key]));
  }
});

test('reset, integration and completion are deterministic with bounded history', () => {
  const a = fly();
  const b = fly();
  assert.deepEqual(a, b);
  const snapshot = structuredClone(a);
  stepSimulation(a, DEFAULT_SETTINGS, 1 / 60);
  assert.deepEqual(a, snapshot, 'completed flights must not keep advancing');
  assert.equal(triggerGust(a), false);
  assert.ok(a.trail.length <= 220 && a.ghostTrail.length <= 220);
  const clean = createSimulation();
  assert.equal(clean.z, 0);
  assert.equal(clean.status, 'ready');
  assert.equal(clean.gustRemaining, 0);
  assert.deepEqual(clean.gates, COURSE.map(() => 'pending'));
  assert.equal(clean.trail.length, 1);
});

test('fixed-step subdivision matches 60 Hz calls with 120 Hz calls', () => {
  const a = createSimulation();
  const b = createSimulation();
  for (let i = 0; i < 1200; i += 1) stepSimulation(a, DEFAULT_SETTINGS, 1 / 120);
  for (let i = 0; i < 600; i += 1) stepSimulation(b, DEFAULT_SETTINGS, 1 / 60);
  assert.deepEqual(a, b);
});
