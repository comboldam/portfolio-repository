/* The portfolio works without JavaScript. This adds a quiet section indicator. */
const navLinks = [...document.querySelectorAll('.site-header nav a[href^="#"]')];
if ('IntersectionObserver' in window && navLinks.length) {
  const targets = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        for (const link of navLinks) {
          if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        }
      }
    }
  }, {rootMargin: '-10% 0px -60% 0px', threshold: 0});
  targets.forEach(target => observer.observe(target));
}
