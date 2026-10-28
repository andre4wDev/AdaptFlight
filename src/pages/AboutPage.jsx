import { useState } from 'react';
import Arrow from '../components/Arrow.jsx';
import { teamMembers } from '../data/team.js';

function TeamPhoto({ member, number }) {
  const [failed, setFailed] = useState(false);
  const hasPhoto = member.photo && !failed;
  return (
    <div className={`team-photo team-photo-${number % 4}`}>
      {hasPhoto ? <img src={`${import.meta.env.BASE_URL}${member.photo}`} alt={member.alt || `Portrait of ${member.name}`} loading="lazy" width="600" height="660" onError={() => setFailed(true)} /> : <div className="photo-placeholder"><svg width="96" height="96" viewBox="0 0 96 96" fill="none" aria-hidden="true"><circle cx="48" cy="35" r="16" stroke="currentColor" strokeWidth="1.3"/><path d="M17 82c2-20 14-29 31-29s29 9 31 29" stroke="currentColor" strokeWidth="1.3"/><path d="M8 27V8h19m42 0h19v19M8 69v19h19m42 0h19V69" stroke="currentColor" strokeWidth="1" opacity=".5"/></svg><span className="mono">{failed ? 'PHOTO UNAVAILABLE' : 'TEAM PHOTO'}</span></div>}
      <span className="photo-number mono">{String(number + 1).padStart(2, '0')} / AF</span>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <section className="container about-hero" aria-labelledby="about-heading"><div><p className="eyebrow"><span className="tiny-plus">+</span> About AdaptFlight</p><h1 id="about-heading">The people<br/>behind the path<span className="heading-period">.</span></h1></div><div className="about-intro"><p className="lead">A small team of engineers.<br/>One shared question.</p><p>How can flight software respond better when conditions change? We're bringing together software, simulation, interface design, and testing to explore that idea.</p><p>We're starting with a focused class prototype, learning as we build, and making our work easy to understand.</p></div></section>

      <section className="container team-section" aria-labelledby="team-heading"><div className="team-heading-row"><h2 id="team-heading">Meet our team</h2><span className="mono">THE FOUNDING TEAM / {String(teamMembers.length).padStart(2, '0')} MEMBERS</span></div><div className="team-grid">{teamMembers.map((member, index) => <article className="team-card" key={member.id || `member-${index}`}><TeamPhoto key={member.photo} member={member} number={index}/><div className="team-card-copy"><p className="team-role mono">{member.role}</p><h3>{member.name}</h3><p>{member.bio}</p></div></article>)}</div></section>

      <section className="team-story"><div className="container team-story-inner"><div><p className="eyebrow">Why we started</p><h2>A good simulation<br/>made us curious.</h2></div><div><p className="lead">A drone can follow a path in a simulation. Our question is what happens when the conditions change.</p><p>That question became AdaptFlight. We want to explore how AI could help a drone adjust, then use what we learn to decide how the idea should grow. Our first step is a clear, testable prototype that people can interact with.</p><a className="button button-dark" href="#/products">Explore our product <Arrow /></a></div></div></section>
    </>
  );
}
