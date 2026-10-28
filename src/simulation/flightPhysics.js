/**
 * Educational point-mass flight model, NOT an aircraft controller.
 * x/y motion is integrated from acceleration; forward speed is held constant.
 * Both drones share the path, feedback gains and disturbances. The adaptive
 * drone additionally estimates uncommanded acceleration from motion residuals.
 * Gates use swept clearance tests, not rigid-body collision/contact physics.
 */
export const COURSE = Object.freeze([
  { id: 1, x: 0, y: 4.8, z: 22, width: 6, height: 5 },
  { id: 2, x: -3.5, y: 6.2, z: 44, width: 6, height: 5 },
  { id: 3, x: 3.6, y: 5.0, z: 68, width: 6, height: 5 },
  { id: 4, x: -2.8, y: 7.0, z: 94, width: 6, height: 5 },
  { id: 5, x: 3.2, y: 4.6, z: 120, width: 6, height: 5 },
  { id: 6, x: 0, y: 5.5, z: 148, width: 6, height: 5 },
].map(Object.freeze));

export const FINISH_Z = 165;
export const DEFAULT_SETTINGS = Object.freeze({ wind: 6, payload: 0, motor: 100, adaptive: true });
export const DRONE_RADIUS = 0.55;
export const FRAME_THICKNESS = 0.3;

const SPEED = 5.2;
const GRAVITY = 9.81;
const MAX_THRUST = 24;
const KP = 2.4;
const KD = 3.1;
const DRAG = 0.15;
const ESTIMATOR_TIME = 0.5;
const GUST_SECONDS = 3.2;
const anchors = [{ x: 0, y: 4.8, z: 0 }, ...COURSE, { x: 0, y: 5.5, z: FINISH_Z }];
const clamp = (value, low, high) => Math.min(high, Math.max(low, value));

/** C2-continuous course centerline. Derivatives are with respect to z. */
export function routeAt(z) {
  const distance = clamp(Number.isFinite(z) ? z : 0, 0, FINISH_Z);
  let index = 0;
  while (index < anchors.length - 2 && distance > anchors[index + 1].z) index += 1;
  const a = anchors[index];
  const b = anchors[index + 1];
  const length = b.z - a.z;
  const t = (distance - a.z) / length;
  const ease = t * t * t * (10 + t * (-15 + 6 * t));
  const first = 30 * t * t * (1 - t) * (1 - t) / length;
  const second = 60 * t * (1 - 3 * t + 2 * t * t) / (length * length);
  return {
    x: a.x + (b.x - a.x) * ease,
    y: a.y + (b.y - a.y) * ease,
    z: distance,
    dx: (b.x - a.x) * first,
    dy: (b.y - a.y) * first,
    d2x: (b.x - a.x) * second,
    d2y: (b.y - a.y) * second,
  };
}

function makeDrone() {
  return {
    x: 0, y: 4.8, z: 0, vx: 0, vy: 0, roll: 0, pitch: -0.05,
    thrust: GRAVITY / MAX_THRUST, correctionX: 0, correctionY: 0,
    estimateX: 0, estimateY: 0, ax: 0, ay: 0, grounded: false,
    saturated: false, contactUntil: 0,
  };
}

export function createSimulation() {
  return {
    time: 0, z: 0, drone: makeDrone(), ghost: makeDrone(),
    trail: [{ x: 0, y: 4.8, z: 0 }], ghostTrail: [{ x: 0, y: 4.8, z: 0 }],
    trailClock: 0,
    gates: COURSE.map(() => 'pending'), ghostGates: COURSE.map(() => 'pending'),
    hits: 0, ghostHits: 0, cleared: 0, ghostCleared: 0,
    missed: 0, ghostMissed: 0, groundContacts: 0, ghostGroundContacts: 0,
    status: 'ready', gustRemaining: 0, gustStartedAt: null,
    event: { id: 0, text: 'Ready for takeoff. Change conditions at any point during the flight.' },
    forces: { wind: 0, gust: 0, windSpeed: 0 },
    metrics: { errorIntegral: 0, ghostErrorIntegral: 0, maxError: 0, ghostMaxError: 0 },
  };
}

function emit(state, text) {
  state.event = { id: state.event.id + 1, text };
}

export function triggerGust(state) {
  if (state.status === 'complete' || state.gustRemaining > 0) return false;
  state.gustRemaining = GUST_SECONDS;
  state.gustStartedAt = state.time;
  emit(state, 'Sudden gust injected. Watch the drift, counter-tilt and recovery.');
  return true;
}

function settingsFor(input) {
  const number = (key, low, high) => clamp(Number.isFinite(input?.[key]) ? input[key] : DEFAULT_SETTINGS[key], low, high);
  return {
    wind: number('wind', 0, 12),
    payload: number('payload', 0, 50),
    motor: number('motor', 55, 100),
    adaptive: input?.adaptive !== false,
  };
}

function disturbance(state, settings) {
  // Deterministic, smoothly changing wind; no randomness or scripted position.
  const windSpeed = settings.wind * (1 + 0.1 * Math.sin(state.time * 0.7) + 0.06 * Math.sin(state.time * 1.9));
  const gustAge = state.gustStartedAt === null ? 0 : state.time - state.gustStartedAt;
  const gustEnvelope = state.gustRemaining > 0
    ? clamp(gustAge / 0.12, 0, 1) * clamp(state.gustRemaining / 0.5, 0, 1)
    : 0;
  const gust = 6.8 * gustEnvelope;
  return { wind: 0.07 * windSpeed * Math.abs(windSpeed) + gust, gust, windSpeed };
}

/** Shared obstacle dimensions for rendering and clearance checks. */
export function gateObstacleBoxes(gate) {
  const parts = [];
  const thickness = FRAME_THICKNESS;
  const footHeight = Math.max(0.05, gate.y - gate.height / 2 - thickness);
  for (const side of [-1, 1]) {
    const sideX = gate.x + side * (gate.width / 2 + thickness / 2);
    parts.push(
      { kind: 'frame', x: sideX, y: gate.y, z: gate.z, width: thickness, height: gate.height + 2 * thickness, depth: 0.36 },
      { kind: 'frame', x: gate.x, y: gate.y + side * (gate.height / 2 + thickness / 2), z: gate.z, width: gate.width, height: thickness, depth: 0.36 },
      { kind: 'support', x: sideX, y: footHeight / 2, z: gate.z, width: 0.12, height: footHeight, depth: 0.12 },
      { kind: 'foot', x: sideX, y: 0.06, z: gate.z, width: 1, height: 0.12, depth: 1.4 },
    );
  }
  return parts;
}

function overlapsObstacle(x, y, obstacle) {
  // Circle/rectangle distance avoids counting empty space at outer corners as
  // contact, while retaining the model's conservative drone clearance radius.
  const gapX = Math.max(0, Math.abs(x - obstacle.x) - obstacle.width / 2);
  const gapY = Math.max(0, Math.abs(y - obstacle.y) - obstacle.height / 2);
  return gapX * gapX + gapY * gapY <= DRONE_RADIUS * DRONE_RADIUS;
}

/**
 * Determine clearance where a swept drone center crosses a gate plane.
 * A complete miss is distinct from contact with the frame, supports or feet.
 */
export function assessGatePassage(gate, from, to) {
  if (from.z >= gate.z || to.z < gate.z || to.z <= from.z) return null;
  const fraction = (gate.z - from.z) / (to.z - from.z);
  const x = from.x + (to.x - from.x) * fraction;
  const y = from.y + (to.y - from.y) * fraction;
  const dx = Math.abs(x - gate.x);
  const dy = Math.abs(y - gate.y);
  if (dx <= gate.width / 2 - DRONE_RADIUS && dy <= gate.height / 2 - DRONE_RADIUS) return 'cleared';
  return gateObstacleBoxes(gate).some(obstacle => overlapsObstacle(x, y, obstacle)) ? 'hit' : 'missed';
}

function advanceDrone(body, target, forces, settings, adaptive, dt) {
  const mass = 1 + settings.payload / 100;
  const effectiveness = settings.motor / 100;
  body.correctionX = adaptive ? -body.estimateX || 0 : 0;
  body.correctionY = adaptive ? -body.estimateY || 0 : 0;
  const nominalX = target.d2x * SPEED * SPEED + KP * (target.x - body.x)
    + KD * (target.dx * SPEED - body.vx) + DRAG * target.dx * SPEED + body.correctionX;
  const nominalY = GRAVITY + target.d2y * SPEED * SPEED + KP * (target.y - body.y)
    + KD * (target.dy * SPEED - body.vy) + DRAG * target.dy * SPEED + body.correctionY;
  const requestedY = Math.max(0, nominalY);
  const requestedThrust = Math.hypot(nominalX, requestedY);
  const scale = Math.min(1, MAX_THRUST / Math.max(requestedThrust, 0.001));
  const commandX = nominalX * scale;
  const commandY = requestedY * scale;
  const actualX = commandX * effectiveness / mass + forces.wind / mass - DRAG * body.vx;
  const actualY = commandY * effectiveness / mass - GRAVITY - DRAG * body.vy;
  body.ax = actualX;
  body.ay = actualY;

  // Innovation uses observed motion minus commanded nominal acceleration.
  // Unknown wind, load, and actuator loss enter the residual; the controller
  // does not read those settings to select its compensation.
  const residualX = actualX - (commandX - DRAG * body.vx);
  const residualY = actualY - (commandY - GRAVITY - DRAG * body.vy);
  const learning = 1 - Math.exp(-dt / ESTIMATOR_TIME);
  body.estimateX += learning * (clamp(residualX, -18, 18) - body.estimateX);
  body.estimateY += learning * (clamp(residualY, -18, 18) - body.estimateY);

  body.vx += actualX * dt;
  body.vy += actualY * dt;
  body.x += body.vx * dt;
  body.y += body.vy * dt;
  body.z = target.z + SPEED * dt;
  body.roll = -Math.atan2(commandX, Math.max(commandY, 0.1));
  body.pitch = -0.05 + clamp(body.vy * 0.035, -0.16, 0.16);
  body.thrust = clamp(requestedThrust / MAX_THRUST, 0, 1);
  body.saturated = requestedThrust > MAX_THRUST + 0.01;
  const groundContact = body.y < DRONE_RADIUS && !body.grounded;
  if (body.y < DRONE_RADIUS) {
    body.y = DRONE_RADIUS;
    body.vy = Math.max(0, body.vy);
    body.grounded = true;
  } else if (body.y > DRONE_RADIUS + 0.03) {
    body.grounded = false;
  }
  return groundContact;
}

function registerPassages(state, body, previous, ghost) {
  const outcomes = ghost ? state.ghostGates : state.gates;
  COURSE.forEach((gate, index) => {
    if (outcomes[index] !== 'pending') return;
    const outcome = assessGatePassage(gate, previous, body);
    if (!outcome) return;
    outcomes[index] = outcome;
    if (outcome === 'cleared') {
      state[ghost ? 'ghostCleared' : 'cleared'] += 1;
      if (!ghost) emit(state, `Gate ${gate.id} cleared. ${state.cleared} of ${COURSE.length} openings passed cleanly.`);
    } else if (outcome === 'hit') {
      state[ghost ? 'ghostHits' : 'hits'] += 1;
      body.contactUntil = state.time + 0.65;
      if (!ghost) emit(state, `Obstacle contact at gate ${gate.id}. The drone did not have enough clearance.`);
    } else {
      state[ghost ? 'ghostMissed' : 'missed'] += 1;
      if (!ghost) emit(state, `Gate ${gate.id} missed. The drone passed outside the opening without touching the obstacle.`);
    }
  });
}

function advance(state, settings, dt) {
  if (state.status === 'complete') return;
  state.status = 'flying';
  const h = Math.min(dt, (FINISH_Z - state.z) / SPEED);
  const target = routeAt(state.z);
  state.forces = disturbance(state, settings);
  const previous = { x: state.drone.x, y: state.drone.y, z: state.z };
  const ghostPrevious = { x: state.ghost.x, y: state.ghost.y, z: state.z };
  const touchedGround = advanceDrone(state.drone, target, state.forces, settings, settings.adaptive, h);
  const ghostTouchedGround = advanceDrone(state.ghost, target, state.forces, settings, false, h);
  state.time += h;
  state.z = Math.min(FINISH_Z, state.z + SPEED * h);
  state.drone.z = state.z;
  state.ghost.z = state.z;
  state.gustRemaining = Math.max(0, state.gustRemaining - h);
  if (touchedGround) {
    state.groundContacts += 1;
    emit(state, 'Ground contact. Available thrust could not maintain altitude.');
  }
  if (ghostTouchedGround) state.ghostGroundContacts += 1;
  registerPassages(state, state.drone, previous, false);
  registerPassages(state, state.ghost, ghostPrevious, true);

  const nextTarget = routeAt(state.z);
  const error = Math.hypot(state.drone.x - nextTarget.x, state.drone.y - nextTarget.y);
  const ghostError = Math.hypot(state.ghost.x - nextTarget.x, state.ghost.y - nextTarget.y);
  state.metrics.errorIntegral += error * error * h;
  state.metrics.ghostErrorIntegral += ghostError * ghostError * h;
  state.metrics.maxError = Math.max(state.metrics.maxError, error);
  state.metrics.ghostMaxError = Math.max(state.metrics.ghostMaxError, ghostError);
  state.trailClock += h;
  if (state.trailClock >= 0.1 || state.z >= FINISH_Z - 1e-8) {
    state.trailClock %= 0.1;
    state.trail.push({ x: state.drone.x, y: state.drone.y, z: state.z });
    state.ghostTrail.push({ x: state.ghost.x, y: state.ghost.y, z: state.z });
    if (state.trail.length > 220) state.trail.shift();
    if (state.ghostTrail.length > 220) state.ghostTrail.shift();
  }
  if (state.z >= FINISH_Z - 1e-8) {
    state.z = FINISH_Z;
    state.status = 'complete';
    emit(state, `Flight complete: ${state.cleared} of ${COURSE.length} gates cleared, ${state.hits} obstacle contacts, ${state.missed} missed gates${state.groundContacts ? `, ${state.groundContacts} ground contacts` : ''}.`);
  }
}

/** Deterministic integration, subdivided to at most 1/120 s for stability. */
export function stepSimulation(state, settings, dt) {
  if (!Number.isFinite(dt) || dt <= 0 || state.status === 'complete') return state;
  const config = settingsFor(settings);
  let remaining = Math.min(dt, 0.1);
  while (remaining > 1e-9 && state.status !== 'complete') {
    const step = Math.min(remaining, 1 / 120);
    advance(state, config, step);
    remaining -= step;
  }
  return state;
}

export function getTelemetry(state, settings = DEFAULT_SETTINGS) {
  const config = settingsFor(settings);
  const target = routeAt(state.z);
  const nextIndex = state.gates.findIndex(status => status === 'pending');
  const forces = state.time ? state.forces : disturbance(state, config);
  return {
    error: Math.hypot(state.drone.x - target.x, state.drone.y - target.y),
    ghostError: Math.hypot(state.ghost.x - target.x, state.ghost.y - target.y),
    rmsError: state.time ? Math.sqrt(state.metrics.errorIntegral / state.time) : 0,
    ghostRmsError: state.time ? Math.sqrt(state.metrics.ghostErrorIntegral / state.time) : 0,
    windForce: forces.wind, // newtons for the nominal 1 kg model
    windSpeed: forces.windSpeed, // m/s, before the injected force gust
    correction: Math.hypot(state.drone.correctionX, state.drone.correctionY), // m/s²
    correctionX: state.drone.correctionX,
    correctionY: state.drone.correctionY,
    thrust: state.drone.thrust, // normalized commanded throttle, 0..1
    saturated: state.drone.saturated,
    speed: state.status === 'flying' ? SPEED : 0,
    progress: state.z / FINISH_Z,
    nextGate: nextIndex === -1 ? null : COURSE[nextIndex].id,
    nextGateDistance: nextIndex === -1 ? null : COURSE[nextIndex].z - state.z,
    altitude: state.drone.y,
    target,
  };
}
