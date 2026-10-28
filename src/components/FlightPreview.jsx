import { useEffect, useMemo, useRef, useState } from 'react';

// These paths are deliberately scripted drawings. They are not flight physics,
// AI output, or evidence of product performance.
const WIND_NAMES = ['Calm', 'Light', 'Moderate', 'Strong'];
const WIND_AMOUNTS = [0, 17, 34, 53];
const SAMPLE_COUNT = 140;
const DURATION_MS = 8500;
const PLANNED_PATH = 'M32 142 Q250 79 468 142';
const GRID_PATH = 'M32 38H468 M32 82H468 M32 126H468 M32 170H468 M32 214H468 M32 38V214 M119 38V214 M206 38V214 M293 38V214 M380 38V214 M468 38V214';

function pathData(points) {
  return points.map((point, index) =>
    `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`
  ).join(' ');
}

function makePoints(windIndex, correction) {
  return Array.from({ length: SAMPLE_COUNT + 1 }, (_, index) => {
    const t = index / SAMPLE_COUNT;
    const plannedY = 142 - 126 * t * (1 - t);
    // Both panels share the same scripted condition. The smaller offset in the
    // second panel illustrates the proposed behavior, not a measured benefit.
    const bend = Math.sin(Math.PI * t);
    const offset = WIND_AMOUNTS[windIndex] * bend * (
      0.75 * Math.sin(3.6 * Math.PI * t) + 0.38 * Math.sin(1.4 * Math.PI * t)
    );
    return { x: 32 + 436 * t, y: plannedY + offset * correction };
  });
}

function progressShape(points, progress) {
  const step = Math.min(SAMPLE_COUNT, Math.floor(progress * SAMPLE_COUNT));
  const fraction = progress * SAMPLE_COUNT - step;
  const current = points[step];
  const next = points[Math.min(step + 1, SAMPLE_COUNT)];
  const position = {
    x: current.x + (next.x - current.x) * fraction,
    y: current.y + (next.y - current.y) * fraction,
  };
  return { position, trail: pathData([...points.slice(0, step + 1), position]) };
}

function FlightPanel({ adapted, points, progress, windIndex }) {
  const key = adapted ? 'after' : 'before';
  const color = adapted ? '#c7f36b' : '#edb29e';
  const { position, trail } = progressShape(points, progress);
  const description = windIndex === 0
    ? `Calm conditions: the scripted ${adapted ? 'green' : 'coral'} path follows the dashed planned path. This is an illustration, not a measured flight.`
    : adapted
      ? `The same ${WIND_NAMES[windIndex].toLowerCase()} wind setting is selected. A scripted green path stays closer to the same dashed planned path to illustrate the proposed corrections. This is not an AI result.`
      : `${WIND_NAMES[windIndex]} wind is selected. A scripted coral path drifts from the dashed planned path. This is an illustration, not a measured flight.`;

  return (
    <section className="flight-panel" aria-labelledby={`preview-${key}-heading`}>
      <div className="flight-heading">
        <h3 id={`preview-${key}-heading`}>
          {adapted ? 'With proposed adaptation' : 'Without proposed adaptation'}
        </h3>
        <span className="mono">{adapted ? 'GREEN PATH' : 'CORAL PATH'}</span>
      </div>
      <svg
        className="flight-chart"
        viewBox="0 0 500 250"
        role="img"
        aria-labelledby={`preview-${key}-title preview-${key}-description`}
      >
        <title id={`preview-${key}-title`}>
          {adapted ? 'A scripted path illustrating the proposed corrections' : 'A scripted path without the proposed corrections'}
        </title>
        <desc id={`preview-${key}-description`}>{description}</desc>
        <path d={GRID_PATH} fill="none" stroke="#e9eee9" strokeOpacity="0.07" strokeWidth="1" aria-hidden="true" />
        <path d={PLANNED_PATH} fill="none" stroke="#e9eee9" strokeOpacity="0.68" strokeWidth="2" strokeDasharray="6 7" />
        <path d={pathData(points)} fill="none" stroke={color} strokeOpacity="0.38" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d={trail} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <g transform={`translate(${position.x.toFixed(2)} ${position.y.toFixed(2)})`} aria-hidden="true">
          <circle r="10" fill="#18201d" stroke={color} strokeWidth="2" />
          <circle r="3.5" fill={color} />
        </g>
        <circle cx="468" cy="142" r="5" fill="none" stroke="#e9eee9" strokeOpacity="0.7" strokeWidth="1.5" />
        <g fill="#e9eee9" fillOpacity="0.65" fontSize="11" fontFamily="ui-monospace, monospace">
          <text x="32" y="236">START</text>
          <text x="468" y="236" textAnchor="end">FINISH</text>
        </g>
      </svg>
      <p>{adapted ? 'A closer path illustrates what we want to explore.' : 'The path shifts as the selected wind changes.'}</p>
    </section>
  );
}

export default function FlightPreview() {
  const [windIndex, setWindIndex] = useState(2);
  const [progress, setProgress] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [status, setStatus] = useState(() => reducedMotion
    ? 'The preview is paused. Reduced motion is preferred. Choose Play preview only if you want to animate the drawings.'
    : 'Choose a wind setting, then play the illustration. Both panels use the same setting.'
  );
  const progressRef = useRef(0);
  const routes = useMemo(() => ({
    before: makePoints(windIndex, 1),
    after: makePoints(windIndex, 0.19),
  }), [windIndex]);

  useEffect(() => {
    if (!isPlaying) return undefined;
    let frameId;
    let previousTime = null;

    function tick(time) {
      if (previousTime === null) previousTime = time;
      const next = Math.min(1, progressRef.current + (time - previousTime) / DURATION_MS);
      previousTime = time;
      progressRef.current = next;
      setProgress(next);
      if (next >= 1) {
        setIsPlaying(false);
        setStatus(`Preview complete. Both drawings used the ${WIND_NAMES[windIndex].toLowerCase()} wind setting. Choose Replay preview to view them again.`);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    }

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [isPlaying, windIndex]);

  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden && isPlaying) {
        setIsPlaying(false);
        setStatus('Preview paused because this tab was hidden. Choose Resume preview to continue.');
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, [isPlaying]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    function onMotionChange(event) {
      setReducedMotion(event.matches);
      if (event.matches && isPlaying) {
        setIsPlaying(false);
        setStatus('Preview paused after your motion preference changed. You can still choose Resume preview.');
      }
    }
    if (preference.addEventListener) {
      preference.addEventListener('change', onMotionChange);
      return () => preference.removeEventListener('change', onMotionChange);
    }
    preference.addListener(onMotionChange);
    return () => preference.removeListener(onMotionChange);
  }, [isPlaying]);

  function changeWind(event) {
    const nextWind = Number(event.target.value);
    setIsPlaying(false);
    progressRef.current = 0;
    setProgress(0);
    setWindIndex(nextWind);
    setStatus(`Both paths now use ${WIND_NAMES[nextWind].toLowerCase()} wind. Playback is reset and paused.`);
  }

  function togglePlayback() {
    if (isPlaying) {
      setIsPlaying(false);
      setStatus('Preview paused. Choose Resume preview to continue.');
      return;
    }
    if (progressRef.current >= 1) {
      progressRef.current = 0;
      setProgress(0);
    }
    setIsPlaying(true);
    setStatus(`Playing the illustration with ${WIND_NAMES[windIndex].toLowerCase()} wind in both panels.`);
  }

  function resetPreview() {
    setIsPlaying(false);
    progressRef.current = 0;
    setProgress(0);
    setStatus(`Preview reset to the start. The ${WIND_NAMES[windIndex].toLowerCase()} wind setting is unchanged.`);
  }

  const playLabel = isPlaying ? 'Pause preview'
    : progress >= 1 ? 'Replay preview'
      : progress > 0 ? 'Resume preview' : 'Play preview';

  return (
    <section className="preview-panel" id="flight-preview" aria-labelledby="preview-title" data-reduced-motion={reducedMotion}>
      <div className="preview-topline">
        <div>
          <p className="eyebrow">Interactive concept</p>
          <h2 id="preview-title">See the idea in motion.</h2>
        </div>
        <span className="mono">ONE SCENARIO · TWO PATHS</span>
      </div>
      <p className="preview-disclaimer" id="preview-disclaimer">Illustrative paths, not results from a trained AI model.</p>

      <div className="preview-controls">
        <div className="wind-control">
          <label htmlFor="preview-wind">
            Wind setting <output className="mono" id="preview-wind-label" htmlFor="preview-wind">{WIND_NAMES[windIndex]}</output>
          </label>
          <input
            id="preview-wind"
            type="range"
            min="0"
            max="3"
            step="1"
            value={windIndex}
            onChange={changeWind}
            aria-valuetext={WIND_NAMES[windIndex]}
            aria-describedby="preview-disclaimer"
          />
          <div className="mono" aria-hidden="true"><span>Calm</span><span>Strong</span></div>
        </div>
        <button className="button button-accent" id="preview-play" type="button" onClick={togglePlayback}>{playLabel}</button>
        <button className="button button-outline" id="preview-reset" type="button" onClick={resetPreview}>Reset</button>
      </div>

      <div className="comparison-grid">
        <FlightPanel adapted={false} points={routes.before} progress={progress} windIndex={windIndex} />
        <FlightPanel adapted points={routes.after} progress={progress} windIndex={windIndex} />
      </div>
      <div className="preview-bottomline">
        <span className="mono">DASHED LINE = PLANNED PATH</span>
        <p id="preview-status" role="status" aria-live="polite" aria-atomic="true">{status}</p>
      </div>
    </section>
  );
}
