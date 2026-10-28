import { useCallback, useEffect, useRef, useState } from 'react';
import { COURSE, DEFAULT_SETTINGS, createSimulation, getTelemetry, stepSimulation, triggerGust } from '../simulation/flightPhysics.js';
import './FlightPreview.css';

const PRESETS = [
  { name: 'Crosswind', wind: 6, payload: 0, motor: 100 },
  { name: 'Calm air', wind: 0, payload: 0, motor: 100 },
  { name: 'Heavy load', wind: 5, payload: 40, motor: 75 },
];
const FIXED_STEP = 1 / 120;
const initialMessage = 'Start the flight, then change the conditions. The drone will try to hold its route through the gates.';
const number = (value, decimals = 1) => Number.isFinite(value) ? value.toFixed(decimals) : '0';

function PlayIcon({ paused }) {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">{paused ? <path d="M3 2h3v12H3zm7 0h3v12h-3z" /> : <path d="M4 2v12l10-6z" />}</svg>;
}

function RangeControl({ name, id, value, min, max, unit, low, high, onChange }) {
  return <div className="sim-range">
    <label htmlFor={id}><span>{name}</span><output htmlFor={id}>{value}<span> {unit}</span></output></label>
    <input id={id} type="range" min={min} max={max} step="1" value={value} aria-valuetext={`${value} ${unit}`} onChange={event => onChange(Number(event.target.value))} style={{ '--range-fill': `${(value - min) / (max - min) * 100}%` }} />
    <div className="sim-range-ends" aria-hidden="true"><span>{low}</span><span>{high}</span></div>
  </div>;
}

function snapshot(state, settings) {
  return { ...getTelemetry(state, settings), time: state.time, status: state.status, gates: [...state.gates], ghostGates: [...state.ghostGates], cleared: state.cleared, ghostCleared: state.ghostCleared, hits: state.hits, ghostHits: state.ghostHits, groundContacts: state.groundContacts, grounded: state.drone.grounded, gustRemaining: state.gustRemaining, altitude: state.drone.y };
}

export default function FlightPreview() {
  const [settings, setSettings] = useState({ ...DEFAULT_SETTINGS });
  const settingsRef = useRef(settings);
  const simulationRef = useRef(null);
  if (!simulationRef.current) simulationRef.current = createSimulation();
  const [view, setView] = useState(() => snapshot(simulationRef.current, settings));
  const [isPlaying, setIsPlaying] = useState(false);
  const [showGhost, setShowGhost] = useState(true);
  const [cameraMode, setCameraMode] = useState('chase');
  const [sceneReady, setSceneReady] = useState(false);
  const [sceneError, setSceneError] = useState('');
  const [status, setStatus] = useState(initialMessage);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const containerRef = useRef(null);
  const rendererRef = useRef(null);
  const optionsRef = useRef({ showGhost, cameraMode });
  const lastEventRef = useRef(simulationRef.current.event?.id);

  const publish = useCallback(() => {
    const state = simulationRef.current;
    setView(snapshot(state, settingsRef.current));
    if (state.event && state.event.id !== lastEventRef.current) {
      lastEventRef.current = state.event.id;
      if (state.event.text) setStatus(state.event.text);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    // The rest of the company website stays usable while the 3D engine loads.
    import('../simulation/flightScene.js').then(({ createFlightScene }) => {
      if (cancelled) return;
      const scene = createFlightScene(containerRef.current, { onError: () => {
        if (!cancelled) {
          setIsPlaying(false);
          setSceneError('The 3D view is unavailable. Reload the page or try a browser with WebGL 2 enabled.');
        }
      } });
      if (!scene) throw new Error('3D scene could not start');
      rendererRef.current = scene;
      scene.render(simulationRef.current, settingsRef.current, optionsRef.current);
      setSceneReady(true);
    }).catch(() => {
      if (!cancelled) setSceneError('The 3D view could not load. Reload the page or try a browser with WebGL 2 enabled.');
    });
    return () => {
      cancelled = true;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  useEffect(() => {
    settingsRef.current = settings;
    optionsRef.current = { showGhost, cameraMode };
    rendererRef.current?.render(simulationRef.current, settings, optionsRef.current);
  }, [settings, showGhost, cameraMode, sceneReady]);

  useEffect(() => {
    if (!isPlaying || !sceneReady || sceneError) return undefined;
    let frameId;
    let previousTime;
    let accumulator = 0;
    let lastUpdate = 0;
    function animate(now) {
      if (previousTime === undefined) previousTime = now;
      // Fixed steps keep the physics independent of display refresh rate.
      accumulator += Math.min((now - previousTime) / 1000, 0.1);
      previousTime = now;
      while (accumulator >= FIXED_STEP && simulationRef.current.status !== 'complete') {
        stepSimulation(simulationRef.current, settingsRef.current, FIXED_STEP);
        accumulator -= FIXED_STEP;
      }
      rendererRef.current?.render(simulationRef.current, settingsRef.current, optionsRef.current);
      if (now - lastUpdate >= 100 || simulationRef.current.status === 'complete') {
        publish();
        lastUpdate = now;
      }
      if (simulationRef.current.status === 'complete') {
        setIsPlaying(false);
        setStatus(`${simulationRef.current.event.text} Replay to try different conditions.`);
        return;
      }
      frameId = requestAnimationFrame(animate);
    }
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [isPlaying, sceneReady, sceneError, publish]);

  useEffect(() => {
    function visibilityChanged() {
      if (document.hidden && isPlaying) {
        setIsPlaying(false);
        setStatus('Flight paused while this tab was hidden. Resume whenever you are ready.');
      }
    }
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function motionChanged(event) {
      setReducedMotion(event.matches);
      if (event.matches) {
        setIsPlaying(false);
        setStatus('Flight paused to respect your motion preference. Start it again only if you want animation.');
      }
    }
    document.addEventListener('visibilitychange', visibilityChanged);
    motion.addEventListener('change', motionChanged);
    return () => {
      document.removeEventListener('visibilitychange', visibilityChanged);
      motion.removeEventListener('change', motionChanged);
    };
  }, [isPlaying]);

  function changeSetting(key, value) {
    const next = { ...settingsRef.current, [key]: value };
    settingsRef.current = next;
    setSettings(next);
    publish();
    if (key === 'adaptive') setStatus(value ? 'Adaptive compensation enabled. The controller will estimate and counter disturbances.' : 'Adaptive compensation disabled. The drone is using its basic route controller.');
  }

  function resetFlight(nextSettings = settingsRef.current) {
    setIsPlaying(false);
    simulationRef.current = createSimulation();
    settingsRef.current = nextSettings;
    lastEventRef.current = simulationRef.current.event?.id;
    setSettings(nextSettings);
    publish();
    rendererRef.current?.render(simulationRef.current, nextSettings, optionsRef.current);
    setStatus('Course reset. Both drones start from the same position and experience the same conditions.');
  }

  function togglePlayback() {
    if (isPlaying) {
      setIsPlaying(false);
      setStatus('Flight paused. Adjust a condition or resume the flight.');
      return;
    }
    if (simulationRef.current.status === 'complete') {
      simulationRef.current = createSimulation();
      lastEventRef.current = simulationRef.current.event?.id;
      publish();
    }
    setIsPlaying(true);
    setStatus('Flight running. Change the wind or add a gust to see the controller respond.');
  }

  function addGust() {
    triggerGust(simulationRef.current);
    publish();
    setStatus('Sudden gust applied to both drones. Watch the lateral drift and corrective bank.');
  }

  const complete = view.status === 'complete';
  const playLabel = isPlaying ? 'Pause flight' : complete ? 'Replay flight' : view.time > 0 ? 'Resume flight' : 'Start flight';
  const progress = Math.max(0, Math.min(100, (view.progress || 0) * 100));
  const activePreset = PRESETS.find(preset => ['wind', 'payload', 'motor'].every(key => preset[key] === settings[key]));
  const modeLabel = complete ? 'Flight complete' : view.time === 0 ? 'Ready to fly' : !isPlaying ? 'Flight paused' : view.grounded ? 'Ground contact' : view.saturated ? 'Thrust limit' : !settings.adaptive ? 'Basic control' : view.gustRemaining > 0 ? 'Countering gust' : view.error > 0.5 ? 'Correcting drift' : 'Holding route';

  return <section className="flight-lab" id="flight-preview" aria-labelledby="flight-lab-title">
    <div className="sim-header">
      <div><p className="eyebrow"><span className="sim-live-dot" /> Interactive flight lab</p><h3 id="flight-lab-title">You change the conditions.<br className="sim-mobile-break" /> It finds its balance.</h3></div>
      <span className="sim-model-label mono">SIMULATION / 01</span>
    </div>

    <div className="sim-layout">
      <div className="sim-main">
        <div className="sim-viewport">
          <div ref={containerRef} className="sim-canvas" />
          <div className="sim-scene-top"><span className="sim-scene-tag">ADAPTFLIGHT TEST RANGE</span><span className={`sim-control-status ${!settings.adaptive ? 'is-basic' : ''}`}><i />{modeLabel}</span></div>
          <div className="sim-scene-readout" aria-hidden="true"><span>{number(view.altitude)} <small>m ALT</small></span><span>{number(view.speed)} <small>m/s FWD</small></span></div>
          <div className="sim-view-switch" role="group" aria-label="Camera view"><button type="button" aria-pressed={cameraMode === 'chase'} onClick={() => setCameraMode('chase')}>Chase cam</button><button type="button" aria-pressed={cameraMode === 'overview'} onClick={() => setCameraMode('overview')}>Course view</button></div>
          {(!sceneReady || sceneError) && <div className="sim-scene-message" role="status"><strong>{sceneError ? '3D view unavailable' : 'Preparing the course…'}</strong><p>{sceneError || 'Setting up the drone and flight environment.'}</p></div>}
          {sceneReady && !sceneError && view.time === 0 && <div className="sim-start-hint"><span className="mono">READY FOR TAKEOFF</span><p>Six gates. Changing conditions. One flight path.</p></div>}
          {complete && <div className="sim-result"><span className="mono">FLIGHT COMPLETE</span><strong>{view.cleared}<small> / {COURSE.length} gates cleared</small></strong><p>{view.hits} obstacle contacts · {view.gates.filter(gate => gate === 'missed').length} missed gates{view.groundContacts > 0 && ` · ${view.groundContacts} ground contacts`}</p><p>Basic control: {view.ghostCleared}/{COURSE.length} gates · {view.ghostHits} obstacle contacts</p></div>}
          <div className="sim-scene-legend"><span><i className="legend-adaptive" />Your drone</span>{showGhost && <span><i className="legend-baseline" />Basic control</span>}<span className="legend-route"><i />Planned route</span></div>
        </div>

        <div className="sim-transport">
          <button className="button button-accent sim-play" type="button" onClick={togglePlayback} disabled={!sceneReady || !!sceneError}><PlayIcon paused={isPlaying} />{playLabel}</button>
          <button className="sim-reset" type="button" onClick={() => resetFlight()} aria-label="Reset flight"><svg viewBox="0 0 20 20" width="18" height="18" fill="none" aria-hidden="true"><path d="M4 7a7 7 0 1 1-1 6M4 2v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg><span>Reset</span></button>
          <div className="sim-course-progress"><div><span className="mono">COURSE PROGRESS</span><span>{number(view.time, 0)}s <span aria-hidden="true">/</span> {view.cleared}/{COURSE.length} gates</span></div><div className="sim-progress-track" role="progressbar" aria-label="Course progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}><i style={{ width: `${progress}%` }} /></div></div>
        </div>

        <div className="sim-telemetry" aria-label="Live simulation telemetry">
          <div><span className="sim-metric-label">Your path error</span><strong>{number(view.error, 2)}<small> m</small></strong><span className="sim-metric-note">Distance from planned route</span></div>
          <div className="sim-baseline-metric"><span className="sim-metric-label">Basic control error</span><strong>{number(view.ghostError, 2)}<small> m</small></strong><span className="sim-metric-note">Same flight, no compensation</span></div>
          <div><span className="sim-metric-label">Correction</span><strong>{number(settings.adaptive ? view.correction : 0)}<small> m/s²</small></strong><span className="sim-metric-note">Requested disturbance compensation</span></div>
        </div>
      </div>

      <aside className="sim-settings" aria-label="Flight conditions">
        <div className="sim-settings-heading"><h4>Make it unpredictable.</h4><p>Change these while the drone is flying.</p></div>
        <div className="sim-presets" role="group" aria-label="Scenario presets">{PRESETS.map(preset => <button type="button" key={preset.name} aria-pressed={activePreset?.name === preset.name} onClick={() => resetFlight({ ...settingsRef.current, wind: preset.wind, payload: preset.payload, motor: preset.motor })}>{preset.name}</button>)}</div>
        <RangeControl name="Crosswind" id="sim-wind" value={settings.wind} min={0} max={12} unit="m/s" low="Still air" high="Strong wind" onChange={value => changeSetting('wind', value)} />
        <RangeControl name="Added payload" id="sim-payload" value={settings.payload} min={0} max={50} unit="%" low="No extra load" high="Heavier drone" onChange={value => changeSetting('payload', value)} />
        <RangeControl name="Motor strength" id="sim-motor" value={settings.motor} min={55} max={100} unit="%" low="Reduced power" high="Full power" onChange={value => changeSetting('motor', value)} />
        <button className="sim-gust" type="button" onClick={addGust} disabled={!isPlaying || view.gustRemaining > 0}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true"><path d="M3 8h12a3 3 0 1 0-3-3M2 12h17a3 3 0 1 1-3 3M5 16h4a3 3 0 1 1-3 3" /></svg>{view.gustRemaining > 0 ? `Gust active · ${number(view.gustRemaining)}s` : 'Send a sudden gust'}<span aria-hidden="true">↗</span></button>
        <div className="sim-toggles"><label className="sim-toggle"><span><strong>Adaptive compensation</strong><small>Estimate disturbances and counter them</small></span><input type="checkbox" role="switch" checked={settings.adaptive} onChange={event => changeSetting('adaptive', event.target.checked)} /><i aria-hidden="true" /></label><label className="sim-ghost-toggle"><input type="checkbox" checked={showGhost} onChange={event => setShowGhost(event.target.checked)} /><span>Show comparison drone</span></label></div>
        <p className="sim-control-help">The coral drone follows the same route with basic feedback control. Only the green drone estimates and compensates for unexpected forces when adaptation is on.</p>
      </aside>
    </div>

    <div className="sim-flight-log"><span className="mono">FLIGHT LOG</span><p role="status" aria-live="polite" aria-atomic="true">{status}</p></div>
    <div className="sim-explainer"><p><strong>What you’re seeing:</strong> motion calculated from simplified forces and a feedback controller. Gate contacts are scored; the flight continues so you can compare recovery. This browser demo uses disturbance estimation, not trained AI or a validated flight model.</p>{reducedMotion && <p className="sim-motion-note">Reduced motion is enabled. Animation starts only when you choose to play the flight.</p>}</div>
  </section>;
}
