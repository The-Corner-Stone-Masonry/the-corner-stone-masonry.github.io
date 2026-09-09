(function enableLanguages() {
  const translations = {
    ...window.CornerStoneTranslations,
    "Hi Roy, I'd like a free masonry quote.": 'Hola Roy, quisiera una cotización gratuita para un trabajo de albañilería.'
  };
  const storageKey = 'cornerstone-language';
  const supported = new Set(['en', 'es']);
  const textNodes = [...document.querySelectorAll('[data-i18n]')]
    .map((element) => ({ element, english: element.textContent.trim() }));
  const attributes = [...document.querySelectorAll('[data-i18n-attrs]')].flatMap((element) =>
    element.dataset.i18nAttrs.split(',').map((attribute) => ({
      element, attribute: attribute.trim(), english: element.getAttribute(attribute.trim())
    }))
  );
  const switches = [...document.querySelectorAll('[data-language]')];
  const status = document.getElementById('language-status');
  const directText = document.querySelector('.contact-intro a[href^="sms:"]');
  const textRecipient = directText?.getAttribute('href').split('?')[0];
  const fadeRegions = [...document.querySelectorAll('[data-language-fade]')];
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const canAnimate = fadeRegions.length > 0 && fadeRegions.every((element) => typeof element.animate === 'function');
  let animations = [];
  let changeId = 0;
  let requestedLanguage = 'en';
  let requestedOptions = {};
  let language = 'en';

  function t(english, params = {}) {
    const text = language === 'es' ? translations[english] ?? english : english;
    return text.replace(/\{(\w+)\}/g, (match, key) => Object.hasOwn(params, key) ? String(params[key]) : match);
  }

  function applyLanguage(next, { remember = true, updateUrl = true, announce = true } = {}) {
    // Finish measured accordion heights before translated text changes their size.
    document.dispatchEvent(new CustomEvent('beforelanguagechange'));
    language = next;
    document.documentElement.lang = language;
    textNodes.forEach(({ element, english }) => { element.textContent = t(english); });
    attributes.forEach(({ element, attribute, english }) => {
      if (english !== null) element.setAttribute(attribute, t(english));
    });
    switches.forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.language === language));
    });
    if (directText) directText.href = `${textRecipient}?body=${encodeURIComponent(t("Hi Roy, I'd like a free masonry quote."))}`;
    if (remember) {
      try { localStorage.setItem(storageKey, language); } catch { /* Optional in private/restricted browsing. */ }
    }
    if (updateUrl) {
      try {
        const url = new URL(window.location.href);
        url.searchParams.set('lang', language);
        window.history.replaceState(window.history.state, '', url);
      } catch { /* Language switching also works without writable browser history. */ }
    }
    document.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
    if (status && announce) status.textContent = language === 'es' ? 'Idioma cambiado a español.' : 'Language changed to English.';
  }

  function clearAnimations() {
    animations.forEach((animation) => animation.cancel());
    animations = [];
  }

  async function fadeTo(opacity, duration) {
    // Read the current appearance before cancelling so rapid clicks reverse smoothly.
    const starts = fadeRegions.map((element) => window.getComputedStyle(element).opacity);
    clearAnimations();
    animations = fadeRegions.map((element, index) => element.animate(
      [{ opacity: starts[index] }, { opacity }],
      { duration, easing: 'cubic-bezier(.25, .1, .25, 1)', fill: 'forwards' }
    ));
    await Promise.allSettled(animations.map((animation) => animation.finished));
  }

  async function setLanguage(next, { animate = true, ...options } = {}) {
    if (!supported.has(next)) return;
    const currentChange = ++changeId;
    requestedLanguage = next;
    requestedOptions = options;
    if (!animate || reducedMotion?.matches || !canAnimate) {
      clearAnimations();
      applyLanguage(next, options);
      return;
    }
    if (next === language && animations.length === 0) return;
    try {
      if (next !== language) {
        await fadeTo(0, 180);
        if (currentChange !== changeId) return;
        applyLanguage(next, options);
      }
      await fadeTo(1, 320);
    } finally {
      // An older, cancelled transition must not clear a newer one.
      if (currentChange === changeId) clearAnimations();
    }
  }

  window.CornerStoneI18n = Object.freeze({
    get language() { return language; },
    t,
    register: (messages) => Object.assign(translations, messages),
    setLanguage
  });

  let preferred;
  try { preferred = new URL(window.location.href).searchParams.get('lang'); } catch { /* Use local preference. */ }
  if (!supported.has(preferred)) {
    try { preferred = localStorage.getItem(storageKey); } catch { /* Use browser language. */ }
  }
  if (!supported.has(preferred)) preferred = navigator.language?.toLowerCase().startsWith('es') ? 'es' : 'en';
  setLanguage(preferred, { animate: false, remember: false, updateUrl: false, announce: false });
  switches.forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.language)));
  window.addEventListener('popstate', () => {
    const next = new URL(window.location.href).searchParams.get('lang');
    setLanguage(supported.has(next) ? next : preferred, { remember: false, updateUrl: false });
  });
  reducedMotion?.addEventListener('change', () => {
    if (reducedMotion.matches) setLanguage(requestedLanguage, { ...requestedOptions, animate: false });
  });
  window.addEventListener('beforeprint', () => {
    setLanguage(requestedLanguage, { ...requestedOptions, animate: false, announce: false });
  });
  document.querySelectorAll('.language-switch').forEach((control) => { control.hidden = false; });
})();
