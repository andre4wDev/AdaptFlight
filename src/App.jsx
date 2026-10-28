import { useEffect, useRef, useState } from 'react';
import Brand from './components/Brand.jsx';
import Arrow from './components/Arrow.jsx';
import ProductsPage from './pages/ProductsPage.jsx';
import AboutPage from './pages/AboutPage.jsx';

// Hash routes keep shared links and refreshes working on GitHub Pages.
function readPage() {
  const route = window.location.hash.replace(/^#\/?/, '').replace(/\/$/, '');
  if (!route || route === 'products') return 'products';
  if (route === 'about') return 'about';
  return 'missing';
}

export default function App() {
  const [page, setPage] = useState(readPage);
  const mainRef = useRef(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const changePage = () => setPage(readPage());
    window.addEventListener('hashchange', changePage);
    return () => window.removeEventListener('hashchange', changePage);
  }, []);

  useEffect(() => {
    document.title = `AdaptFlight | ${page === 'about' ? 'About Us' : page === 'products' ? 'Products' : 'Page not found'}`;
    if (firstRender.current) { firstRender.current = false; return; }
    window.scrollTo({ top: 0, behavior: 'instant' });
    mainRef.current?.focus({ preventScroll: true });
  }, [page]);

  function skipToMain(event) {
    event.preventDefault();
    mainRef.current?.focus();
    mainRef.current?.scrollIntoView();
  }

  return (
    <>
      <a className="skip-link" href="#main-content" onClick={skipToMain}>Skip to content</a>
      <header className="site-header">
        <div className="header-inner container">
          <Brand />
          <nav className="main-nav" aria-label="Main navigation">
            <a href="#/products" aria-current={page === 'products' ? 'page' : undefined}>Products</a>
            <a href="#/about" aria-current={page === 'about' ? 'page' : undefined}>About Us</a>
          </nav>
          <span className="header-status"><span className="status-dot"/> Class prototype</span>
        </div>
      </header>
      <main id="main-content" ref={mainRef} tabIndex="-1">
        {page === 'products' && <ProductsPage />}
        {page === 'about' && <AboutPage />}
        {page === 'missing' && <section className="container missing-page"><p className="eyebrow">A different flight path</p><h1>Page not found.</h1><p>Head back to the product page to explore AdaptFlight.</p><a className="button button-dark" href="#/products">Back to Products <Arrow /></a></section>}
      </main>
      <footer className="site-footer">
        <div className="container footer-top"><Brand light /><p>Exploring a steadier way to fly.</p><a href="#/about" className="text-link">Meet the team <Arrow diagonal /></a></div>
        <div className="container footer-bottom"><p>© {new Date().getFullYear()} AdaptFlight. A student project.</p><p>Concept stage · Simulation first</p><nav aria-label="Footer navigation"><a href="#/products">Products</a><a href="#/about">About Us</a></nav></div>
      </footer>
    </>
  );
}
