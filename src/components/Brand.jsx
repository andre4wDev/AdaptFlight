export default function Brand({ light = false }) {
  return (
    <a className={`brand${light ? ' brand-light' : ''}`} href="#/products" aria-label="AdaptFlight products">
      <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
        <path d="M4 29 20 4l16 25H26l-6-10-6 10Z" fill="currentColor" />
        <path d="M15 35h10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <span>AdaptFlight<span className="brand-period">.</span></span>
    </a>
  );
}
