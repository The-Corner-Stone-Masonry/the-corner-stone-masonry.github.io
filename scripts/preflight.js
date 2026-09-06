const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const productionDomain = 'thecornerstonemasonry.net';

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

const config = read('site-config.js');
const html = read('index.html');
const sitemap = read('sitemap.xml');
const cname = read('CNAME').trim();
const manifest = JSON.parse(read('site.webmanifest'));
const errors = [];
const configContext = { window: {} };
vm.runInNewContext(config, configContext, { filename: 'site-config.js', timeout: 1000 });
const { business, forms } = configContext.window.CornerStoneConfig;
const formspreeEndpoint = forms?.formspreeEndpoint ?? '';
if (typeof formspreeEndpoint !== 'string' || (formspreeEndpoint && (formspreeEndpoint !== formspreeEndpoint.trim() || !/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(formspreeEndpoint)))) {
  errors.push('Formspree endpoint must be empty or a public https://formspree.io/f/ endpoint.');
}
if (!formspreeEndpoint && process.argv.includes('--require-formspree')) {
  errors.push('Configure forms.formspreeEndpoint in site-config.js before enabling direct quote submissions.');
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'));
  return match ? (match[1] ?? match[2]) : null;
}

// Ignore comments and script contents when checking markup attributes.
const markup = html.replace(/<!--[\s\S]*?-->/g, '')
  .replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1</script>');
const tags = [...markup.matchAll(/<[a-z][^>]*>/gi)].map(([tag]) => tag);
const quoteFormTag = tags.find((tag) => /^<form\b/i.test(tag) && attribute(tag, 'id') === 'quote-form');
if (!quoteFormTag || attribute(quoteFormTag, 'method')?.toLowerCase() !== 'post') {
  errors.push('The quote form must use POST so customer details are not placed in the page URL.');
}
const projectOptions = [...html.matchAll(/<option\b([^>]*)>([^<]*)<\/option>/gi)]
  .map(([, attributes, label]) => attribute(`<option ${attributes}>`, 'value') ?? label);
for (const tag of tags) {
  const project = attribute(tag, 'data-quote-project');
  if (project !== null && !projectOptions.includes(project)) errors.push(`Service link has no matching project option: ${project}`);
}

function localFile(reference) {
  if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) return null;
  const pathname = reference.split(/[?#]/)[0];
  if (!pathname) return null;
  const resolved = path.resolve(root, decodeURIComponent(pathname).replace(/^[/\\]+/, ''));
  const relative = path.relative(root, resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('path leaves the site directory');
  }
  return resolved;
}

const placeholderPattern = /\[[A-Z][A-Z0-9 _:-]+\]/g;
const placeholders = [...new Set(
  [config, html, sitemap].flatMap((source) => source.match(placeholderPattern) || [])
)];

const localReferences = tags.flatMap((tag) => [attribute(tag, 'src'), attribute(tag, 'href')]);
if (!Array.isArray(manifest.icons) || !manifest.icons.length) {
  errors.push('Web manifest must include an icon.');
} else {
  for (const icon of manifest.icons) {
    if (typeof icon.src !== 'string' || !icon.src.trim()) {
      errors.push('Each web manifest icon must have a src.');
    } else {
      localReferences.push(icon.src);
    }
  }
}
const missingLocalReferences = [];
for (const reference of new Set(localReferences.filter(Boolean))) {
  try {
    const filename = localFile(reference);
    if (filename && !fs.existsSync(filename)) missingLocalReferences.push(reference);
  } catch (error) {
    errors.push(`Invalid local reference ${reference}: ${error.message}.`);
  }
}

const ids = tags.map((tag) => attribute(tag, 'id')).filter((id) => id !== null);
const idSet = new Set(ids);
const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
if (duplicateIds.length) errors.push(`Duplicate element IDs: ${duplicateIds.join(', ')}`);

const anchors = tags.filter((tag) => /^<a\b/i.test(tag))
  .map((tag) => attribute(tag, 'href')).filter(Boolean);
for (const reference of new Set(anchors)) {
  const contact = reference.match(/^(tel|sms|mailto):([^?&#]*)/i);
  if (contact) {
    const scheme = contact[1].toLowerCase();
    try {
      const recipient = decodeURIComponent(contact[2]).trim();
      const actual = scheme === 'mailto' ? recipient.toLowerCase() : recipient.replace(/\D/g, '');
      const expected = scheme === 'mailto' ? business.email.toLowerCase() : business.phone.replace(/\D/g, '');
      if (actual !== expected) errors.push(`Static ${scheme}: recipient must match site-config.js.`);
    } catch (error) {
      errors.push(`Invalid ${scheme}: recipient: ${error.message}.`);
    }
  }
  if (!reference.includes('#')) continue;
  try {
    // Resolve relative and absolute links before checking this page's fragments.
    const target = new URL(reference, business.websiteUrl);
    const page = new URL(business.websiteUrl);
    const samePage = target.origin === page.origin &&
      [page.pathname, `${page.pathname}index.html`].includes(target.pathname);
    if (samePage && target.hash && !idSet.has(decodeURIComponent(target.hash.slice(1)))) {
      errors.push(`Anchor target does not exist: ${reference}`);
    }
  } catch (error) {
    errors.push(`Invalid anchor ${reference}: ${error.message}.`);
  }
}

const canonicalUrls = tags.filter((tag) => /^<link\b/i.test(tag) &&
  (attribute(tag, 'rel') || '').split(/\s+/).includes('canonical'))
  .map((tag) => attribute(tag, 'href'));
const openGraphUrls = tags.filter((tag) => /^<meta\b/i.test(tag) && attribute(tag, 'property') === 'og:url')
  .map((tag) => attribute(tag, 'content'));
if (business.websiteUrl !== `https://${productionDomain}/`) {
  errors.push('Configured website URL must use the production domain.');
}
if (canonicalUrls.length !== 1 || canonicalUrls[0] !== business.websiteUrl) {
  errors.push('Canonical URL must match site-config.js.');
}
if (openGraphUrls.length !== 1 || openGraphUrls[0] !== business.websiteUrl) {
  errors.push('Open Graph URL must match site-config.js.');
}

const structuredData = [];
for (const [, openingTag, contents] of html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script\s*>/gi)) {
  if (attribute(openingTag, 'type') !== 'application/ld+json') continue;
  try {
    const parsed = JSON.parse(contents);
    const entries = Array.isArray(parsed) ? parsed : [parsed];
    for (const entry of entries) {
      structuredData.push(...(Array.isArray(entry?.['@graph']) ? entry['@graph'] : [entry]));
    }
  } catch (error) {
    errors.push(`Invalid inline JSON-LD: ${error.message}`);
  }
}
const businessSchemas = structuredData.filter((entry) => entry &&
  [entry['@type']].flat().includes('HomeAndConstructionBusiness'));
if (!businessSchemas.length) errors.push('JSON-LD must include the masonry business.');
for (const schema of businessSchemas) {
  for (const [field, expected] of Object.entries({
    name: business.publicName,
    url: business.websiteUrl,
    telephone: business.phone,
    email: business.email
  })) {
    if (schema[field] !== expected) errors.push(`JSON-LD ${field} must match site-config.js.`);
  }
}

const unsupportedPublicClaims = [
  /family-owned/i,
  /free estimate/i,
  /licensed and insured/i,
  /\bLLC\b/i,
  /\(217\) 555/i,
  /info@thecornerstonemasonry/i
].filter((pattern) => pattern.test(html));

const restrictedAssets = [
  'commercial-brick-storefront-pueblo-lindo.webp',
  'interior-brick-opening-in-progress.webp',
  'stone-address-sign-pillar.webp',
  'stone-mailbox-pillar.webp'
].filter((filename) => html.includes(filename));

const imageTags = tags.filter((tag) => /^<img\b/i.test(tag));
const imagesWithoutAlt = imageTags.filter((tag) => attribute(tag, 'alt') === null);
const imagesWithoutDimensions = imageTags.filter((tag) =>
  !/^[1-9]\d*$/.test(attribute(tag, 'width') || '') || !/^[1-9]\d*$/.test(attribute(tag, 'height') || ''));

if (cname !== productionDomain) errors.push(`CNAME must contain ${productionDomain}.`);
if (!sitemap.includes(`https://${productionDomain}/`)) errors.push('Sitemap does not use the production domain.');
if (manifest.start_url !== './') errors.push('Web manifest start_url must remain relative for GitHub Pages.');
if (placeholders.length) errors.push(`Unverified placeholders: ${placeholders.join(', ')}`);
if (missingLocalReferences.length) errors.push(`Missing local files: ${missingLocalReferences.join(', ')}`);
if (unsupportedPublicClaims.length) errors.push(`Unsupported public claims: ${unsupportedPublicClaims.map(String).join(', ')}`);
if (restrictedAssets.length) errors.push(`Restricted assets need approval: ${restrictedAssets.join(', ')}`);
if (imagesWithoutAlt.length) errors.push(`${imagesWithoutAlt.length} image(s) are missing alt text.`);
if (imagesWithoutDimensions.length) errors.push(`${imagesWithoutDimensions.length} image(s) are missing dimensions.`);

if (errors.length) {
  console.error('Production preflight failed.');
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('Production preflight passed.');
if (!formspreeEndpoint) console.log('Formspree is not configured; quote requests use the text/email composer.');
