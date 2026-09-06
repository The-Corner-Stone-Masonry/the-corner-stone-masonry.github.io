const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
const markup = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
// All submissions are intercepted. This documented example is never contacted.
const endpoint = 'https://formspree.io/f/xpznqkqr';
const accepted = () => ({ ok: true, json: async () => ({ next: 'https://formspree.io/thanks' }) });

// A deliberately small form fixture: actual field markup, native-like required
// validation and successful-control serialization, with no browser or network.
function fixture({ formEndpoint = '', respond = accepted, language } = {}) {
  const ids = new Map();
  const timers = new Map();
  const requests = [];
  const copied = [];
  const documentListeners = new Map();
  let nextTimer = 0;
  let activeElement;

  class Control {
    constructor(tagName = 'div', attributes = '') {
      this.tagName = tagName.toUpperCase();
      this.attributes = new Map();
      for (const [, name, double, single, bare] of attributes.matchAll(/([^\s=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
        this.attributes.set(name, double ?? single ?? bare ?? '');
      }
      this.name = this.attributes.get('name') || '';
      this.type = this.attributes.get('type') || (tagName === 'input' ? 'text' : '');
      this.value = this.defaultValue = this.attributes.get('value') || '';
      this.required = this.attributes.has('required');
      this.disabled = this.attributes.has('disabled');
      this.hidden = this.attributes.has('hidden');
      this.textContent = '';
      this.dataset = {};
      this.href = this.attributes.get('href') || '';
      this.hash = this.href.startsWith('#') ? this.href : '';
      this.listeners = new Map();
      const classes = new Set((this.attributes.get('class') || '').split(/\s+/));
      this.classList = {
        add: (...names) => names.forEach((name) => classes.add(name)),
        remove: (...names) => names.forEach((name) => classes.delete(name)),
        contains: (name) => classes.has(name),
        toggle: (name, force = !classes.has(name)) => force ? classes.add(name) : classes.delete(name)
      };
      if (this.attributes.has('id')) ids.set(this.attributes.get('id'), this);
    }
    addEventListener(type, callback) {
      this.listeners.set(type, [...(this.listeners.get(type) || []), callback]);
    }
    async dispatch(type) {
      const event = { target: this, preventDefault() {} };
      await Promise.all((this.listeners.get(type) || []).map((callback) => callback(event)));
    }
    dispatchEvent(event) {
      (this.listeners.get(event.type) || []).forEach((callback) => callback(event));
      if (event.bubbles && this.form) this.form.dispatch(event.type);
      return true;
    }
    closest() { return this.tagName === 'A' && this.hash ? this : null; }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    getAttribute(name) { return this.attributes.get(name) ?? null; }
    removeAttribute(name) { this.attributes.delete(name); }
    hasAttribute(name) { return this.attributes.has(name); }
    setCustomValidity(message) { this.validationMessage = message; }
    get validity() {
      const valueMissing = this.required && !this.value;
      const typeMismatch = this.type === 'email' && Boolean(this.value) && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.value);
      return { valueMissing, typeMismatch, valid: !(valueMissing || typeMismatch || this.validationMessage) };
    }
    focus() { activeElement = this; }
    select() { this.selected = true; }
    matches(selector) {
      const type = selector.match(/^[a-z]+/i)?.[0];
      if (type && this.tagName !== type.toUpperCase()) return false;
      if (selector.includes(':not([type="hidden"])') && this.type === 'hidden') return false;
      if (selector.includes('[required]') && !this.required) return false;
      const attribute = selector.replace(/:not\([^)]*\)/g, '').match(/\[([^=\]]+)=["']?([^"'\]]+)/);
      if (attribute && this.getAttribute(attribute[1]) !== attribute[2]) return false;
      return true;
    }
  }

  const formMarkup = markup.match(/<form\b[^>]*\bid="quote-form"[\s\S]*?<\/form>/)[0];
  const nodes = [...formMarkup.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)].map(([, tag, attrs]) => new Control(tag, attrs));
  const form = ids.get('quote-form');
  const fields = nodes.filter((node) => ['INPUT', 'TEXTAREA', 'SELECT'].includes(node.tagName));
  const controls = nodes.filter((node) => ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'FIELDSET'].includes(node.tagName));
  for (const [, attributes, options] of formMarkup.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
    const name = attributes.match(/\bname="([^"]*)"/)[1];
    const parsedOptions = [...options.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/gi)]
      .map(([, attrs, label]) => ({ value: attrs.match(/\bvalue="([^"]*)"/)?.[1] ?? label, selected: /\bselected\b/.test(attrs) }));
    const selected = parsedOptions.find((option) => option.selected) ?? parsedOptions[0];
    const field = fields.find((node) => node.name === name);
    field.options = parsedOptions;
    field.value = field.defaultValue = selected?.value ?? '';
  }
  fields.forEach((field) => { field.form = form; });
  form.elements = Object.assign(controls, { namedItem: (name) => controls.find((field) => field.name === name) ?? null });
  form.querySelectorAll = (selectors) => nodes.filter((node) => selectors.split(',').some((selector) => node.matches(selector.trim())));
  form.querySelector = (selector) => form.querySelectorAll(selector)[0] ?? null;
  form.reportValidity = () => fields.every((field) => {
    if (field.disabled || ids.get('quote-fields')?.disabled || field.type === 'hidden') return true;
    if (field.validationMessage || (field.required && !field.value)) return false;
    if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) return false;
    return true;
  });
  form.resetCount = 0;
  form.reset = () => {
    form.resetCount += 1;
    fields.forEach((field) => { field.value = field.defaultValue; });
  };
  const body = new Control('body');
  const document = {
    body, documentElement: { scrollHeight: 1000 },
    get activeElement() { return activeElement; },
    getElementById: (id) => ids.get(id) ?? null,
    querySelector: () => null,
    querySelectorAll: () => [],
    addEventListener(type, callback) {
      documentListeners.set(type, [...(documentListeners.get(type) || []), callback]);
    }
  };
  const window = {
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {}, scrollY: 0, innerHeight: 800
  };
  if (language) {
    const spanish = {};
    window.CornerStoneI18n = {
      get language() { return language; },
      register: (dictionary) => Object.assign(spanish, dictionary),
      t: (message, params = {}) => (language === 'es' ? spanish[message] ?? message : message)
        .replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match)
    };
  }
  vm.runInNewContext(fs.readFileSync(path.join(root, 'site-config.js'), 'utf8'), { window });
  window.CornerStoneConfig = { ...window.CornerStoneConfig, forms: { formspreeEndpoint: formEndpoint } };
  class MockFormData extends Map {
    constructor(target) {
      super(fields.filter((field) => field.name && !field.disabled && !ids.get('quote-fields')?.disabled)
        .map((field) => [field.name, field.value]));
      assert.equal(target, form);
    }
    get(name) { return super.get(name) ?? null; }
    append(name, value) { this.set(name, value); }
  }
  const context = {
    window, document, Element: Control, Event, FormData: MockFormData, URL, AbortController,
    navigator: { clipboard: { writeText: async (message) => copied.push(message) } },
    fetch: async (url, options) => { requests.push({ url, ...options }); return respond(url, options); },
    setTimeout: (callback) => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: (id) => timers.delete(id),
    requestAnimationFrame: (callback) => { callback(); return 1; }
  };
  window.setTimeout = context.setTimeout;
  window.clearTimeout = context.clearTimeout;
  vm.runInNewContext(source, context, { filename: 'index.js', timeout: 1000 });
  return {
    form, ids, requests, copied, timers, api: window.CornerStoneQuote,
    field: (name) => form.elements.namedItem(name),
    fill(values = {}) {
      const input = { name: 'Jamie Customer', city: 'Springfield', project: 'Brick repair', details: 'Repair the brick garden wall.', preferredContact: 'email', email: 'jamie@example.com', phone: '', ...values };
      for (const [name, value] of Object.entries(input)) form.elements.namedItem(name).value = value;
    },
    submit: () => form.dispatch('submit'),
    setLanguage(nextLanguage) {
      language = nextLanguage;
      (documentListeners.get('languagechange') || []).forEach((callback) => callback({ detail: { language } }));
    },
    clickService(project, overrides = {}) {
      const link = new Control('a', 'href="#contact"');
      link.dataset.quoteProject = project;
      if (!ids.has('contact')) new Control('section', 'id="contact"');
      const event = { target: link, button: 0, ...overrides };
      (documentListeners.get('click') || []).forEach((callback) => callback(event));
    },
    expire: () => [...timers.values()].forEach((callback) => callback())
  };
}

test('unconfigured endpoint prepares a message without making a request; editing hides it', async () => {
  const page = fixture();
  page.fill({ email: '', phone: '' });
  await page.submit();
  assert.equal(page.requests.length, 0);
  assert.equal(page.form.hidden, false);
  assert.equal(page.ids.get('quote-preview').hidden, false);
  assert.match(page.ids.get('quote-message').value, /Jamie Customer/);
  assert.match(page.ids.get('quote-text').href, /^sms:\+12178160869\?body=/);
  assert.match(page.ids.get('quote-email').href, /^mailto:thecornerstonemasonryllc@gmail\.com\?/);
  await page.ids.get('quote-copy').dispatch('click');
  assert.deepEqual(page.copied, [page.ids.get('quote-message').value]);
  await page.form.dispatch('input');
  assert.equal(page.ids.get('quote-preview').hidden, true);
});

test('only a complete HTTPS Formspree form endpoint enables submission', async () => {
  for (const formEndpoint of ['', null, 42, ' https://formspree.io/f/abc123', 'https://formspree.io/f/abc123\n', 'http://formspree.io/f/abc123', 'https://formspree.io.evil.test/f/abc123', 'https://formspree.io@evil.test/f/abc123', 'https://formspree.io/f/abc123?next=evil', 'https://formspree.io/f/abc123/', 'https://formspree.io/f/abc123#hash', 'https://example.com/f/abc123', '/f/abc123']) {
    const page = fixture({ formEndpoint });
    page.fill();
    await page.submit();
    assert.equal(page.requests.length, 0, String(formEndpoint));
    assert.equal(page.ids.get('quote-preview').hidden, false, String(formEndpoint));
  }
});

test('whitespace-only required fields and missing preferred contact prevent requests', async () => {
  for (const values of [{ name: '   ' }, { city: '\n\t' }, { project: '' }, { details: '  ' }, { preferredContact: 'email', email: ' ' }, { preferredContact: 'text', phone: '  ' }, { preferredContact: 'call', phone: '' }, { phone: 'abc123' }, { phone: '1234567890123456' }, { email: 'invalid-address' }]) {
    const page = fixture({ formEndpoint: endpoint });
    page.fill(values);
    await page.submit();
    assert.equal(page.requests.length, 0, JSON.stringify(values));
    assert.equal(page.form.resetCount, 0);
  }
});

test('accepted request posts trimmed contact details, honeypot and subject then resets', async () => {
  const page = fixture({ formEndpoint: endpoint });
  page.fill({ name: '  Jamie Customer  ', preferredContact: 'text', email: '', phone: ' (217) 555-0199 ' });
  await page.submit();
  assert.equal(page.requests.length, 1);
  const request = page.requests[0];
  assert.equal(request.url, endpoint);
  assert.equal(request.method, 'POST');
  assert.equal(request.headers.Accept, 'application/json');
  assert.equal(request.headers['Content-Type'], undefined, 'browser must set the multipart boundary');
  for (const [name, expected] of Object.entries({ name: 'Jamie Customer', city: 'Springfield', project: 'Brick repair', preferredContact: 'text', phone: '(217) 555-0199', details: 'Repair the brick garden wall.', _gotcha: '' })) {
    assert.equal(request.body.get(name), expected, name);
  }
  assert.match(request.body.get('_subject'), /masonry quote request/i);
  assert.equal(request.body.has('email'), false, 'omit unused return-contact fields');
  assert.match(request.body.get('message'), /Preferred reply: Text/);
  assert.match(request.body.get('message'), /Phone: \(217\) 555-0199/);
  assert.equal(page.form.resetCount, 1);
  assert.equal(page.field('name').value, '');
  assert.equal(page.ids.get('quote-preview').hidden, true);
  assert.match(page.ids.get('quote-status').textContent, /sent|received|thank/i);
  assert.equal(page.ids.get('quote-error').textContent, '');
  assert.equal(page.ids.get('quote-fields').disabled, false);
  assert.equal(page.ids.get('quote-submit').disabled, false);
  assert.equal(page.timers.size, 0);
});

test('pending submission blocks duplicates and restores controls when it finishes', async () => {
  let resolveRequest;
  const page = fixture({ formEndpoint: endpoint, respond: () => new Promise((resolve) => { resolveRequest = resolve; }) });
  page.fill();
  const pending = page.submit();
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0].body.get('email'), 'jamie@example.com');
  assert.equal(page.requests[0].body.has('phone'), false);
  assert.equal(page.ids.get('quote-fields').disabled, true);
  assert.equal(page.ids.get('quote-submit').disabled, true);
  assert.equal(page.ids.get('quote-fallback').disabled, true);
  assert.equal(page.form.getAttribute('aria-busy'), 'true');
  await page.submit();
  await page.ids.get('quote-fallback').dispatch('click');
  assert.equal(page.requests.length, 1);
  assert.equal(page.ids.get('quote-preview').hidden, true);
  resolveRequest(accepted());
  await pending;
  assert.equal(page.ids.get('quote-fields').disabled, false);
  assert.equal(page.ids.get('quote-submit').disabled, false);
  assert.equal(page.ids.get('quote-fallback').disabled, false);
  assert.equal(page.form.getAttribute('aria-busy'), 'false');
});

test('HTTP, network and invalid success responses retain input and offer fallback', async () => {
  const failures = [
    ['HTTP rejection', async () => ({ ok: false, json: async () => ({ errors: [{ message: 'Please try again.' }] }) })],
    ['network failure', async () => { throw new Error('Offline'); }],
    ['malformed JSON', async () => ({ ok: true, json: async () => { throw new SyntaxError('Invalid JSON'); } })],
    ['missing confirmation', async () => ({ ok: true, json: async () => ({}) })],
    ['null JSON', async () => ({ ok: true, json: async () => null })],
    ['generic ok is not server confirmation', async () => ({ ok: true, json: async () => ({ ok: true }) })],
    ['error despite next', async () => ({ ok: true, json: async () => ({ next: '/thanks', errors: [{ message: 'Invalid' }] }) })],
    ['explicit failure despite next', async () => ({ ok: true, json: async () => ({ next: '/thanks', ok: false }) })]
  ];
  for (const [name, respond] of failures) {
    const page = fixture({ formEndpoint: endpoint, respond });
    page.fill();
    await page.submit();
    assert.equal(page.form.resetCount, 0, name);
    assert.equal(page.field('name').value, 'Jamie Customer', name);
    assert.equal(page.field('details').value, 'Repair the brick garden wall.', name);
    assert.ok(page.ids.get('quote-error').textContent, name);
    assert.equal(page.ids.get('quote-fields').disabled, false, name);
    assert.equal(page.ids.get('quote-submit').disabled, false, name);
    assert.equal(page.timers.size, 0, name);
    assert.equal(page.ids.get('quote-fallback').hidden, false, name);
  }
});

test('server field errors are associated with inputs and clear when the visitor edits', async () => {
  const page = fixture({ formEndpoint: endpoint, respond: async () => ({ ok: false, status: 422, json: async () => ({ errors: [{ field: 'email', message: 'Please check this email.' }] }) }) });
  page.fill();
  await page.submit();
  assert.equal(page.field('email').getAttribute('aria-invalid'), 'true');
  assert.equal(page.field('email').validationMessage, 'Please check this email.');
  assert.match(page.ids.get('quote-error').textContent, /Email: Please check this email/);
  page.field('email').value = 'corrected@example.com';
  await page.form.dispatch('input');
  assert.equal(page.field('email').getAttribute('aria-invalid'), null);
  assert.equal(page.field('email').validationMessage, '');
  assert.equal(page.ids.get('quote-error').textContent, '');
});

test('timeout aborts the request and retains project details for retry', async () => {
  const page = fixture({ formEndpoint: endpoint, respond: (_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' })));
  }) });
  page.fill();
  const pending = page.submit();
  page.expire();
  await pending;
  assert.equal(page.requests[0].signal.aborted, true);
  assert.equal(page.field('details').value, 'Repair the brick garden wall.');
  assert.equal(page.form.resetCount, 0);
  assert.ok(page.ids.get('quote-error').textContent);
  assert.equal(page.ids.get('quote-fields').disabled, false);
  assert.equal(page.ids.get('quote-submit').disabled, false);
});

test('configured form still lets visitors compose text or email without return-contact fields', async () => {
  const page = fixture({ formEndpoint: endpoint });
  page.fill({ email: '', phone: '' });
  await page.ids.get('quote-fallback').dispatch('click');
  assert.equal(page.requests.length, 0);
  assert.equal(page.ids.get('quote-preview').hidden, false);
  assert.equal(page.field('email').required, true, 'direct-submit contact validation is restored');
  await page.form.dispatch('change');
  assert.equal(page.ids.get('quote-preview').hidden, true);
});

test('service links choose a real project option and invalidate the previous preview', async () => {
  const page = fixture();
  page.fill();
  await page.submit();
  page.clickService('Fireplaces');
  assert.equal(page.field('project').value, 'Fireplaces');
  assert.equal(page.ids.get('quote-preview').hidden, true);
  page.clickService('Unknown project');
  assert.equal(page.field('project').value, 'Fireplaces');
  page.clickService('Commercial masonry', { ctrlKey: true });
  assert.equal(page.field('project').value, 'Fireplaces');
  page.ids.get('quote-fields').disabled = true;
  page.clickService('Commercial masonry');
  assert.equal(page.field('project').value, 'Fireplaces');
});

test('language switching translates the prepared message and links without changing visitor input', async () => {
  const page = fixture({ language: 'en' });
  page.fill({ name: 'María García', details: 'Reparar el muro del jardín.', email: '', phone: '' });
  await page.submit();
  assert.match(page.ids.get('quote-message').value, /^Hi Roy/);
  page.setLanguage('es');
  assert.equal(page.field('name').value, 'María García');
  assert.equal(page.field('details').value, 'Reparar el muro del jardín.');
  assert.equal(page.field('project').value, 'Brick repair');
  assert.equal(page.ids.get('quote-preview').hidden, false);
  assert.match(page.ids.get('quote-message').value, /^Hola, Roy/);
  assert.match(page.ids.get('quote-message').value, /Tipo de proyecto: Reparación de ladrillo/);
  assert.match(page.ids.get('quote-submit').textContent, /Revisar solicitud/);
  assert.match(page.ids.get('quote-status').textContent, /Aún no se ha enviado nada/);
  assert.equal(new URL(page.ids.get('quote-text').href).searchParams.get('body'), page.ids.get('quote-message').value);
  assert.match(new URL(page.ids.get('quote-email').href).searchParams.get('subject'), /Solicitud de cotización/);
  await page.ids.get('quote-copy').dispatch('click');
  assert.match(page.ids.get('quote-status').textContent, /^Mensaje copiado/);
  page.setLanguage('en');
  assert.match(page.ids.get('quote-message').value, /^Hi Roy/);
  assert.match(page.ids.get('quote-status').textContent, /^Message copied/);
  assert.equal(page.requests.length, 0);
});

test('required, email and phone validation follow the selected language', async () => {
  const page = fixture({ formEndpoint: endpoint, language: 'es' });
  page.fill({ name: '', project: '', email: 'invalid-address', phone: '123' });
  await page.submit();
  assert.equal(page.requests.length, 0);
  assert.equal(page.field('name').validationMessage, 'Completa este campo.');
  assert.equal(page.field('project').validationMessage, 'Elige un tipo de proyecto.');
  assert.match(page.field('email').validationMessage, /correo electrónico válida/);
  assert.match(page.field('phone').validationMessage, /7 y 15 dígitos/);
  page.setLanguage('en');
  assert.equal(page.field('name').validationMessage, 'Please fill out this field.');
  assert.equal(page.field('email').validationMessage, 'Please enter a valid email address.');
  page.fill();
  await page.form.dispatch('input');
  assert.equal(page.field('email').validationMessage, '');
});

test('server errors translate field labels and provide Spanish guidance without untranslated server copy', async () => {
  const page = fixture({ formEndpoint: endpoint, language: 'en', respond: async () => ({ ok: false, status: 422, json: async () => ({ errors: [{ field: 'email', message: 'Please check this email.' }] }) }) });
  page.fill();
  await page.submit();
  page.setLanguage('es');
  assert.equal(page.field('email').validationMessage, 'Revisa este campo e inténtalo de nuevo.');
  assert.match(page.ids.get('quote-error').textContent, /Correo electrónico: Revisa este campo/);
  assert.doesNotMatch(page.ids.get('quote-error').textContent, /Please/);
  assert.equal(page.field('name').value, 'Jamie Customer');
  page.setLanguage('en');
  assert.equal(page.field('email').validationMessage, 'Please check this email.');
});

test('switching language while sending preserves submitted values and disabled state', async () => {
  let resolveRequest;
  const page = fixture({ formEndpoint: endpoint, language: 'es', respond: () => new Promise((resolve) => { resolveRequest = resolve; }) });
  page.fill();
  const pending = page.submit();
  assert.equal(page.requests[0].body.get('language'), 'es');
  assert.equal(page.requests[0].body.get('project'), 'Brick repair');
  assert.match(page.requests[0].body.get('message'), /^Hola, Roy/);
  assert.match(page.requests[0].body.get('_subject'), /cotización/);
  assert.equal(page.ids.get('quote-submit').textContent, 'Enviando…');
  page.setLanguage('en');
  assert.equal(page.ids.get('quote-fields').disabled, true);
  assert.equal(page.ids.get('quote-submit').disabled, true);
  assert.equal(page.ids.get('quote-submit').textContent, 'Sending…');
  assert.equal(page.field('name').value, 'Jamie Customer');
  assert.equal(page.requests[0].body.get('language'), 'es');
  await page.submit();
  assert.equal(page.requests.length, 1);
  resolveRequest(accepted());
  await pending;
  assert.match(page.ids.get('quote-status').textContent, /Your request was received/);
  page.setLanguage('es');
  assert.match(page.ids.get('quote-status').textContent, /Recibimos tu solicitud/);
  assert.equal(page.ids.get('quote-fields').disabled, false);
});
