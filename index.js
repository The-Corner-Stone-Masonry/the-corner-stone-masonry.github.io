const body = document.body;
const header = document.querySelector('[data-header]');
const nav = document.getElementById('primary-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = [...document.querySelectorAll('.nav-link')];
const mobileNav = window.matchMedia('(max-width: 1000px)');
const config = window.CornerStoneConfig ?? {};
const business = config.business ?? {};
const pageContent = [...document.querySelectorAll('main, .site-footer')];
const i18n = window.CornerStoneI18n;
i18n?.register({
  'Open navigation': 'Abrir menú',
  'Close navigation': 'Cerrar menú',
  'Email': 'Correo electrónico',
  'Text message': 'Mensaje de texto',
  'Phone call': 'Llamada telefónica',
  'Hi {contactName}, I would like a free quote from {businessName}.': 'Hola, {contactName}. Me gustaría solicitar una cotización gratuita de {businessName}.',
  'Name: {name}': 'Nombre: {name}',
  'Project city: {city}': 'Ciudad del proyecto: {city}',
  'Project type: {project}': 'Tipo de proyecto: {project}',
  'Preferred reply: {contactPreference}': 'Medio de contacto preferido: {contactPreference}',
  'Email: {email}': 'Correo electrónico: {email}',
  'Phone: {phone}': 'Teléfono: {phone}',
  'Details: {details}': 'Detalles: {details}',
  'Masonry quote request — {city}': 'Solicitud de cotización de albañilería — {city}',
  'New masonry quote request': 'Nueva solicitud de cotización de albañilería',
  'Name': 'Nombre',
  'Project city': 'Ciudad del proyecto',
  'Project type': 'Tipo de proyecto',
  'Project details': 'Detalles del proyecto',
  'Phone': 'Teléfono',
  'Preferred reply': 'Medio de contacto preferido',
  'Brick repair': 'Reparación de ladrillo',
  'Stone exteriors': 'Exteriores de piedra',
  'Fireplaces': 'Chimeneas interiores',
  'Chimney masonry': 'Albañilería para chimeneas exteriores',
  'Interior brickwork': 'Ladrillo en interiores',
  'Commercial masonry': 'Albañilería comercial',
  'Other / not sure yet': 'Otro / aún no lo sé',
  'Send quote request': 'Enviar solicitud de cotización',
  'Review quote request': 'Revisar solicitud de cotización',
  'Sending…': 'Enviando…',
  'Email (required)': 'Correo electrónico (obligatorio)',
  'Email (optional)': 'Correo electrónico (opcional)',
  'Phone (required)': 'Teléfono (obligatorio)',
  'Phone (optional)': 'Teléfono (opcional)',
  'Please fill out this field.': 'Completa este campo.',
  'Please choose a project type.': 'Elige un tipo de proyecto.',
  'Please enter a valid email address.': 'Introduce una dirección de correo electrónico válida.',
  'Please enter a phone number with 7 to 15 digits.': 'Introduce un número de teléfono de entre 7 y 15 dígitos.',
  'Please check this field.': 'Revisa este campo e inténtalo de nuevo.',
  'Your request is ready to review. Nothing has been sent.': 'Tu solicitud está lista para revisar. Aún no se ha enviado nada.',
  'Your request could not be sent. Your information is still here. Please try again later or prepare a text or email instead.': 'No se pudo enviar tu solicitud. Tu información sigue aquí. Inténtalo más tarde o prepara un mensaje de texto o un correo electrónico.',
  'Quote requests are temporarily unavailable. Your information is still here. Please try again later or prepare a text or email instead.': 'El envío de solicitudes no está disponible por el momento. Tu información sigue aquí. Inténtalo más tarde o prepara un mensaje de texto o un correo electrónico.',
  'Please check these fields and send again. {fields}': 'Revisa estos campos y vuelve a enviar la solicitud. {fields}',
  'We could not confirm whether your request was received. Your information is still here. Please contact Roy before sending it again.': 'No pudimos confirmar si se recibió tu solicitud. Tu información sigue aquí. Contacta a Roy antes de volver a enviarla.',
  'Sending your quote request…': 'Enviando tu solicitud de cotización…',
  'Your request was received. Roy can follow up using the contact details you provided.': 'Recibimos tu solicitud. Roy podrá responderte con los datos de contacto que proporcionaste.',
  'The request took too long, so we could not confirm whether it was received. Your information is still here. Please contact Roy before sending it again.': 'La solicitud tardó demasiado y no pudimos confirmar si se recibió. Tu información sigue aquí. Contacta a Roy antes de volver a enviarla.',
  'We could not confirm whether your request was received. Your information is still here. Check your connection and contact Roy before sending it again.': 'No pudimos confirmar si se recibió tu solicitud. Tu información sigue aquí. Revisa tu conexión y contacta a Roy antes de volver a enviarla.',
  'Message copied. Paste it into your preferred messaging or email app. Nothing has been sent.': 'Mensaje copiado. Pégalo en tu aplicación de mensajes o correo electrónico. Aún no se ha enviado nada.',
  'Select and copy the message, then paste it into your preferred messaging or email app. Nothing has been sent.': 'Selecciona y copia el mensaje, y luego pégalo en tu aplicación de mensajes o correo electrónico. Aún no se ha enviado nada.',
  'Your contact and project details go to The Corner Stone Masonry through Formspree to respond to your request. Prefer another way? Prepare a text or email instead.': 'Tus datos de contacto y del proyecto se envían a The Corner Stone Masonry a través de Formspree para responder a tu solicitud. ¿Prefieres otra opción? Prepara un mensaje de texto o un correo electrónico.',
  'Describe your project, then choose text or email to send your request to Roy. You will review the message before sending it.': 'Describe tu proyecto y elige mensaje de texto o correo electrónico para enviarle tu solicitud a Roy. Podrás revisar el mensaje antes de enviarlo.'
});

function t(source, params = {}) {
  return i18n?.t(source, params) ?? source.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
}

function setNavigation(open, { returnFocus = false } = {}) {
  const shouldOpen = Boolean(open && mobileNav.matches);
  body.classList.toggle('nav-open', shouldOpen);
  navToggle?.setAttribute('aria-expanded', String(shouldOpen));
  navToggle?.setAttribute('aria-label', t(shouldOpen ? 'Close navigation' : 'Open navigation'));
  nav?.setAttribute('aria-hidden', String(mobileNav.matches && !shouldOpen));
  pageContent.forEach((element) => { element.inert = shouldOpen; });

  if (shouldOpen) {
    if (nav) nav.scrollTop = 0;
    // Wait until the opening menu is visible before moving keyboard focus.
    requestAnimationFrame(() => {
      if (body.classList.contains('nav-open')) navLinks[0]?.focus({ preventScroll: true });
    });
  } else if (returnFocus) navToggle?.focus({ preventScroll: true });
}

navToggle?.addEventListener('click', () => {
  const shouldOpen = !body.classList.contains('nav-open');
  setNavigation(shouldOpen, { returnFocus: !shouldOpen });
});
document.addEventListener('keydown', (event) => {
  if (!body.classList.contains('nav-open')) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    setNavigation(false, { returnFocus: true });
  } else if (event.key === 'Tab') {
    const controls = [...header.querySelectorAll('a[href], button:not([disabled])')]
      .filter((element) => element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    const first = controls[0];
    const last = controls.at(-1);
    if (!first) return;

    if (event.shiftKey && (document.activeElement === first || !header.contains(document.activeElement))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (document.activeElement === last || !header.contains(document.activeElement))) {
      event.preventDefault();
      first.focus();
    }
  }
});
mobileNav.addEventListener('change', () => {
  const focusWasInNav = nav?.contains(document.activeElement);
  const focusWasOnToggle = document.activeElement === navToggle;
  setNavigation(false, { returnFocus: mobileNav.matches && focusWasInNav });
  if (!mobileNav.matches && focusWasOnToggle) navLinks[0]?.focus({ preventScroll: true });
});
setNavigation(false);
body.classList.add('nav-ready');

function updateHeader() {
  header?.classList.toggle('is-scrolled', window.scrollY > 20);
}

const sectionLinks = navLinks
  .map((link) => ({ link, section: document.querySelector(link.hash) }))
  .filter(({ section }) => section)
  .sort((a, b) => a.section.offsetTop - b.section.offsetTop);

function updateActiveNavigation() {
  if (!sectionLinks.length) return;

  const headerOffset = header?.offsetHeight ?? 0;
  const marker = window.scrollY + headerOffset + Math.min(window.innerHeight * 0.22, 180);
  let activeSection = sectionLinks[0].section;

  sectionLinks.forEach(({ section }) => {
    if (section.offsetTop <= marker) activeSection = section;
  });

  const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
  if (atPageEnd) activeSection = sectionLinks.at(-1).section;

  sectionLinks.forEach(({ link, section }) => {
    const isActive = section === activeSection;
    link.classList.toggle('is-active', isActive);
    if (isActive) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}

let scrollFrame = null;
function handleScroll() {
  if (scrollFrame !== null) return;

  scrollFrame = requestAnimationFrame(() => {
    updateHeader();
    updateActiveNavigation();
    scrollFrame = null;
  });
}

document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!(event.target instanceof Element)) return;

  const link = event.target.closest('a[href^="#"]');
  if (!link?.hash || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;

  const target = document.getElementById(link.hash.slice(1));
  if (!target) return;

  const projectValue = link.dataset.quoteProject;
  if (projectValue) {
    const form = document.getElementById('quote-form');
    const fields = document.getElementById('quote-fields');
    const projectField = form?.elements.namedItem('project');
    const hasOption = [...(projectField?.options ?? [])].some((option) => option.value === projectValue);
    if (projectField && hasOption && !fields?.disabled) {
      projectField.value = projectValue;
      projectField.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  setNavigation(false);
  target.focus({ preventScroll: true });
});

updateHeader();
updateActiveNavigation();
window.addEventListener('scroll', handleScroll, { passive: true });
window.addEventListener('resize', () => {
  updateActiveNavigation();
  const activeElement = document.activeElement;
  if (header?.contains(activeElement) && !activeElement.getClientRects().length) {
    const target = mobileNav.matches ? navToggle : navLinks[0];
    target?.focus({ preventScroll: true });
  }
});
window.addEventListener('pageshow', handleScroll);
window.addEventListener('load', handleScroll, { once: true });
document.addEventListener('languagechange', () => {
  navToggle?.setAttribute('aria-label', t(body.classList.contains('nav-open') ? 'Close navigation' : 'Open navigation'));
  updateActiveNavigation();
});

document.querySelectorAll('[data-config-link]').forEach((link) => {
  const destination = config.links?.[link.dataset.configLink];
  if (destination) link.href = destination;
});

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

function normalizePhoneNumber(phone) {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits ? `+${digits}` : '';
}

function createQuoteMessage({ name, city, project, details, preferredContact, email, phone }) {
  const businessName = business.publicName ?? 'The Corner Stone Masonry';
  const contactName = business.contactShortName ?? 'Roy';
  const contactPreference = { email: t('Email'), text: t('Text message'), call: t('Phone call') }[preferredContact];
  return [
    t('Hi {contactName}, I would like a free quote from {businessName}.', { contactName, businessName }),
    '',
    t('Name: {name}', { name }),
    t('Project city: {city}', { city }),
    t('Project type: {project}', { project: t(project) }),
    ...(contactPreference ? [t('Preferred reply: {contactPreference}', { contactPreference })] : []),
    ...(email ? [t('Email: {email}', { email })] : []),
    ...(phone ? [t('Phone: {phone}', { phone })] : []),
    t('Details: {details}', { details })
  ].join('\n');
}

function createQuoteSmsUrl(data) {
  const phone = normalizePhoneNumber(business.phone ?? '+1-217-816-0869');
  return `sms:${phone}?body=${encodeURIComponent(createQuoteMessage(data))}`;
}

function createQuoteEmailUrl(data) {
  const email = business.email ?? 'thecornerstonemasonryllc@gmail.com';
  const subject = t('Masonry quote request — {city}', { city: data.city });
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(createQuoteMessage(data))}`;
}

function getFormspreeEndpoint(value) {
  return typeof value === 'string' && value === value.trim()
    && /^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(value) ? value : '';
}

function isSuccessfulSubmission(response, payload) {
  // Formspree's official client identifies a successful server response by `next`.
  // https://github.com/formspree/formspree-js/blob/main/packages/formspree-core/src/submission.ts
  return Boolean(response.ok && payload && typeof payload === 'object' && !Array.isArray(payload)
    && typeof payload.next === 'string' && payload.ok !== false && !('error' in payload) && !('errors' in payload));
}

window.CornerStoneQuote = Object.freeze({
  createMessage: createQuoteMessage,
  createSmsUrl: createQuoteSmsUrl,
  createEmailUrl: createQuoteEmailUrl,
  getFormspreeEndpoint,
  isSuccessfulSubmission
});

const quoteForm = document.getElementById('quote-form');
const quoteStatus = document.getElementById('quote-status');
const quotePreview = document.getElementById('quote-preview');
const quoteMessage = document.getElementById('quote-message');
const quoteText = document.getElementById('quote-text');
const quoteEmail = document.getElementById('quote-email');
const quoteCopy = document.getElementById('quote-copy');
const quoteError = document.getElementById('quote-error');
const quoteSubmit = document.getElementById('quote-submit');
const quoteFallback = document.getElementById('quote-fallback');
const quoteHelper = document.getElementById('quote-helper');
const quoteFieldset = document.getElementById('quote-fields');
const quoteContactFields = document.getElementById('quote-contact-fields');

if (quoteForm && quotePreview && quoteMessage && quoteText && quoteEmail && quoteCopy && quoteSubmit && quoteFieldset) {
  const endpoint = getFormspreeEndpoint(config.forms?.formspreeEndpoint);
  const editableFields = [...quoteForm.querySelectorAll('input:not([type="hidden"]), textarea, select')];
  const emailField = quoteForm.elements.namedItem('email');
  const phoneField = quoteForm.elements.namedItem('phone');
  const preferenceField = quoteForm.elements.namedItem('preferredContact');
  const emailLabel = document.getElementById('quote-email-label');
  const phoneLabel = document.getElementById('quote-phone-label');
  const fieldLabels = {
    name: 'Name', city: 'Project city', project: 'Project type', details: 'Project details',
    email: 'Email', phone: 'Phone', preferredContact: 'Preferred reply'
  };
  const submitLabel = endpoint ? 'Send quote request' : 'Review quote request';
  let pending = false;
  let preparedRequest = null;
  let statusMessage = '';
  let errorMessage = '';
  let submissionError = null;
  const validationMessages = new Map();

  function showStatus(message) {
    statusMessage = message;
    if (quoteStatus) quoteStatus.textContent = t(message);
  }

  function showError(message) {
    errorMessage = message;
    submissionError = null;
    if (quoteError) quoteError.textContent = t(message);
  }

  function setFieldError(field, message, { server = false } = {}) {
    validationMessages.set(field, { message, server });
    field.setCustomValidity(server && i18n?.language === 'es' ? t('Please check this field.') : t(message));
    field.setAttribute('aria-invalid', 'true');
  }

  function updateContactRequirements({ composing = false } = {}) {
    const needsReplyContact = Boolean(endpoint && !composing);
    const needsPhone = preferenceField?.value === 'text' || preferenceField?.value === 'call';
    if (emailField) emailField.required = needsReplyContact && !needsPhone;
    if (phoneField) phoneField.required = needsReplyContact && needsPhone;
    if (emailLabel) emailLabel.textContent = t(emailField?.required ? 'Email (required)' : 'Email (optional)');
    if (phoneLabel) phoneLabel.textContent = t(phoneField?.required ? 'Phone (required)' : 'Phone (optional)');
  }

  function clearFeedback() {
    quotePreview.hidden = true;
    preparedRequest = null;
    showStatus('');
    showError('');
    validationMessages.clear();
    editableFields.forEach((field) => {
      field.setCustomValidity('');
      field.removeAttribute('aria-invalid');
    });
  }

  function readRequest(data) {
    return {
      name: String(data.get('name') ?? ''),
      city: String(data.get('city') ?? ''),
      project: String(data.get('project') ?? ''),
      details: String(data.get('details') ?? ''),
      preferredContact: endpoint ? String(data.get('preferredContact') ?? '') : '',
      email: String(data.get('email') ?? ''),
      phone: String(data.get('phone') ?? '')
    };
  }

  function validateRequest({ composing = false } = {}) {
    clearFeedback();
    editableFields.forEach((field) => { field.value = field.value.trim(); });
    updateContactRequirements({ composing });
    editableFields.forEach((field) => {
      if (field.disabled || field.readOnly) return;
      if (field.required && !field.value) {
        setFieldError(field, field.name === 'project' ? 'Please choose a project type.' : 'Please fill out this field.');
      } else if (field.type === 'email' && field.value && field.validity?.typeMismatch) {
        setFieldError(field, 'Please enter a valid email address.');
      } else if (field === phoneField && field.value) {
        const digits = field.value.replace(/\D/g, '');
        if (digits.length < 7 || digits.length > 15) setFieldError(field, 'Please enter a phone number with 7 to 15 digits.');
      } else if (field.validity && !field.validity.valid) {
        setFieldError(field, 'Please check this field.');
      }
    });
    const valid = quoteForm.reportValidity();
    updateContactRequirements();
    return valid;
  }

  function prepareMessage() {
    if (pending || !validateRequest({ composing: true })) return;
    preparedRequest = readRequest(new FormData(quoteForm));
    renderPreparedMessage();
    quotePreview.hidden = false;
    showStatus('Your request is ready to review. Nothing has been sent.');
    quotePreview.focus();
  }

  function renderPreparedMessage() {
    if (!preparedRequest) return;
    quoteMessage.value = createQuoteMessage(preparedRequest);
    quoteText.href = createQuoteSmsUrl(preparedRequest);
    quoteEmail.href = createQuoteEmailUrl(preparedRequest);
  }

  function setPending(sending) {
    pending = sending;
    quoteFieldset.disabled = sending;
    quoteSubmit.disabled = sending;
    if (quoteFallback) quoteFallback.disabled = sending;
    quoteSubmit.textContent = t(sending ? 'Sending…' : submitLabel);
    quoteForm.setAttribute('aria-busy', String(sending));
  }

  function showSubmissionError(response, payload) {
    showStatus('');
    submissionError = { response, payload };
    const fieldMessages = [];
    if (Array.isArray(payload?.errors)) {
      payload.errors.forEach((error) => {
        if (!error || typeof error.field !== 'string' || !Object.hasOwn(fieldLabels, error.field)) return;
        const field = quoteForm.elements.namedItem(error.field);
        if (!field?.setCustomValidity) return;
        const message = typeof error.message === 'string' && error.message.trim()
          ? error.message.trim().slice(0, 240) : 'Please check this field.';
        setFieldError(field, message, { server: true });
        fieldMessages.push(`${t(fieldLabels[error.field])}: ${i18n?.language === 'es' ? t('Please check this field.') : message}`);
      });
    }
    let message = 'Your request could not be sent. Your information is still here. Please try again later or prepare a text or email instead.';
    if (response.status === 429) {
      message = 'Quote requests are temporarily unavailable. Your information is still here. Please try again later or prepare a text or email instead.';
    } else if (fieldMessages.length) {
      message = 'Please check these fields and send again. {fields}';
    } else if (response.ok) {
      message = 'We could not confirm whether your request was received. Your information is still here. Please contact Roy before sending it again.';
    }
    if (quoteError) quoteError.textContent = t(message, { fields: fieldMessages.join(' ') });
  }

  quoteForm.addEventListener('input', () => {
    if (pending) return;
    clearFeedback();
    updateContactRequirements();
  });
  quoteForm.addEventListener('change', () => {
    if (pending) return;
    clearFeedback();
    updateContactRequirements();
  });

  quoteForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (pending) return;
    if (!endpoint) {
      prepareMessage();
      return;
    }
    if (!validateRequest()) return;

    // Collect data before disabling the fieldset: disabled fields are excluded from FormData.
    const data = new FormData(quoteForm);
    ['email', 'phone'].forEach((name) => {
      if (!data.get(name)) data.delete(name);
    });
    data.set('message', createQuoteMessage(readRequest(data)));
    data.set('_subject', t('New masonry quote request'));
    data.set('language', i18n?.language ?? 'en');
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, 20000);
    setPending(true);
    showStatus('Sending your quote request…');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      const payload = await response.json().catch(() => null);
      if (controller.signal.aborted) throw new Error('Request timed out');
      if (isSuccessfulSubmission(response, payload)) {
        quoteForm.reset();
        updateContactRequirements();
        showStatus('Your request was received. Roy can follow up using the contact details you provided.');
      } else {
        showSubmissionError(response, payload);
      }
    } catch {
      showStatus('');
      showError(controller.signal.aborted
        ? 'The request took too long, so we could not confirm whether it was received. Your information is still here. Please contact Roy before sending it again.'
        : 'We could not confirm whether your request was received. Your information is still here. Check your connection and contact Roy before sending it again.');
    } finally {
      clearTimeout(timeout);
      setPending(false);
    }
  });

  quoteFallback?.addEventListener('click', prepareMessage);

  quoteCopy.addEventListener('click', async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(quoteMessage.value);
      showStatus('Message copied. Paste it into your preferred messaging or email app. Nothing has been sent.');
    } catch {
      quoteMessage.focus();
      quoteMessage.select();
      showStatus('Select and copy the message, then paste it into your preferred messaging or email app. Nothing has been sent.');
    }
  });

  quoteForm.noValidate = true;
  if (endpoint) quoteForm.action = endpoint;
  else quoteForm.removeAttribute('action');
  if (quoteFallback) quoteFallback.hidden = !endpoint;
  if (quoteContactFields) quoteContactFields.hidden = !endpoint;

  function renderFormLanguage() {
    quoteSubmit.textContent = t(pending ? 'Sending…' : submitLabel);
    if (quoteHelper) quoteHelper.textContent = t(endpoint
      ? 'Your contact and project details go to The Corner Stone Masonry through Formspree to respond to your request. Prefer another way? Prepare a text or email instead.'
      : 'Describe your project, then choose text or email to send your request to Roy. You will review the message before sending it.');
    updateContactRequirements();
    renderPreparedMessage();
    validationMessages.forEach(({ message, server }, field) => {
      field.setCustomValidity(server && i18n?.language === 'es' ? t('Please check this field.') : t(message));
    });
    if (submissionError) showSubmissionError(submissionError.response, submissionError.payload);
    else if (quoteError) quoteError.textContent = t(errorMessage);
    if (quoteStatus) quoteStatus.textContent = t(statusMessage);
  }

  document.addEventListener('languagechange', renderFormLanguage);
  renderFormLanguage();
  quoteForm.hidden = false;
}
