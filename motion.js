(function enhanceScrollMotion() {
  const elements = [...document.querySelectorAll('[data-reveal]')];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (!elements.length || reducedMotion.matches || !('IntersectionObserver' in window)) return;

  const pending = new Set();
  let observer;

  function reveal(element, immediately = false) {
    if (!pending.delete(element)) return;
    if (immediately) element.classList.remove('reveal-ready');
    else element.classList.add('is-revealed');
    observer.unobserve(element);
  }

  function revealAround(target) {
    if (!(target instanceof Element) || target === document.body || target === document.documentElement) return;
    pending.forEach((element) => {
      if (element.contains(target) || target.contains(element)) reveal(element, true);
    });
  }

  function revealHashTarget() {
    try {
      revealAround(document.getElementById(decodeURIComponent(window.location.hash.slice(1))));
    } catch {
      // A malformed fragment should not affect navigation or readable content.
    }
  }

  function finishMotion() {
    pending.forEach((element) => element.classList.remove('reveal-ready'));
    pending.clear();
    observer?.disconnect();
  }

  try {
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) reveal(entry.target);
      });
    }, { threshold: 0, rootMargin: '0px 0px -40px 0px' });

    elements.forEach((element) => {
      // Keep content already passed during a restored visit immediately readable.
      if (element.getBoundingClientRect().bottom <= 0) return;
      const delay = Number(element.dataset.revealDelay) || 0;
      element.style.setProperty('--reveal-delay', `${Math.min(240, Math.max(0, delay))}ms`);
      pending.add(element);
      element.classList.add('reveal-ready');
      observer.observe(element);
    });

    revealHashTarget();
    revealAround(document.activeElement);
    document.addEventListener('focusin', (event) => revealAround(event.target));
    window.addEventListener('hashchange', revealHashTarget);
    window.addEventListener('pageshow', revealHashTarget);
    window.addEventListener('beforeprint', finishMotion);
    reducedMotion.addEventListener('change', () => {
      if (reducedMotion.matches) finishMotion();
    });
  } catch {
    // Motion is optional: never leave content concealed if setup is unsupported.
    finishMotion();
  }
})();
