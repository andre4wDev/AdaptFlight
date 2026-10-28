// An original SVG illustration, not a photograph or an aircraft design.
export default function DroneVisual() {
  return (
    <figure className="drone-visual">
      <div className="visual-topline mono"><span>AF / CONCEPT 01</span><span className="signal-dot">SIMULATION FIRST</span></div>
      <svg className="drone-art" viewBox="0 0 620 470" role="img" aria-labelledby="drone-title drone-desc">
        <title id="drone-title">A drone following an illustrated flight path</title>
        <desc id="drone-desc">A four-rotor drone appears above a grid. A curved green path represents the idea of adapting a flight to changing conditions.</desc>
        <defs>
          <pattern id="hero-grid" width="42" height="42" patternUnits="userSpaceOnUse"><path d="M42 0H0v42" fill="none" stroke="#b8c4b7" strokeWidth="0.6" /></pattern>
          <linearGradient id="drone-body" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#718073"/><stop offset="0.55" stopColor="#29372e"/><stop offset="1" stopColor="#121c17"/></linearGradient>
          <linearGradient id="drone-arm" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#304034"/><stop offset="0.5" stopColor="#5c6b5c"/><stop offset="1" stopColor="#28362b"/></linearGradient>
          <radialGradient id="rotor-fill"><stop stopColor="#809480" stopOpacity="0.15"/><stop offset="0.8" stopColor="#2d4432" stopOpacity="0.04"/><stop offset="1" stopColor="#526b51" stopOpacity="0.2"/></radialGradient>
          <filter id="soft-shadow" x="-60%" y="-100%" width="220%" height="300%"><feGaussianBlur stdDeviation="13"/></filter>
        </defs>
        <g transform="translate(20 80) skewY(-12) scale(1 .72)"><rect width="580" height="450" fill="url(#hero-grid)" opacity=".7"/></g>
        <ellipse cx="310" cy="347" rx="139" ry="32" fill="#273a2a" opacity=".15" filter="url(#soft-shadow)"/>
        <path d="M-20 420C105 415 65 322 205 331S383 400 452 306s25-134 172-139" fill="none" stroke="#809579" strokeDasharray="6 7" strokeWidth="1.5"/>
        <path d="M-20 420C104 418 103 359 210 353S385 351 444 293s77-90 174-102" fill="none" stroke="#547639" strokeWidth="3"/>
        <circle cx="444" cy="293" r="6" fill="#537737" stroke="#e6edde" strokeWidth="4"/>
        <path d="M53 126h77m-62 12h47m-34 12h67" stroke="#758772" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="m124 121 6 5-6 5m18 14 6 5-6 5" fill="none" stroke="#758772" strokeWidth="1.5"/>
        <g transform="translate(310 218) rotate(-17)">
          <path d="M-123-60 123 60M-123 60 123-60" stroke="#1d2a22" strokeWidth="21" strokeLinecap="round"/>
          <path d="M-123-65 123 55M-123 55 123-65" stroke="url(#drone-arm)" strokeWidth="17" strokeLinecap="round"/>
          <path d="m-17 15-15 74m49-74 15 74" stroke="#314334" strokeWidth="8" strokeLinecap="round"/>
          <path d="M-43 88h24m0 0M21 88h23" stroke="#223427" strokeWidth="6" strokeLinecap="round"/>
          {[[-123, -65], [123, -65], [-123, 55], [123, 55]].map(([x,y],i) => (
            <g key={i} transform={`translate(${x} ${y})`}>
              <ellipse rx="76" ry="40" fill="url(#rotor-fill)" stroke="#637d61" strokeOpacity=".7"/>
              <ellipse rx="67" ry="34" fill="none" stroke="#748c70" strokeOpacity=".24" strokeDasharray="34 10"/>
              <path d="M-59-12Q-28-24 0-5q31 1 59 17Q30 24 0 5q-35-3-59-17" fill="#2e4232" opacity=".85"/>
              <ellipse rx="10" ry="6" cy="4" fill="#142119"/>
              <ellipse rx="9" ry="5" fill="#b5c4a9"/>
              <circle r="2.6" fill="#28372b"/>
            </g>
          ))}
          <path d="M-37-40q37-19 74 0l10 70q-47 38-94 0Z" fill="#15251b"/>
          <path d="M-37-47q37-19 74 0l10 70q-47 38-94 0Z" fill="url(#drone-body)" stroke="#85917d" strokeWidth="1"/>
          <path d="M-23-35q23-11 46 0l5 41q-28 17-56 0Z" fill="#24382a" stroke="#667a5e"/>
          <path d="M-14-20h28" stroke="#c7f36b" strokeWidth="3" strokeLinecap="round"/>
          <circle cy="35" r="10" fill="#15231b" stroke="#6f8267"/>
          <circle cy="35" r="5" fill="#7da49a"/>
          <circle cy="33" cx="-1" r="2" fill="#deeadc"/>
        </g>
        <g stroke="#748a6f" strokeWidth="1" fill="none"><path d="M421 124h60l25-24"/><circle cx="421" cy="124" r="3"/><path d="M190 271h-70l-22 25"/><circle cx="190" cy="271" r="3"/></g>
        <g fontFamily="monospace" fontSize="10" fill="#4b6148" letterSpacing="1"><text x="459" y="91">SENSE</text><text x="59" y="314">ADAPT</text><text x="449" y="334">STAY ON COURSE</text></g>
        <path d="M26 393v16h16m536-336h16v16" fill="none" stroke="#8b9b82" strokeWidth="1"/>
      </svg>
      <figcaption><span className="mono">MULTIROTOR / SOFTWARE CONCEPT</span><span className="visual-caption">Small adjustments.<br/>A bigger idea.</span></figcaption>
    </figure>
  );
}
