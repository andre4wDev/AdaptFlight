import Arrow from '../components/Arrow.jsx';
import { coreValues, researchedCompanies, valuesResearch } from '../data/missions.js';
import '../careers.css';

function ResearchCard({ company, index, children }) {
  return (
    <li className="research-card">
      <div className="research-card-top"><span className="mono">{String(index + 1).padStart(2, '0')} / {company.focus.toUpperCase()}</span></div>
      <h4>{company.name}</h4>
      {children}
      <p className="research-lesson"><span className="mono">WHAT WE TOOK</span>{company.lesson}</p>
      <a className="text-link" href={company.url} target="_blank" rel="noopener noreferrer">Visit {company.name}<span className="visually-hidden"> (opens in a new tab)</span> <Arrow diagonal /></a>
    </li>
  );
}

export default function MissionPage() {
  return (
    <>
      <section className="container mission-hero" aria-labelledby="mission-heading">
        <p className="eyebrow"><span className="tiny-plus">+</span> Our mission</p>
        <h1 id="mission-heading" className="mission-statement">To make autonomous flight <span>dependable in the real world</span> by building AI that helps drones adapt as conditions change<span className="heading-period">.</span></h1>
        <p className="mission-support">Simulations are predictable. The sky is not. AdaptFlight exists to close the gap between how a drone flies in testing and how it flies once wind, payload, and hardware stop behaving as planned.</p>
      </section>

      <section className="container section values-section" aria-labelledby="values-heading">
        <div className="section-heading">
          <div><p className="eyebrow">Core values</p><h2 id="values-heading">How we work,<br/>and what we believe.</h2></div>
          <p>These values guide how every AdaptFlight team member makes decisions, from writing flight software to talking with customers.</p>
        </div>
        <ol className="values-grid">{coreValues.map((value, index) => <li className="step" key={value.title}><span className="step-number mono">{String(index + 1).padStart(2, '0')}</span><h3>{value.title}</h3><p>{value.text}</p></li>)}</ol>
      </section>

      <section className="team-story"><div className="container team-story-inner"><div><p className="eyebrow">Build it with us</p><h2>A mission needs<br/>more than engineers.</h2></div><div><p className="lead">We're growing beyond our founding team to bring AdaptFlight to the people who need it.</p><p>Our first open role helps connect our technology with customers, partners, and investors.</p><a className="button button-dark" href="#/careers">View open roles <Arrow /></a></div></div></section>

      <section className="research-section" aria-labelledby="research-heading">
        <div className="container">
          <div className="section-heading">
            <div><p className="eyebrow">Our research</p><h2 id="research-heading">The companies<br/>that shaped ours.</h2></div>
            <p>Before writing our mission statement and core values, we studied how aerospace, autonomy, and technology companies describe theirs. Each one taught us something about saying more with fewer words.</p>
          </div>

          <h3 className="research-subheading" id="mission-research-heading">Mission statements we researched</h3>
          <ol className="research-list" aria-labelledby="mission-research-heading">
            {researchedCompanies.map((company, index) => <ResearchCard company={company} index={index} key={company.name}><blockquote>“{company.mission}”</blockquote></ResearchCard>)}
          </ol>

          <h3 className="research-subheading" id="values-research-heading">Core values we researched</h3>
          <ol className="research-list" aria-labelledby="values-research-heading">
            {valuesResearch.map((company, index) => <ResearchCard company={company} index={index} key={company.name}><ul className="value-tags">{company.values.map((value) => <li key={value}>{value}</li>)}</ul></ResearchCard>)}
          </ol>
        </div>
      </section>
    </>
  );
}
