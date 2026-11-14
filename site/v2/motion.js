/* Each scene is a timeline controlled by native scroll position, in both directions. */
(() => {
  const root = document.documentElement;
  const header = document.querySelector('.header');
  const hero = document.querySelector('.hero');
  const heroStage = document.querySelector('.hero-stage');
  const thread = document.querySelector('.thread');
  const chapters = [...document.querySelectorAll('.chapter')];
  const sections = [...document.querySelectorAll('main > section[data-theme]')];
  const chapterNav = document.querySelector('.chapter-nav');
  const chapterLinks = [...chapterNav.querySelectorAll('a')];
  const toggle = document.querySelector('.motion-toggle');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const compactLayout = matchMedia('(max-width: 900px), (max-height: 679px)');
  const clamp = value => Math.min(1, Math.max(0, value));
  const range = (value, start, end) => clamp((value - start) / (end - start));
  const smooth = value => value * value * (3 - 2 * value);
  let preference = null;
  let pending = false;
  let enabled = true;
  try { preference = localStorage.getItem('portfolio-v2-motion'); } catch { /* Storage is optional. */ }
  // A preview link can explicitly opt into motion for this visit without changing OS settings.
  const requestedMotion = new URLSearchParams(location.search).get('motion');
  if (requestedMotion === 'on' || requestedMotion === 'off') preference = requestedMotion;
  const tracks = chapters.map(chapter => ({
    chapter,
    track: chapter.querySelector('.visual-track'),
    stage: chapter.querySelector('.motion-stage')
  }));
  const set = (element, property, value) => element.style.setProperty(property, value.toFixed(4));

  function update() {
    pending = false;
    const height = innerHeight;
    const total = document.documentElement.scrollHeight - height;
    set(root, '--page-progress', total > 0 ? clamp(scrollY / total) : 0);
    const heroBox = hero.getBoundingClientRect();
    const heroDistance = heroBox.height - heroStage.offsetHeight;
    const heroProgress = enabled ? clamp(-heroBox.top / Math.max(height * .45, heroDistance)) : 0;
    set(root, '--hero-progress', heroProgress);
    let active = -1;
    tracks.forEach(({ chapter, track, stage }, index) => {
      const box = chapter.getBoundingClientRect();
      let progress;
      if (compactLayout.matches) {
        const trackBox = track.getBoundingClientRect();
        const stickyTop = parseFloat(getComputedStyle(stage).top) || header.offsetHeight + 18;
        // Start when the ARTWORK reaches its sticky position, not when preceding copy enters.
        progress = clamp((stickyTop - trackBox.top) / Math.max(1, trackBox.height - stage.offsetHeight));
      } else {
        progress = clamp(-box.top / Math.max(1, box.height - height));
      }
      if (!enabled) progress = 1;
      set(chapter, '--chapter-progress', progress);
      set(chapter, '--phase', progress);
      set(chapter, '--assemble', smooth(range(progress, 0, .88)));
      set(chapter, '--reveal-one', smooth(range(progress, .04, .42)));
      set(chapter, '--reveal-two', smooth(range(progress, .28, .68)));
      set(chapter, '--reveal-three', smooth(range(progress, .52, .94)));
      if (box.top <= height * .5 && box.bottom > height * .5) active = index;
    });
    chapterLinks.forEach((link, index) => {
      if (index === active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    chapterNav.classList.toggle('is-visible', active !== -1);
    chapterNav.classList.toggle('is-dark', active === 0);
    const current = sections.find(section => {
      const box = section.getBoundingClientRect();
      return box.top <= header.offsetHeight / 2 && box.bottom > header.offsetHeight / 2;
    });
    header.classList.toggle('is-dark', current?.dataset.theme === 'forest');
    const threadBox = thread.getBoundingClientRect();
    set(thread, '--thread-progress', enabled ? clamp((height - threadBox.top) / (height + threadBox.height * .3)) : 1);
  }
  function schedule() {
    if (pending) return;
    pending = true;
    requestAnimationFrame(update);
  }
  function measure() {
    for (const { track, stage } of tracks) {
      track.style.setProperty('--stage-height', Math.ceil(stage.getBoundingClientRect().height) + 'px');
    }
    schedule();
  }
  function applyPreference() {
    enabled = preference === 'on' || (preference !== 'off' && !reducedMotion.matches);
    root.classList.toggle('motion', enabled);
    root.classList.toggle('motion-reduced', !enabled);
    toggle.hidden = false;
    toggle.textContent = enabled ? 'Motion on' : 'Motion off';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.setAttribute('aria-label', enabled ? 'Turn scroll animation off' : 'Turn scroll animation on');
    measure();
  }
  toggle.addEventListener('click', () => {
    preference = enabled ? 'off' : 'on';
    try { localStorage.setItem('portfolio-v2-motion', preference); } catch { /* Optional. */ }
    applyPreference();
  });
  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', measure, { passive: true });
  addEventListener('pageshow', measure);
  reducedMotion.addEventListener('change', applyPreference);
  compactLayout.addEventListener('change', measure);
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(measure);
    tracks.forEach(({ stage }) => observer.observe(stage));
  }
  applyPreference();
  update();
})();
