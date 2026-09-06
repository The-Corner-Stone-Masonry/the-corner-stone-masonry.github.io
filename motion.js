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

(function enhanceFaqMotion() {
  if (typeof Element.prototype.animate !== 'function') return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finishers = [];

  document.querySelectorAll('.faq-list details').forEach((details) => {
    const summary = details.querySelector('summary');
    const answer = details.querySelector('.faq-answer');
    if (!summary || !answer) return;

    let animation = null;
    let expanded = details.open;

    function finish() {
      if (!animation) return;
      details.open = expanded;
      animation.cancel();
      animation = null;
      details.classList.remove('is-animating', 'is-closing');
    }

    summary.addEventListener('click', (event) => {
      // Native details remain the fallback, including when motion is reduced.
      if (reducedMotion.matches) return;
      event.preventDefault();

      const height = details.open ? answer.getBoundingClientRect().height : 0;
      const opacity = details.open ? getComputedStyle(answer).opacity : 0;
      expanded = animation ? !expanded : !details.open;
      animation?.cancel();

      // Keep the answer rendered until the closing animation has finished.
      details.open = true;
      details.classList.add('is-animating');
      details.classList.toggle('is-closing', !expanded);
      animation = answer.animate([
        { height: `${height}px`, opacity },
        { height: `${expanded ? answer.scrollHeight : 0}px`, opacity: expanded ? 1 : 0 }
      ], {
        duration: expanded ? 580 : 480,
        easing: 'cubic-bezier(.25, .1, .25, 1)',
        fill: 'both'
      });
      animation.onfinish = finish;
    });

    finishers.push(finish);
  });

  const finishAll = () => finishers.forEach((finish) => finish());
  window.addEventListener('resize', finishAll, { passive: true });
  window.addEventListener('beforeprint', finishAll);
  document.addEventListener('beforelanguagechange', finishAll);
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) finishAll();
  });
})();
