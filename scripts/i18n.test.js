const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const decode = (text) => text.replace(/&(?:amp|quot|apos|lt|gt|#39);/g,
  (entity) => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&#39;': "'", '&lt;': '<', '&gt;': '>' })[entity]);

function fixture({ url = 'https://thecornerstonemasonry.net/#process', saved, browserLanguage = 'en-US', restricted = false, motion = false, reduced = false } = {}) {
  const html = read('index.html');
  const listeners = new Map();
  const events = [];
  const windowListeners = new Map();
  const animations = [];
  const motionPreference = { matches: reduced, addEventListener(type, callback) { this[type] = callback; } };
  const values = new Map(saved ? [['cornerstone-language', saved]] : []);
  const nodes = [...html.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)].map((match) => {
    const attributes = new Map([...match[2].matchAll(/([^\s=]+)(?:="([^"]*)")?/g)]
      .map(([, name, value]) => [name, decode(value ?? '')]));
    const end = html.indexOf(`</${match[1]}>`, match.index + match[0].length);
    const inner = end < 0 ? '' : html.slice(match.index + match[0].length, end);
    return {
      attributes, inner,
      textContent: decode(inner.replace(/<[^>]*>/g, '')).trim(),
      hidden: attributes.has('hidden'),
      dataset: { i18nAttrs: attributes.get('data-i18n-attrs'), language: attributes.get('data-language') },
      getAttribute: (name) => attributes.get(name) ?? null,
      setAttribute: (name, value) => attributes.set(name, String(value)),
      addEventListener(type, callback) { this[type] = callback; }
    };
  });
  const textNodes = nodes.filter((node) => node.attributes.has('data-i18n'));
  const attrNodes = nodes.filter((node) => node.attributes.has('data-i18n-attrs'));
  const buttons = nodes.filter((node) => node.attributes.has('data-language'));
  const controls = nodes.filter((node) => node.attributes.get('class') === 'language-switch');
  const fadeRegions = nodes.filter((node) => node.attributes.has('data-language-fade'));
  if (motion) fadeRegions.forEach((node) => {
    node.opacity = '1';
    node.animate = (frames, options) => {
      let resolve, reject;
      const animation = {
        frames, options, cancelled: false,
        finished: new Promise((done, fail) => { resolve = done; reject = fail; }),
        finish() { node.opacity = String(frames.at(-1).opacity); resolve(); },
        cancel() { this.cancelled = true; node.opacity = '1'; reject(new Error('Cancelled')); }
      };
      animations.push(animation);
      return animation;
    };
  });
  const directText = nodes.find((node) => node.attributes.get('href')?.startsWith('sms:') && !node.attributes.has('id'));
  const status = nodes.find((node) => node.attributes.get('id') === 'language-status');
  const document = {
    documentElement: { lang: 'en' },
    querySelectorAll: (selector) => ({ '[data-i18n]': textNodes, '[data-i18n-attrs]': attrNodes, '[data-language]': buttons, '.language-switch': controls, '[data-language-fade]': fadeRegions })[selector],
    querySelector: () => directText,
    getElementById: () => status,
    dispatchEvent(event) {
      events.push(event.type);
      for (const callback of listeners.get(event.type) ?? []) callback(event);
    },
    addEventListener(type, callback) { listeners.set(type, [...(listeners.get(type) ?? []), callback]); }
  };
  const history = { state: { existing: true }, replaceState(state, title, next) {
    if (restricted) throw new Error('History unavailable');
    this.state = state;
    window.location.href = String(next);
  } };
  const window = {
    location: { href: url }, history,
    addEventListener(type, callback) { windowListeners.set(type, callback); },
    matchMedia: () => motionPreference,
    getComputedStyle: (node) => ({ opacity: node.opacity })
  };
  const context = {
    window, document, URL, navigator: { language: browserLanguage },
    localStorage: {
      getItem(key) { if (restricted) throw new Error('Storage unavailable'); return values.get(key); },
      setItem(key, value) { if (restricted) throw new Error('Storage unavailable'); values.set(key, value); }
    },
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options?.detail; } }
  };
  vm.runInNewContext(read('translations.js'), context);
  const englishTexts = textNodes.map((node) => node.textContent);
  const englishAttributes = attrNodes.flatMap((node) => node.dataset.i18nAttrs.split(',')
    .map((name) => [node, name.trim(), node.getAttribute(name.trim())]));
  vm.runInNewContext(read('i18n.js'), context);
  return { window, document, nodes, textNodes, attrNodes, buttons, controls, directText, status, values, events, englishTexts, englishAttributes, animations, fadeRegions, motionPreference, windowListeners, api: window.CornerStoneI18n };
}

test('every marked text and accessibility attribute has a Spanish translation', () => {
  const page = fixture({ url: 'https://thecornerstonemasonry.net/?lang=es#process' });
  assert.ok(page.textNodes.length > 90, 'all page sections should participate');
  for (const [index, node] of page.textNodes.entries()) {
    const english = page.englishTexts[index];
    assert.doesNotMatch(node.inner, /<[a-z]/i, `Translate a leaf span, not nested markup: ${english}`);
    assert.ok(Object.hasOwn(page.window.CornerStoneTranslations, english), `Missing translation: ${english}`);
    assert.equal(node.textContent, page.window.CornerStoneTranslations[english]);
  }
  for (const [node, attribute, english] of page.englishAttributes) {
    assert.ok(Object.hasOwn(page.window.CornerStoneTranslations, english), `Missing ${attribute} translation: ${english}`);
    assert.equal(node.getAttribute(attribute), page.window.CornerStoneTranslations[english]);
  }
});

test('language selection prioritizes a shared link, then saved preference, then browser language', () => {
  assert.equal(fixture({ url: 'https://thecornerstonemasonry.net/?lang=en', saved: 'es', browserLanguage: 'es-MX' }).api.language, 'en');
  assert.equal(fixture({ saved: 'es' }).api.language, 'es');
  assert.equal(fixture({ browserLanguage: 'es-MX' }).api.language, 'es');
  assert.equal(fixture({ saved: 'invalid', browserLanguage: 'fr-FR' }).api.language, 'en');
});

test('switching round-trips original English, remembers selection, and preserves URL context', () => {
  const page = fixture({ url: 'https://thecornerstonemasonry.net/?source=referral#process' });
  page.buttons.find((button) => button.dataset.language === 'es').click();
  assert.equal(page.document.documentElement.lang, 'es');
  assert.equal(page.values.get('cornerstone-language'), 'es');
  const url = new URL(page.window.location.href);
  assert.equal(url.hash, '#process');
  assert.equal(url.searchParams.get('source'), 'referral');
  assert.equal(url.searchParams.get('lang'), 'es');
  assert.deepEqual(page.window.history.state, { existing: true });
  assert.equal(page.buttons.find((button) => button.dataset.language === 'es').getAttribute('aria-pressed'), 'true');
  assert.match(decodeURIComponent(page.directText.href), /Hola Roy/);
  assert.equal(page.controls[0].hidden, false);
  assert.match(page.status.textContent, /español/);
  assert.deepEqual(page.events.slice(-2), ['beforelanguagechange', 'languagechange']);
  page.api.setLanguage('en');
  assert.deepEqual(page.textNodes.map((node) => node.textContent), page.englishTexts);
  for (const [node, attribute, english] of page.englishAttributes) assert.equal(node.getAttribute(attribute), english);
  assert.match(decodeURIComponent(page.directText.href), /Hi Roy/);
});

test('restricted storage/history and unsupported languages do not break the switch', () => {
  const page = fixture({ restricted: true, browserLanguage: 'es' });
  page.api.setLanguage('en');
  assert.equal(page.api.language, 'en');
  page.api.setLanguage('unsupported');
  assert.equal(page.api.language, 'en');
  page.api.register({ 'Hello {name}': 'Hola {name}' });
  page.api.setLanguage('es');
  assert.equal(page.api.t('Hello {name}', { name: 'Roy' }), 'Hola Roy');
  assert.equal(page.api.t('A new untranslated phrase'), 'A new untranslated phrase');
});

const flushAnimations = () => new Promise((resolve) => setImmediate(resolve));
const finishAnimations = (page) => page.animations.filter((animation) => !animation.cancelled).forEach((animation) => animation.finish());

test('language changes after fade-out and returns to full visibility after fade-in', async () => {
  const page = fixture({ motion: true });
  assert.equal(page.animations.length, 0, 'initial rendering must not fade');
  const transition = page.api.setLanguage('es');
  assert.equal(page.api.language, 'en', 'keep original copy visible during fade-out');
  assert.ok(page.animations.every((animation) => animation.frames.at(-1).opacity === 0));
  finishAnimations(page);
  await flushAnimations();
  assert.equal(page.api.language, 'es');
  assert.ok(page.animations.filter((animation) => !animation.cancelled).every((animation) => animation.frames.at(-1).opacity === 1));
  finishAnimations(page);
  await transition;
  assert.ok(page.animations.every((animation) => animation.cancelled), 'remove filled animation effects');
  assert.ok(page.fadeRegions.every((node) => node.opacity === '1'));
});

test('rapid clicks honor the latest language and cannot leave faded content behind', async () => {
  const page = fixture({ motion: true });
  const first = page.api.setLanguage('es');
  const latest = page.api.setLanguage('en');
  finishAnimations(page);
  await Promise.all([first, latest]);
  assert.equal(page.api.language, 'en');
  assert.ok(page.animations.every((animation) => animation.cancelled));
  assert.ok(page.fadeRegions.every((node) => node.opacity === '1'));
});

test('reduced motion skips fades and can finish an in-progress language change', async () => {
  const reducedPage = fixture({ motion: true, reduced: true });
  await reducedPage.api.setLanguage('es');
  assert.equal(reducedPage.api.language, 'es');
  assert.equal(reducedPage.animations.length, 0);
  const page = fixture({ motion: true });
  const transition = page.api.setLanguage('es');
  page.motionPreference.matches = true;
  page.motionPreference.change();
  await transition;
  assert.equal(page.api.language, 'es');
  assert.ok(page.animations.every((animation) => animation.cancelled));
});

test('browser history restores the language in the URL without rewriting the entry', () => {
  const page = fixture({ url: 'https://thecornerstonemasonry.net/?lang=en#home' });
  page.api.setLanguage('es');
  page.window.location.href = 'https://thecornerstonemasonry.net/?lang=en#home';
  page.windowListeners.get('popstate')();
  assert.equal(page.api.language, 'en');
  assert.equal(page.window.location.href, 'https://thecornerstonemasonry.net/?lang=en#home');
  assert.equal(page.values.get('cornerstone-language'), 'es', 'Back must not overwrite the chosen preference');
});
