import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Line2 } from 'three/addons/lines/Line2.js';
import { LineGeometry } from 'three/addons/lines/LineGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { COURSE, FINISH_Z, gateObstacleBoxes, routeAt } from './flightPhysics.js';

// Presentation only. Every drone pose, trail, and gate result comes from the
// simulation. Nothing in this renderer moves the drone along a canned path.
const COLORS = { lime: 0xc8f578, coral: 0xf2a183, orange: 0xeaac66, dark: 0x22362e, route: 0x1675ee, wind: 0xed9b24 };
const TRAIL_POINTS = 240;
const WIND_PARTICLES = 30;

function material(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.78, ...options });
}

function box(parent, width, height, depth, x, y, z, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// Combine unmoving scenery with the same material. This keeps the scene light
// on integrated graphics without reducing the course geometry or resolution.
function batchStaticMeshes(parent) {
  const groups = new Map();
  for (const mesh of [...parent.children]) {
    if (!mesh.isMesh || Array.isArray(mesh.material)) continue;
    const list = groups.get(mesh.material) || [];
    list.push(mesh);
    groups.set(mesh.material, list);
  }
  const oldGeometries = new Set();
  for (const [mat, meshes] of groups) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map(mesh => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach(geometry => geometry.dispose());
    if (!merged) continue;
    meshes.forEach(mesh => {
      oldGeometries.add(mesh.geometry);
      parent.remove(mesh);
    });
    parent.add(new THREE.Mesh(merged, mat));
  }
  oldGeometries.forEach(geometry => geometry.dispose());
}

function label(text, dark = false, accent = null) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 96;
  const context = canvas.getContext('2d');
  context.fillStyle = dark ? '#20342ce6' : '#e7eee4eb';
  context.fillRect(0, 0, 256, 96);
  context.strokeStyle = accent || (dark ? '#9bb787' : '#879b85');
  context.lineWidth = 3;
  context.strokeRect(2, 2, 252, 92);
  context.fillStyle = accent || (dark ? '#dcf4bd' : '#304936');
  context.font = '500 38px monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 128, 50);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthWrite: false, toneMapped: false, fog: false }));
  sprite.scale.set(2.5, 0.94, 1);
  return sprite;
}

function createDrone(color, ghost = false) {
  const group = new THREE.Group();
  // Outer propeller tips fit the physics model's 0.55 m collision radius.
  group.scale.setScalar(0.52);
  const body = material(ghost ? color : COLORS.dark, {
    transparent: ghost, opacity: ghost ? 0.45 : 1, depthWrite: !ghost,
    metalness: 0.2,
  });
  const accent = material(color, { emissive: color, emissiveIntensity: 0.25,
    transparent: ghost, opacity: ghost ? 0.5 : 1, depthWrite: !ghost });
  const black = material(ghost ? color : 0x14221e, {
    transparent: ghost, opacity: ghost ? 0.35 : 1, depthWrite: !ghost,
  });
  const propMaterial = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide,
    transparent: true, opacity: ghost ? 0.25 : 0.28, depthWrite: false });
  box(group, 0.52, 0.22, 0.68, 0, 0, 0, body);
  box(group, 0.34, 0.04, 0.39, 0, 0.135, -0.04, accent);
  box(group, 0.2, 0.12, 0.12, 0, -0.02, 0.39, black);
  box(group, 0.15, 0.045, 0.025, 0, 0.01, -0.35, accent);
  const props = [];
  const discs = [];
  for (const x of [-0.58, 0.58]) {
    for (const z of [-0.53, 0.53]) {
      const arm = box(group, 0.085, 0.075, 0.79, x / 2, -0.015, z / 2, body);
      arm.rotation.y = Math.atan2(x, z);
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.09, 0.16, 10), body);
      motor.position.set(x, 0.045, z);
      group.add(motor);
      const rotor = new THREE.Group();
      rotor.position.set(x, 0.15, z);
      box(rotor, 0.72, 0.015, 0.065, 0, 0, 0, accent);
      box(rotor, 0.065, 0.015, 0.72, 0, 0, 0, accent);
      group.add(rotor);
      props.push(rotor);
      const disc = new THREE.Mesh(new THREE.CircleGeometry(0.37, 24), propMaterial);
      disc.rotation.x = -Math.PI / 2;
      disc.position.set(x, 0.145, z);
      group.add(disc);
      discs.push(disc);
      box(group, 0.045, 0.25, 0.045, x * 0.52, -0.19, z * 0.65, black);
    }
  }
  for (const x of [-0.3, 0.3]) box(group, 0.04, 0.04, 0.7, x, -0.32, 0, black);
  return { group, props, discs, accent, body };
}

function wideLine(geometry, color, width, { opacity = 1, segments = false, outlineColor = 0x163a31, outlineWidth = width + 3, dashed = false } = {}) {
  const line = new THREE.Group();
  const common = { worldUnits: false, transparent: true, depthWrite: false, toneMapped: false, fog: false, alphaToCoverage: true, dashed, dashSize: 1.15, gapSize: 0.5 };
  const outer = new LineMaterial({ ...common, color: outlineColor, linewidth: outlineWidth, opacity: opacity * 0.8 });
  const inner = new LineMaterial({ ...common, color, linewidth: width, opacity });
  const LineClass = segments ? LineSegments2 : Line2;
  const outline = new LineClass(geometry, outer);
  const stroke = new LineClass(geometry, inner);
  outline.frustumCulled = false;
  stroke.frustumCulled = false;
  outline.renderOrder = 3;
  stroke.renderOrder = 4;
  line.add(outline, stroke);
  if (dashed) stroke.computeLineDistances();
  return { line, geometry, outline, stroke };
}

function createTrail(scene, color, opacity) {
  const geometry = new LineGeometry().setPositions(new Float32Array(TRAIL_POINTS * 3));
  geometry.instanceCount = 0;
  const trail = wideLine(geometry, color, 3.5, { opacity, outlineWidth: 6.5 });
  scene.add(trail.line);
  return trail;
}

function updateTrail(trail, points) {
  const count = Math.min(points?.length || 0, TRAIL_POINTS);
  const offset = Math.max(0, (points?.length || 0) - count);
  const buffer = trail.geometry.attributes.instanceStart.data;
  for (let i = 0; i < count - 1; i++) {
    const a = points[offset + i];
    const b = points[offset + i + 1];
    const k = i * 6;
    buffer.array[k] = a.x; buffer.array[k + 1] = a.y; buffer.array[k + 2] = a.z;
    buffer.array[k + 3] = b.x; buffer.array[k + 4] = b.y; buffer.array[k + 5] = b.z;
  }
  buffer.needsUpdate = true;
  trail.geometry.instanceCount = Math.max(0, count - 1);
}

function forceArrow(color) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, fog: false });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 1, 8), mat);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.38, 12), mat);
  shaft.rotation.z = -Math.PI / 2;
  tip.rotation.z = -Math.PI / 2;
  group.add(shaft, tip);
  return { group, setLength(length) {
    shaft.scale.y = Math.max(0.1, length - 0.3);
    shaft.position.x = (length - 0.3) / 2;
    tip.position.x = length - 0.19;
  } };
}

export function createFlightScene(container, { onError } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
  } catch (error) {
    onError?.('The 3D view needs WebGL. Try a current browser with graphics acceleration enabled.');
    return { render() {}, resize() {}, dispose() {} };
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.setAttribute('role', 'img');
  renderer.domElement.setAttribute('aria-label', 'Third-person drone flight through rectangular gates. Blue marks the planned route and next target; lime and coral show actual flight paths. Amber arrows show the wind direction and green arrows show the corrective force.');
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdce8df);
  scene.fog = new THREE.Fog(0xdce8df, 62, 190);
  const camera = new THREE.PerspectiveCamera(54, 1, 0.12, 350);
  scene.add(new THREE.HemisphereLight(0xf2fff4, 0x73836c, 2.4));
  const sun = new THREE.DirectionalLight(0xfff1d5, 3.0);
  sun.position.set(-35, 55, -20);
  scene.add(sun);

  const grass = material(0x8a9e87);
  const runway = material(0xa8b4a1);
  const dark = material(0x4c6553);
  const concrete = material(0xb8c3ad);
  const white = material(0xdce5d2);
  box(scene, 400, 0.2, 500, 0, -0.16, 100, grass);
  box(scene, 27, 0.08, FINISH_Z + 30, 0, 0, FINISH_Z / 2, runway);
  const grid = new THREE.GridHelper(FINISH_Z + 30, Math.round((FINISH_Z + 30) / 4), 0x657f6a, 0x95a48e);
  grid.position.set(0, 0.05, FINISH_Z / 2);
  grid.material.transparent = true;
  grid.material.opacity = 0.3;
  scene.add(grid);
  for (const side of [-1, 1]) {
    box(scene, 0.1, 0.04, FINISH_Z + 22, side * 12.8, 0.06, FINISH_Z / 2, white);
    for (let z = -5; z < FINISH_Z + 18; z += 9) {
      box(scene, 0.09, 1.15, 0.09, side * 16.8, 0.57, z, dark);
      box(scene, 0.055, 0.055, 9, side * 16.8, 0.95, z + 4.5, concrete);
    }
  }

  // Scenery remains outside the course; gate frames are the course obstacles.
  const treeTrunk = material(0x697b5c);
  const treeLeaves = [material(0x6e8e70), material(0x789679), material(0x5a7a62)];
  const treeCone = new THREE.ConeGeometry(2.5, 7, 6);
  for (let i = 0; i < 34; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (25 + (i * 7 % 22));
    const z = (i * 17 % 240) - 10;
    const size = 0.65 + (i % 5) * 0.14;
    box(scene, 0.35, 2, 0.35, x, 1, z, treeTrunk);
    const tree = new THREE.Mesh(treeCone, treeLeaves[i % treeLeaves.length]);
    tree.scale.setScalar(size);
    tree.position.set(x, 2 + 3.5 * size, z);
    scene.add(tree);
  }
  const mountainMat = material(0x9caf9a);
  for (let i = 0; i < 10; i++) {
    const mountain = new THREE.Mesh(new THREE.ConeGeometry(18 + i % 3 * 7, 16 + i % 4 * 9, 5), mountainMat);
    mountain.position.set((i - 4.5) * 32, 4, FINISH_Z + 65 + i % 3 * 13);
    mountain.rotation.y = i * 0.7;
    scene.add(mountain);
  }
  // Small observation pavilion and scale markers give the route a test-field setting.
  box(scene, 6.5, 3.3, 8, -24, 1.65, 26, concrete);
  box(scene, 7.2, 0.35, 8.8, -24, 3.45, 26, dark);
  box(scene, 0.04, 1.4, 6.2, -20.73, 2.1, 26, material(0x668e83, { metalness: 0.3 }));
  for (let z = 0; z <= FINISH_Z; z += 20) {
    box(scene, 1.6, 0.05, 0.13, -11.6, 0.08, z, white);
    const marker = label(`${z} m`);
    marker.position.set(-12.2, 0.8, z);
    marker.scale.multiplyScalar(0.68);
    scene.add(marker);
  }
  const startPad = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.05, 48), new THREE.MeshBasicMaterial({ color: 0xdcebcf, side: THREE.DoubleSide }));
  startPad.rotation.x = -Math.PI / 2;
  startPad.position.y = 0.09;
  scene.add(startPad);
  const startH = label('START');
  startH.position.set(-4.7, 0.8, 0);
  scene.add(startH);
  batchStaticMeshes(scene);

  const gateMeshes = COURSE.map((gate, index) => {
    const group = new THREE.Group();
    const frame = material(COLORS.orange, { emissive: 0xc57e34, emissiveIntensity: 0.08 });
    const trim = new THREE.MeshBasicMaterial({ color: 0xffe3ac });
    const thickness = 0.3;
    // One shared definition keeps every solid obstacle aligned with collision tests.
    for (const obstacle of gateObstacleBoxes(gate)) {
      box(group, obstacle.width, obstacle.height, obstacle.depth,
        obstacle.x - gate.x, obstacle.y - gate.y, obstacle.z - gate.z,
        obstacle.kind === 'frame' ? frame : dark);
    }
    for (const side of [-1, 1]) {
      box(group, 0.04, gate.height, 0.04, side * (gate.width / 2 + thickness * 0.65), 0, -0.2, trim);
    }
    batchStaticMeshes(group);
    const badge = label(`GATE ${String(index + 1).padStart(2, '0')}`, true);
    badge.position.set(0, gate.height / 2 + 1.0, 0);
    group.add(badge);
    group.position.set(gate.x, gate.y, gate.z);
    scene.add(group);
    return { group, frame, trim };
  });
  const finish = label('FINISH', true);
  finish.position.set(0, 7, FINISH_Z + 3);
  finish.scale.multiplyScalar(1.5);
  scene.add(finish);
  box(scene, 12, 0.05, 0.3, 0, 0.09, FINISH_Z, white);

  const routePoints = [];
  for (let z = 0; z <= FINISH_Z; z += 0.5) {
    const p = routeAt(z);
    routePoints.push(p.x, p.y, z);
  }
  const routeLine = wideLine(new LineGeometry().setPositions(routePoints), COLORS.route, 4, { outlineWidth: 7, outlineColor: 0x0c355e, dashed: true });
  scene.add(routeLine.line);
  const chevronPositions = [];
  for (let z = 7; z < FINISH_Z; z += 7) {
    const back = routeAt(z - 0.9);
    const tip = routeAt(z + 0.35);
    for (const side of [-1, 1]) chevronPositions.push(back.x + side * 0.48, back.y + 0.025, back.z, tip.x, tip.y + 0.025, tip.z);
  }
  const routeChevrons = wideLine(new LineSegmentsGeometry().setPositions(chevronPositions), COLORS.route, 3.5, { segments: true, outlineWidth: 6.5, outlineColor: 0x0c355e });
  const chevronBuffer = routeChevrons.geometry.attributes.instanceStart.data;
  scene.add(routeChevrons.line);
  const targetMarker = new THREE.Group();
  const targetCircle = [];
  for (let i = 0; i <= 48; i++) {
    const angle = i / 48 * Math.PI * 2;
    targetCircle.push(Math.cos(angle) * 0.72, Math.sin(angle) * 0.72, 0);
  }
  const targetRing = wideLine(new LineGeometry().setPositions(targetCircle), COLORS.route, 4, { outlineWidth: 7, outlineColor: 0x0c355e });
  const targetLabel = label('NEXT TARGET', true, '#72b6ff');
  targetLabel.position.y = 1.2;
  targetLabel.scale.set(2.3, 0.65, 1);
  targetMarker.add(targetRing.line, targetLabel);
  scene.add(targetMarker);

  const drone = createDrone(COLORS.lime);
  const ghost = createDrone(COLORS.coral, true);
  scene.add(drone.group, ghost.group);
  const droneTrail = createTrail(scene, COLORS.lime, 0.9);
  const ghostTrail = createTrail(scene, COLORS.coral, 0.7);
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.88, 24), new THREE.MeshBasicMaterial({ color: 0x263f32, transparent: true, opacity: 0.16, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.11;
  scene.add(shadow);

  // A few directional glyphs around the flight corridor show the airflow.
  // Screen-space widths keep these readable on mobile as well as desktop.
  const windGeometry = new LineSegmentsGeometry().setPositions(new Float32Array(WIND_PARTICLES * 3 * 6));
  const windBuffer = windGeometry.attributes.instanceStart.data;
  const windPositions = windBuffer.array;
  windGeometry.instanceCount = 0;
  const windLines = wideLine(windGeometry, COLORS.wind, 2.5, { segments: true, opacity: 0.8, outlineWidth: 4, outlineColor: 0x765018 });
  scene.add(windLines.line);

  const windArrow = forceArrow(COLORS.wind);
  const correctionArrow = forceArrow(COLORS.lime);
  scene.add(windArrow.group, correctionArrow.group);
  const desiredCamera = new THREE.Vector3();
  const desiredLook = new THREE.Vector3();
  const currentLook = new THREE.Vector3();
  const correctionDirection = new THREE.Vector3();
  const xDirection = new THREE.Vector3(1, 0, 0);
  let lastTime = null;
  let lastMode = null;
  let lastState = null;
  let lastSettings = null;
  let lastOptions = null;
  let disposed = false;
  let contextLost = false;
  let windPhase = 0;

  function resize() {
    if (disposed) return;
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (lastState) render(lastState, lastSettings, lastOptions);
  }

  function pose(model, flight, time, playing) {
    model.group.position.set(flight.x, Math.max(0.4, flight.y), flight.z);
    model.group.rotation.set(flight.pitch || 0, 0, flight.roll || 0);
    const contact = (flight.contactUntil || 0) > time;
    model.body.emissive.setHex(contact ? 0xe8653d : 0x000000);
    model.body.emissiveIntensity = contact ? 0.7 : 0;
    model.props.forEach((prop, index) => { prop.rotation.y = time * 95 * (index % 2 ? 1 : -1) + index; });
    model.discs.forEach(disc => { disc.visible = playing; });
  }

  function render(state, settings, options = {}) {
    if (disposed || contextLost) return;
    lastState = state;
    lastSettings = settings;
    lastOptions = options;
    const { showGhost = true, cameraMode = 'chase' } = options;
    const p = state.drone;
    const z = p.z;
    const time = state.time || 0;
    const advanced = lastTime === null ? 0 : Math.max(0, time - lastTime);
    const simulationReset = lastTime === null || time < lastTime;
    const reset = simulationReset || cameraMode !== lastMode;
    const playing = state.status === 'flying' && advanced > 0;
    pose(drone, p, time, playing);
    pose(ghost, state.ghost, time, playing);
    ghost.group.visible = showGhost;
    ghostTrail.line.visible = showGhost;
    updateTrail(droneTrail, state.trail);
    updateTrail(ghostTrail, state.ghostTrail);
    shadow.position.set(p.x, 0.11, z);
    shadow.scale.setScalar(1 + Math.max(0, p.y) * 0.045);
    gateMeshes.forEach((gate, index) => {
      const status = state.gates[index];
      const color = status === 'cleared' ? COLORS.lime : status === 'hit' ? 0xed896a : status === 'missed' ? 0x8b8f87 : COLORS.orange;
      gate.frame.color.setHex(color);
      gate.frame.emissive.setHex(color);
      gate.frame.emissiveIntensity = status === 'pending' ? 0.05 : 0.2;
      gate.trim.color.setHex(status === 'cleared' ? 0xe3ffc2 : 0xffe3ac);
    });
    const nextGateIndex = state.gates.findIndex(status => status === 'pending');
    targetMarker.visible = nextGateIndex !== -1;
    if (targetMarker.visible) {
      const targetGate = COURSE[nextGateIndex];
      targetMarker.position.set(targetGate.x, targetGate.y, targetGate.z - 0.22);
      targetRing.line.scale.setScalar(1 + Math.sin(time * 3) * 0.06);
    }
    // Only the next short stretch needs direction cues. Far-away chevrons
    // otherwise stack together at the horizon and obscure the gate openings.
    const firstChevron = Math.max(0, Math.ceil((z + 2) / 7) - 1);
    const lastChevron = Math.min(chevronPositions.length / 12 - 1, Math.floor((z + 35) / 7) - 1);
    const visibleChevrons = Math.max(0, lastChevron - firstChevron + 1);
    for (let i = 0; i < visibleChevrons * 12; i++) chevronBuffer.array[i] = chevronPositions[firstChevron * 12 + i];
    chevronBuffer.needsUpdate = true;
    routeChevrons.geometry.instanceCount = visibleChevrons * 2;
    const wind = Math.max(0, Number(settings.wind) || 0);
    // Gusts are additive force, not extra m/s. Their actual applied force only
    // controls the visual emphasis; base wind remains the selected condition.
    const gust = state.gustRemaining > 0 ? Math.max(0, state.forces?.gust || 0) : 0;
    const particleSpeed = wind * 0.65 + gust * 0.75;
    const hasWind = wind > 0 || gust > 0.01;
    if (simulationReset) windPhase = 0;
    // Integrate the phase rather than time * current speed, so changing the
    // setting does not teleport the airflow. No elapsed simulation time = no motion.
    windPhase = (windPhase + advanced * particleSpeed) % 28;
    windLines.line.visible = hasWind;
    const particleCount = hasWind ? Math.min(WIND_PARTICLES, Math.round(7 + wind * 1.2 + gust * 1.2)) : 0;
    const windLength = Math.min(3.4, 0.6 + wind * 0.16 + gust * 0.14);
    const route = routeAt(z);
    for (let i = 0; i < particleCount; i++) {
      const x = ((i * 7.73 + windPhase) % 28) - 14 + route.x;
      const y = Math.max(0.8, p.y - 2.1 + (i * 1.713 % 5.4));
      const particleZ = z - 3 + (i * 7.137 % 31);
      const tipX = x + windLength;
      const head = Math.min(0.45, 0.22 + windLength * 0.06);
      const k = i * 18;
      // Shaft and two arrowhead strokes, always pointing along world +X.
      windPositions[k] = x; windPositions[k + 1] = y; windPositions[k + 2] = particleZ;
      windPositions[k + 3] = tipX; windPositions[k + 4] = y; windPositions[k + 5] = particleZ;
      windPositions[k + 6] = tipX - head; windPositions[k + 7] = y + head * 0.65; windPositions[k + 8] = particleZ;
      windPositions[k + 9] = tipX; windPositions[k + 10] = y; windPositions[k + 11] = particleZ;
      windPositions[k + 12] = tipX - head; windPositions[k + 13] = y - head * 0.65; windPositions[k + 14] = particleZ;
      windPositions[k + 15] = tipX; windPositions[k + 16] = y; windPositions[k + 17] = particleZ;
    }
    windBuffer.needsUpdate = true;
    windGeometry.instanceCount = particleCount * 3;
    windLines.stroke.material.linewidth = gust > 0.1 ? 3.2 : 2.5;
    windLines.outline.material.linewidth = gust > 0.1 ? 5 : 4;
    windArrow.group.visible = hasWind;
    windArrow.group.position.set(p.x, p.y + 1.2, z);
    const forceLength = Math.min(3.8, 0.75 + wind * 0.15 + gust * 0.2);
    windArrow.setLength(forceLength);
    const correctionX = p.correctionX || 0;
    const correctionY = p.correctionY || 0;
    const correctionSize = Math.hypot(correctionX, correctionY);
    correctionArrow.group.visible = settings.adaptive && correctionSize > 0.08;
    if (correctionArrow.group.visible) {
      correctionDirection.set(correctionX, correctionY, 0).normalize();
      const length = Math.min(3.2, 0.55 + correctionSize * 0.3);
      correctionArrow.group.position.set(p.x, p.y + 0.55, z - 0.25);
      correctionArrow.group.quaternion.setFromUnitVectors(xDirection, correctionDirection);
      correctionArrow.setLength(length);
    }

    const ahead = routeAt(Math.min(FINISH_Z, z + 12));
    if (cameraMode === 'overview') {
      desiredCamera.set(route.x + 27, 24, z - 27);
      desiredLook.set(route.x, 3.0, z + 16);
    } else {
      // Follow the route with a little of the aircraft's lateral response, so
      // drift and correction stay visible instead of being canceled by camera motion.
      desiredCamera.set(route.x * 0.55 + p.x * 0.45 + 1.7, Math.max(2.8, p.y * 0.85 + route.y * 0.15 + 2.3), z - 6.3);
      desiredLook.set(p.x * 0.45 + ahead.x * 0.55, Math.max(1, p.y * 0.7 + ahead.y * 0.3), z + 9);
    }
    if (reset) {
      camera.position.copy(desiredCamera);
      currentLook.copy(desiredLook);
    } else if (advanced > 0) {
      const ease = 1 - Math.exp(-advanced * 6);
      camera.position.lerp(desiredCamera, ease);
      currentLook.lerp(desiredLook, ease);
    }
    camera.lookAt(currentLook);
    renderer.render(scene, camera);
    lastTime = time;
    lastMode = cameraMode;
  }

  function onContextLost(event) {
    event.preventDefault();
    contextLost = true;
    onError?.('The 3D graphics connection was interrupted. Reload the page to restore the flight view.');
  }
  renderer.domElement.addEventListener('webglcontextlost', onContextLost);
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  function dispose() {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    scene.traverse(object => {
      if (object.geometry) geometries.add(object.geometry);
      const objectMaterials = Array.isArray(object.material) ? object.material : object.material ? [object.material] : [];
      objectMaterials.forEach(mat => {
        materials.add(mat);
        if (mat.map) textures.add(mat.map);
      });
    });
    textures.forEach(texture => texture.dispose());
    materials.forEach(mat => mat.dispose());
    geometries.forEach(geometry => geometry.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  }

  return { render, resize, dispose };
}
