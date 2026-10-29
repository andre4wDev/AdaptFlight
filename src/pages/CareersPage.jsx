import Arrow from '../components/Arrow.jsx';
import { jobPostings, recruitingPolicies } from '../data/careers.js';
import '../careers.css';

// Hash routes own the URL hash, so in-page jumps scroll instead of linking.
function scrollToId(id) {
  const target = document.getElementById(id);
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  target?.focus({ preventScroll: true });
}

function JobList({ items, ordered = false }) {
  const List = ordered ? 'ol' : 'ul';
  return <List className={`job-list${ordered ? ' job-list-ordered' : ''}`}>{items.map((item) => <li key={item}>{item}</li>)}</List>;
}

function JobPosting({ job }) {
  const facts = [['Location', job.location], ['Workplace', job.workplace], ['Schedule', job.type], ['US hourly range', job.pay]];
  return (
    <article className="job-posting" id={job.id} tabIndex="-1" aria-labelledby={`${job.id}-title`}>
      <div className="job-posting-header">
        <p className="eyebrow"><span className="status-dot"/> Now hiring</p>
        <h2 id={`${job.id}-title`}>{job.title}</h2>
        <p className="job-meta mono">ADAPTFLIGHT · {job.location.toUpperCase()} · {job.workplace.toUpperCase()}</p>
      </div>
      <div className="job-layout">
        <div className="job-body">
          <section aria-labelledby={`${job.id}-about`}><h3 id={`${job.id}-about`}>About the role</h3>{job.about.map((text) => <p key={text}>{text}</p>)}</section>
          <section aria-labelledby={`${job.id}-do`}><h3 id={`${job.id}-do`}>What you'll do</h3><JobList items={job.responsibilities}/></section>
          <section aria-labelledby={`${job.id}-req`}><h3 id={`${job.id}-req`}>Required qualifications</h3><JobList items={job.required} ordered/></section>
          <section aria-labelledby={`${job.id}-pref`}><h3 id={`${job.id}-pref`}>Preferred qualifications</h3><JobList items={job.preferred}/></section>
          <section aria-labelledby={`${job.id}-pay`}><h3 id={`${job.id}-pay`}>US hourly range</h3><p className="job-pay">{job.pay}</p><p>{job.payNote}</p></section>
          <section aria-labelledby={`${job.id}-benefits`}><h3 id={`${job.id}-benefits`}>Benefits</h3><p>{job.benefitsIntro}</p><p>Our proposed opportunities include:</p><JobList items={job.benefits}/><p className="job-note">{job.equityNote}</p></section>
          <section className="job-apply" id={`${job.id}-apply`} tabIndex="-1" aria-labelledby={`${job.id}-how`}><h3 id={`${job.id}-how`}>How to apply</h3>{job.apply.map((text) => <p key={text}>{text}</p>)}</section>
          {recruitingPolicies.map((policy) => <section className="job-policy" key={policy.title}><h3>{policy.title}</h3><p>{policy.text}</p></section>)}
          <section className="job-why" aria-labelledby={`${job.id}-why`}><h3 id={`${job.id}-why`}>Team hiring decision and reasoning</h3>{job.whyWeAreHiring.map((text) => <p key={text}>{text}</p>)}</section>
          <section className="job-research" aria-labelledby={`${job.id}-research`}>
            <h3 id={`${job.id}-research`}>Job postings we researched</h3>
            <p>We studied these postings from aerospace, autonomy, and technology companies to shape this role and its description.</p>
            <ol className="posting-list">
              {job.researchPostings.filter((posting) => posting.url).map((posting) => (
                <li key={posting.url}>
                  <a href={posting.url} target="_blank" rel="noopener noreferrer"><span className="posting-company mono">{posting.company.toUpperCase()}</span><span className="posting-title">{posting.title}<span className="visually-hidden"> (opens in a new tab)</span></span><Arrow diagonal /></a>
                  {posting.note && <p>{posting.note}</p>}
                </li>
              ))}
            </ol>
          </section>
        </div>
        <aside className="job-sidebar" aria-label="Role summary">
          <dl>{facts.map(([label, value]) => <div key={label}><dt className="mono">{label.toUpperCase()}</dt><dd>{value}</dd></div>)}</dl>
          <button className="button button-accent" onClick={() => scrollToId(`${job.id}-apply`)}>How to apply <Arrow /></button>
        </aside>
      </div>
    </article>
  );
}

export default function CareersPage() {
  return (
    <>
      <section className="container about-hero" aria-labelledby="careers-heading">
        <div><p className="eyebrow"><span className="tiny-plus">+</span> Careers at AdaptFlight</p><h1 id="careers-heading">Help us take<br/>flight further<span className="heading-period">.</span></h1></div>
        <div className="about-intro"><p className="lead">Great flight software needs<br/>people who can share it.</p><p>We're a small, early-stage team building AI that helps drones adapt to changing conditions. Join us and contribute directly to our product, our strategy, and our first customer relationships.</p><a className="text-link careers-mission-link" href="#/mission">Read our mission <Arrow diagonal /></a></div>
      </section>

      <section className="container openings" aria-labelledby="openings-heading">
        <div className="team-heading-row"><h2 id="openings-heading">Open roles</h2><span className="mono">{String(jobPostings.length).padStart(2, '0')} OPEN {jobPostings.length === 1 ? 'POSITION' : 'POSITIONS'}</span></div>
        <ul className="opening-list">
          {jobPostings.map((job) => (
            <li key={job.id}><button className="opening-row" onClick={() => scrollToId(job.id)}><span className="opening-title">{job.title}</span><span className="opening-detail">{job.location} · {job.workplace}</span><span className="opening-detail">{job.type}</span><Arrow /></button></li>
          ))}
        </ul>
      </section>

      <div className="container job-postings">{jobPostings.map((job) => <JobPosting job={job} key={job.id}/>)}</div>
    </>
  );
}
