import Arrow from '../components/Arrow.jsx';
import DroneVisual from '../components/DroneVisual.jsx';
import FlightPreview from '../components/FlightPreview.jsx';

const steps = [
  { number: '01', title: 'Set the scene.', text: 'Choose a simulated flight and change the wind, added weight, or motor performance.' },
  { number: '02', title: 'Compare the paths.', text: 'Run the same conditions with and without the proposed AI corrections, then compare the paths.' },
  { number: '03', title: 'Learn from the flight.', text: 'Review where the drone went, what changed, and what needs more work.' },
];

export default function ProductsPage() {
  function explorePreview() {
    const section = document.getElementById('concept-preview');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    section?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    section?.focus({ preventScroll: true });
  }
  return (
    <>
      <section className="container product-hero" aria-labelledby="product-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="tiny-plus">+</span> AI flight adaptation</p>
          <h1 id="product-title">Flight changes.<br/><span>Let's adapt.</span></h1>
          <p className="hero-description">Wind shifts. Weight changes. A perfect simulation meets an imperfect world. We're exploring software that helps drones adjust.</p>
          <div className="hero-actions"><button className="button button-dark" onClick={explorePreview}>Explore the concept <Arrow /></button><a className="text-link" href="#/about">Meet the team <Arrow diagonal /></a></div>
          <div className="hero-note"><span className="status-dot"/> Starting with a simulated drone.</div>
        </div>
        <DroneVisual />
      </section>

      <div className="scope-strip"><div className="container scope-strip-inner"><span className="mono">ONE IDEA. THREE CHANGING CONDITIONS.</span><span>Wind <span aria-hidden="true">↗</span></span><span>Added weight <span aria-hidden="true">+</span></span><span>Motor performance <span aria-hidden="true">↻</span></span></div></div>

      <section className="container section product-intro" aria-labelledby="what-heading">
        <div><p className="eyebrow">01 / The product</p><h2 id="what-heading">A flight plan is<br/>only the beginning.</h2></div>
        <div className="intro-copy"><p className="lead">AdaptFlight is our idea for an AI system that helps drones respond to changing flight conditions.</p><p>Our first prototype focuses on a simulated civilian drone with multiple rotors. The proposed software would compare its planned path with how it is moving, then adjust motor power and the drone's angle within the simulator's limits.</p><p>We're starting with small commercial drone development teams and robotics labs. Our longer-term idea could also be useful to inspection operators who need consistent flight paths in changing conditions.</p></div>
      </section>

      <section className="preview-section" id="concept-preview" tabIndex="-1" aria-labelledby="preview-heading">
        <div className="container"><div className="section-heading preview-section-heading"><div><p className="eyebrow">02 / A look at the idea</p><h2 id="preview-heading">Same wind.<br/><span>A different response.</span></h2></div><p>Change the wind and play the preview to see what we want to explore. These paths illustrate the concept; they aren't test results.</p></div><FlightPreview /></div>
      </section>

      <section className="container section" aria-labelledby="workflow-heading">
        <div className="section-heading"><div><p className="eyebrow">03 / Inside the planned prototype</p><h2 id="workflow-heading">From conditions<br/>to comparisons.</h2></div><p>A browser dashboard will bring the flight scenario, controls, and results into one place.</p></div>
        <div className="steps-grid">{steps.map(step => <article className="step" key={step.number}><span className="step-number mono">{step.number}</span><h3>{step.title}</h3><p>{step.text}</p></article>)}</div>
        <div className="planned-features"><span className="mono">PLANNED DASHBOARD</span><span>Start / pause / reset</span><span>Planned & actual paths</span><span>Flight status & history</span></div>
      </section>

      <section className="container progress-section" aria-labelledby="progress-heading">
        <div className="progress-copy"><p className="eyebrow">Built around a focused first step</p><h2 id="progress-heading">Small prototype.<br/>Room to grow.</h2><p>We're working toward an interactive prototype and an investor demonstration. Our first version will help us explain the idea, compare simulated flights, and learn what future users need.</p><p>Using the system on physical aircraft would be a later project with more development and testing.</p><a className="text-link" href="#/about">Get to know the people behind it <Arrow diagonal /></a></div>
        <div className="progress-track"><div className="progress-row active"><span className="track-dot"/><div><span className="mono">OUR STARTING POINT</span><h3>Simulation & interface</h3><p>One virtual drone. One obstacle course.</p></div><span className="stage-label">First</span></div><div className="progress-row"><span className="track-dot"/><div><span className="mono">WHAT WE WANT TO LEARN</span><h3>Test & compare</h3><p>Review the same conditions with and without corrections.</p></div></div><div className="progress-row"><span className="track-dot"/><div><span className="mono">WHERE IT COULD GO</span><h3>Further research</h3><p>Use findings to decide what comes next.</p></div></div></div>
      </section>
    </>
  );
}
