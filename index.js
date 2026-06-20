const body = document.body;
const header = document.querySelector('[data-header]');
const nav = document.getElementById('primary-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = [...document.querySelectorAll('.nav-link')];
const mobileNav = window.matchMedia('(max-width: 1000px)');
const config = window.CornerStoneConfig ?? {};
const business = config.business ?? {};
const scrollStorageKey = `corner-stone-scroll:${window.location.pathname}${window.location.search}`;

function getNavigationType() {
  const navigationEntries = performance.getEntriesByType?.('navigation');
  const navigationType = navigationEntries?.[0]?.type;
  if (navigationType) return navigationType;
  return performance.navigation?.type === 1 ? 'reload' : 'navigate';
}

function clearLocationHash() {
  if (!window.location.hash) return;

  try {
    history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  } catch {
    // Navigation still works if a browser restricts history updates.
  }
}

function readSavedScrollPosition() {
  try {
    const storedPosition = sessionStorage.getItem(scrollStorageKey);
    if (storedPosition === null) return null;

    const savedPosition = Number(storedPosition);
    return Number.isFinite(savedPosition) ? savedPosition : null;
  } catch {
    return null;
  }
}

function saveScrollPosition() {
  try {
    sessionStorage.setItem(scrollStorageKey, String(Math.round(window.scrollY)));
  } catch {
    // Browsing still works when storage is unavailable.
  }
}

const navigationType = getNavigationType();
const savedScrollPosition = navigationType === 'reload' ? readSavedScrollPosition() : null;

if (navigationType === 'reload') clearLocationHash();

function setNavigation(open) {
  const shouldOpen = Boolean(open && mobileNav.matches);
  body.classList.toggle('nav-open', shouldOpen);
  navToggle?.setAttribute('aria-expanded', String(shouldOpen));
  navToggle?.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');
  nav?.setAttribute('aria-hidden', String(mobileNav.matches && !shouldOpen));
}

navToggle?.addEventListener('click', () => setNavigation(!body.classList.contains('nav-open')));
nav?.addEventListener('click', (event) => {
  if (event.target instanceof Element && event.target.closest('.nav-link')) setNavigation(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setNavigation(false);
});
mobileNav.addEventListener('change', () => setNavigation(false));
setNavigation(false);

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
    link.classList.toggle('is-active', section === activeSection);
  });
}

let scrollFrame = null;
function handleScroll() {
  if (scrollFrame !== null) return;

  scrollFrame = requestAnimationFrame(() => {
    updateHeader();
    updateActiveNavigation();
    saveScrollPosition();
    scrollFrame = null;
  });
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element)) return;

  const link = event.target.closest('a[href^="#"]');
  if (!link?.hash) return;

  const target = document.querySelector(link.hash);
  if (!target) return;

  event.preventDefault();
  setNavigation(false);

  if (link.classList.contains('skip-link')) target.focus({ preventScroll: true });

  const targetTop = Math.max(
    0,
    window.scrollY + target.getBoundingClientRect().top - (header?.offsetHeight ?? 0)
  );
  window.scrollTo(0, targetTop);
  clearLocationHash();
});

function restoreScrollPosition() {
  if (savedScrollPosition === null) return;

  const documentElement = document.documentElement;
  const previousScrollBehavior = documentElement.style.scrollBehavior;
  documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, savedScrollPosition);
  documentElement.style.scrollBehavior = previousScrollBehavior;
  updateHeader();
  updateActiveNavigation();
}

restoreScrollPosition();
updateHeader();
updateActiveNavigation();
window.addEventListener('scroll', handleScroll, { passive: true });
window.addEventListener('resize', updateActiveNavigation);
window.addEventListener('pagehide', saveScrollPosition);
window.addEventListener('load', restoreScrollPosition, { once: true });

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

function createQuoteSmsUrl({ name, city, project, details }) {
  const businessName = business.publicName ?? 'The Corner Stone Masonry';
  const contactName = business.contactShortName ?? 'Roy';
  const phone = normalizePhoneNumber(business.phone ?? '+1-217-816-0869');
  const message = [
    `Hi ${contactName}, I would like a free quote from ${businessName}.`,
    '',
    `Name: ${name}`,
    `Project city: ${city}`,
    `Project type: ${project}`,
    `Details: ${details}`
  ].join('\n');

  return `sms:${phone}?body=${encodeURIComponent(message)}`;
}

window.CornerStoneQuote = Object.freeze({ createSmsUrl: createQuoteSmsUrl });

const quoteForm = document.getElementById('quote-form');
const quoteStatus = document.getElementById('quote-status');

quoteForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!quoteForm.checkValidity()) {
    quoteForm.reportValidity();
    return;
  }

  const data = new FormData(quoteForm);
  const smsUrl = createQuoteSmsUrl({
    name: String(data.get('name') ?? '').trim(),
    city: String(data.get('city') ?? '').trim(),
    project: String(data.get('project') ?? '').trim(),
    details: String(data.get('details') ?? '').trim()
  });

  if (quoteStatus) quoteStatus.textContent = 'Opening your messaging app…';
  window.location.href = smsUrl;
});
