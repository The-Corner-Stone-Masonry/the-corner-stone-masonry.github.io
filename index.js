const body = document.body;
const header = document.querySelector('[data-header]');
const nav = document.getElementById('primary-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = [...document.querySelectorAll('.nav-link')];
const mobileNav = window.matchMedia('(max-width: 1000px)');
const config = window.CornerStoneConfig ?? {};
const business = config.business ?? {};
const pageContent = [...document.querySelectorAll('main, .site-footer')];

function setNavigation(open, { returnFocus = false } = {}) {
  const shouldOpen = Boolean(open && mobileNav.matches);
  body.classList.toggle('nav-open', shouldOpen);
  navToggle?.setAttribute('aria-expanded', String(shouldOpen));
  navToggle?.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');
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
  const contactPreference = { email: 'Email', text: 'Text message', call: 'Phone call' }[preferredContact];
  return [
    `Hi ${contactName}, I would like a free quote from ${businessName}.`,
    '',
    `Name: ${name}`,
    `Project city: ${city}`,
    `Project type: ${project}`,
    ...(contactPreference ? [`Preferred reply: ${contactPreference}`] : []),
    ...(email ? [`Email: ${email}`] : []),
    ...(phone ? [`Phone: ${phone}`] : []),
    `Details: ${details}`
  ].join('\n');
}

function createQuoteSmsUrl(data) {
  const phone = normalizePhoneNumber(business.phone ?? '+1-217-816-0869');
  return `sms:${phone}?body=${encodeURIComponent(createQuoteMessage(data))}`;
}

function createQuoteEmailUrl(data) {
  const email = business.email ?? 'thecornerstonemasonryllc@gmail.com';
  const subject = `Masonry quote request — ${data.city}`;
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

  function updateContactRequirements({ composing = false } = {}) {
    const needsReplyContact = Boolean(endpoint && !composing);
    const needsPhone = preferenceField?.value === 'text' || preferenceField?.value === 'call';
    if (emailField) emailField.required = needsReplyContact && !needsPhone;
    if (phoneField) phoneField.required = needsReplyContact && needsPhone;
    if (emailLabel) emailLabel.textContent = emailField?.required ? 'Email (required)' : 'Email (optional)';
    if (phoneLabel) phoneLabel.textContent = phoneField?.required ? 'Phone (required)' : 'Phone (optional)';
  }

  function clearFeedback() {
    quotePreview.hidden = true;
    if (quoteStatus) quoteStatus.textContent = '';
    if (quoteError) quoteError.textContent = '';
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
    if (phoneField?.value) {
      const digits = phoneField.value.replace(/\D/g, '');
      if (digits.length < 7 || digits.length > 15) {
        phoneField.setCustomValidity('Please enter a phone number with 7 to 15 digits.');
      }
    }
    const valid = quoteForm.reportValidity();
    updateContactRequirements();
    return valid;
  }

  function prepareMessage() {
    if (pending || !validateRequest({ composing: true })) return;
    const request = readRequest(new FormData(quoteForm));
    quoteMessage.value = createQuoteMessage(request);
    quoteText.href = createQuoteSmsUrl(request);
    quoteEmail.href = createQuoteEmailUrl(request);
    quotePreview.hidden = false;
    if (quoteStatus) quoteStatus.textContent = 'Your request is ready to review. Nothing has been sent.';
    quotePreview.focus();
  }

  function setPending(sending) {
    pending = sending;
    quoteFieldset.disabled = sending;
    quoteSubmit.disabled = sending;
    if (quoteFallback) quoteFallback.disabled = sending;
    quoteSubmit.textContent = sending ? 'Sending…' : submitLabel;
    quoteForm.setAttribute('aria-busy', String(sending));
  }

  function showSubmissionError(response, payload) {
    if (quoteStatus) quoteStatus.textContent = '';
    const fieldMessages = [];
    if (Array.isArray(payload?.errors)) {
      payload.errors.forEach((error) => {
        if (!error || typeof error.field !== 'string' || !Object.hasOwn(fieldLabels, error.field)) return;
        const field = quoteForm.elements.namedItem(error.field);
        if (!field?.setCustomValidity) return;
        const message = typeof error.message === 'string' && error.message.trim()
          ? error.message.trim().slice(0, 240) : 'Please check this field.';
        field.setCustomValidity(message);
        field.setAttribute('aria-invalid', 'true');
        fieldMessages.push(`${fieldLabels[error.field]}: ${message}`);
      });
    }
    let message = 'Your request could not be sent. Your information is still here. Please try again later or prepare a text or email instead.';
    if (response.status === 429) {
      message = 'Quote requests are temporarily unavailable. Your information is still here. Please try again later or prepare a text or email instead.';
    } else if (fieldMessages.length) {
      message = `Please check these fields and send again. ${fieldMessages.join(' ')}`;
    } else if (response.ok) {
      message = 'We could not confirm whether your request was received. Your information is still here. Please contact Roy before sending it again.';
    }
    if (quoteError) quoteError.textContent = message;
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
    const controller = new AbortController();
    const timeout = setTimeout(() => { controller.abort(); }, 20000);
    setPending(true);
    if (quoteStatus) quoteStatus.textContent = 'Sending your quote request…';
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
        if (quoteStatus) quoteStatus.textContent = 'Your request was received. Roy can follow up using the contact details you provided.';
      } else {
        showSubmissionError(response, payload);
      }
    } catch {
      if (quoteStatus) quoteStatus.textContent = '';
      if (quoteError) quoteError.textContent = controller.signal.aborted
        ? 'The request took too long, so we could not confirm whether it was received. Your information is still here. Please contact Roy before sending it again.'
        : 'We could not confirm whether your request was received. Your information is still here. Check your connection and contact Roy before sending it again.';
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
      if (quoteStatus) quoteStatus.textContent = 'Message copied. Paste it into your preferred messaging or email app. Nothing has been sent.';
    } catch {
      quoteMessage.focus();
      quoteMessage.select();
      if (quoteStatus) quoteStatus.textContent = 'Select and copy the message, then paste it into your preferred messaging or email app. Nothing has been sent.';
    }
  });

  quoteForm.noValidate = true;
  if (endpoint) quoteForm.action = endpoint;
  else quoteForm.removeAttribute('action');
  quoteSubmit.textContent = submitLabel;
  if (quoteFallback) quoteFallback.hidden = !endpoint;
  if (quoteContactFields) quoteContactFields.hidden = !endpoint;
  if (quoteHelper) quoteHelper.textContent = endpoint
    ? 'Your contact and project details go to The Corner Stone Masonry through Formspree to respond to your request. Prefer another way? Prepare a text or email instead.'
    : 'Describe your project, then choose text or email to send your request to Roy. You will review the message before sending it.';
  updateContactRequirements();
  quoteForm.hidden = false;
}
