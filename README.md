# The Corner Stone Masonry

Static website for The Corner Stone Masonry in Springfield, Illinois. Plain HTML, CSS, and JavaScript on GitHub Pages; no production dependencies or build step.

## Local preview

Serve the project directory with any static file server:

```powershell
python -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## Verification

Run before publishing:

```powershell
npm run verify
```

Verification covers JavaScript syntax, deployment files, assets, internal links, image accessibility, business metadata, language switching, translation coverage, and quote-form regression tests. If npm is unavailable:

```powershell
node --check index.js
node --check motion.js
node --check i18n.js
node --check translations.js
node --check site-config.js
node --check scripts/preflight.js
node scripts/preflight.js
node --test scripts/quote.test.js scripts/i18n.test.js
```

If the bundled desktop runtime blocks test-worker creation, use `node --test --test-isolation=none scripts/quote.test.js scripts/i18n.test.js`. Tests mock all requests and never contact Formspree.

## Configuration

Business details, contact destinations, and the Formspree endpoint are in `site-config.js`. Search/social metadata and structured data stay in `index.html` for crawlers. Preflight checks keep these values consistent.

## Formspree setup

1. Create a form in Formspree and verify its notification inbox. Copy the public endpoint from the Integration tab; see [Formspree’s setup guide](https://help.formspree.io/articles/building-your-form/building-an-html-form/).
2. Set `forms.formspreeEndpoint` in `site-config.js` to your complete `https://formspree.io/f/` endpoint. Never put account passwords or API secrets in the site.
3. Check domain restrictions and server-side validation. Require name, city, project, and details; allow phone/text requests without an email address.
4. Run the activation check, then make a clearly marked live test and confirm receipt in both the Formspree dashboard and the destination inbox:

```powershell
node scripts/preflight.js --require-formspree
```

The endpoint is currently empty, so visitors use the text/email composer. A valid endpoint enables direct POST submission and the matching required reply field (email or phone). Pending requests block duplicate clicks; errors preserve entered details. Timeouts or unrecognized responses show an unconfirmed outcome without automatic retries. Success acknowledges Formspree receipt, not inbox delivery.

The form includes the `_gotcha` honeypot, but no CAPTCHA widget or photo-upload field. If your endpoint requires a CAPTCHA token, connect its widget before launch. Photos can be sent through the text/email links; confirm account upload support before adding uploads. Without JavaScript, direct contact links remain available.

## Navigation and accessibility

Section links use native anchors/history. The mobile menu supports keyboard focus, Escape, and short-screen scrolling; it stays visible without JavaScript. Keep the initial `hidden` attributes on the quote form and preview so incomplete enhancements are not exposed.

`motion.js` reveals `data-reveal` elements once on scroll. `data-reveal-delay` controls desktop staggering in milliseconds. Content defaults to visible; reduced motion, unsupported browsers, keyboard focus, section links, and printing have immediate-visibility fallbacks.

## Content and assets

The header's EN / ES buttons switch the entire page between English and Spanish without a reload. An explicit `?lang=en` or `?lang=es` link takes precedence over the saved choice; otherwise the site uses the saved preference, then Spanish for a Spanish-language browser or English for other browsers. A selection is remembered when browser storage is available. Form entries and project selections survive switching; generated messages and form feedback use the current language. Formspree receives a `language` field with the request. Language switching and direct submissions require JavaScript; contact links remain available without it.

English content lives in `index.html`; `translations.js` contains the Spanish equivalents for elements marked `data-i18n` and attributes listed in `data-i18n-attrs`. Mark only leaf text or wrap text in its own span to preserve links and icons. Dynamic form translations live beside their behavior in `index.js`; `i18n.js` applies the language and stores the preference. Keep project option values in English so service shortcuts and submitted categories stay consistent. These are translations of the website, not a claim about Roy's spoken languages. Spanish search indexing would require separate static language pages; the current switch shares one canonical page.

`assets/` contains only the eight images used by the page and manifest. Before adding photos, confirm publication permission, visible people/customer details, actual project scope, materials, and location. A photo alone does not establish those facts. Preflight retains guards against previously restricted images and unsupported business claims.

The excerpts attributed to Josh Siterlet and mitch curtis were verified on the [Google Business Profile](https://maps.app.goo.gl/jtYCjoKoGrFmHQuJ7) on September 5, 2026. Exact review dates and changing rating/count badges are not claimed.

Further content needs Roy’s current accepted/excluded services, coverage, quote/site-visit process, and an approved biography/team photo. Project stories need approved before/after photos and accurate job descriptions. Service links preselect the corresponding quote category; nearby service locations are confirmed through Roy.

## Deployment

`CNAME` sets `thecornerstonemasonry.net`; DNS is managed separately in Cloudflare. Publish to the existing GitHub Pages source, then verify public contact links and quote delivery. Local edits do not publish automatically. This workspace has no usable Git metadata identifying the repository or Pages branch/folder; obtain those before deployment.
