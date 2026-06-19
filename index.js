const body = document.body;
const header = document.querySelector('[data-header]');
const nav = document.getElementById('primary-nav');
const navToggle = document.querySelector('.nav-toggle');
const navLinks = [...document.querySelectorAll('.nav-link')];
const mobileNav = window.matchMedia('(max-width: 1000px)');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const scrollStorageKey = `corner-stone-scroll:${window.location.pathname}${window.location.search}`;

function getNavigationType() {
  const navigationEntry = performance.getEntriesByType?.('navigation')[0];
  if (navigationEntry?.type) return navigationEntry.type;
  return performance.navigation?.type === 1 ? 'reload' : 'navigate';
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

if (navigationType === 'reload' && window.location.hash) {
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
}

function setNavigation(open) {
  const shouldOpen = Boolean(open && mobileNav.matches);
  body.classList.toggle('nav-open', shouldOpen);
  navToggle?.setAttribute('aria-expanded', String(shouldOpen));
  navToggle?.setAttribute('aria-label', shouldOpen ? 'Close navigation' : 'Open navigation');
  nav?.setAttribute('aria-hidden', String(mobileNav.matches && !shouldOpen));
}

navToggle?.addEventListener('click', () => setNavigation(!body.classList.contains('nav-open')));
nav?.addEventListener('click', (event) => {
  if (event.target.closest('.nav-link')) setNavigation(false);
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
  .filter(({ section }) => section);

function updateActiveNavigation() {
  if (!sectionLinks.length) return;

  const marker = window.scrollY + (header?.offsetHeight ?? 0) + Math.min(window.innerHeight * 0.22, 180);
  const orderedSections = [...sectionLinks].sort((a, b) => a.section.offsetTop - b.section.offsetTop);
  let activeSection = orderedSections[0].section;

  orderedSections.forEach(({ section }) => {
    if (section.offsetTop <= marker) activeSection = section;
  });

  const atPageEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
  if (atPageEnd) activeSection = orderedSections.at(-1).section;

  sectionLinks.forEach(({ link, section }) => {
    link.classList.toggle('is-active', section === activeSection);
  });
}

let scrollFrame;
function handleScroll() {
  if (scrollFrame) return;
  scrollFrame = requestAnimationFrame(() => {
    updateHeader();
    updateActiveNavigation();
    saveScrollPosition();
    scrollFrame = null;
  });
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link) return;

  const target = document.querySelector(link.hash);
  if (!target) return;

  event.preventDefault();
  setNavigation(false);
  history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
  target.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
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

const config = window.CornerStoneConfig;
if (config?.links) {
  document.querySelectorAll('[data-config-link]').forEach((link) => {
    const destination = config.links[link.dataset.configLink];
    if (destination) link.href = destination;
  });
}

document.getElementById('year').textContent = new Date().getFullYear();

const quoteForm = document.getElementById('quote-form');
const quoteStatus = document.getElementById('quote-status');

function createQuoteSmsUrl({ name, city, project, details }) {
  const message = [
    'Hi Roy, I would like a free quote from The Corner Stone Masonry.',
    '',
    `Name: ${name}`,
    `Project city: ${city}`,
    `Project type: ${project}`,
    `Details: ${details}`
  ].join('\n');

  return `sms:+12178160869?body=${encodeURIComponent(message)}`;
}

window.CornerStoneQuote = Object.freeze({ createSmsUrl: createQuoteSmsUrl });

quoteForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!quoteForm.checkValidity()) {
    quoteForm.reportValidity();
    return;
  }

  const data = new FormData(quoteForm);
  const smsUrl = createQuoteSmsUrl({
    name: data.get('name'),
    city: data.get('city'),
    project: data.get('project'),
    details: data.get('details')
  });

  quoteStatus.textContent = 'Opening your messaging app…';
  window.location.href = smsUrl;
});
