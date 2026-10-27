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

Section links use native anchors/history. The mobile menu supports keyboard focus, Escape, and short-screen scrolling; it stays visible without JavaScript. The small inline script before the stylesheet marks JavaScript-enabled pages before first paint, keeping the header fixed while its controls initialize. Keep it ahead of the stylesheet to avoid a mobile layout shift. Keep the initial `hidden` attributes on the quote form and preview so incomplete enhancements are not exposed.

`motion.js` reveals `data-reveal` elements once on scroll. `data-reveal-delay` controls desktop staggering in milliseconds. Content defaults to visible; reduced motion, unsupported browsers, keyboard focus, section links, and printing have immediate-visibility fallbacks.

## Content and assets

The header's EN / ES buttons switch the entire page between English and Spanish without a reload. Content fades out over 180 ms, changes language, then fades in over 320 ms; backgrounds and language controls stay visible. Initial rendering and reduced-motion preferences skip the fade. Rapid clicks honor the latest selection. An explicit `?lang=en` or `?lang=es` link takes precedence over the saved choice; otherwise the site uses the saved preference, then Spanish for a Spanish-language browser or English for other browsers. A selection is remembered when browser storage is available, and Back/Forward restores the language from the URL. Form entries and project selections survive switching; generated messages and form feedback use the current language. Formspree receives a `language` field with the request. Language switching and direct submissions require JavaScript; contact links remain available without it.

English content lives in `index.html`; `translations.js` contains the Spanish equivalents for elements marked `data-i18n` and attributes listed in `data-i18n-attrs`. Mark only leaf text or wrap text in its own span to preserve links and icons. Dynamic form translations live beside their behavior in `index.js`; `i18n.js` applies the language and stores the preference. Keep project option values in English so service shortcuts and submitted categories stay consistent. These are translations of the website, not a claim about Roy's spoken languages. Spanish search indexing would require separate static language pages; the current switch shares one canonical page.

`assets/` contains the eight original images and their responsive variants. Photos use AVIF with WebP fallback; logos use smaller transparent WebP files. The `sizes` attributes account for the gallery columns and the source width needed for `object-fit: cover`. Keep the originals for social previews and regeneration. To regenerate variants, make the `sharp` Node package available (through `NODE_PATH` when using a bundled runtime) and run `node scripts/optimize-images.cjs`; this is an authoring tool, not a production dependency. Preflight verifies local `srcset` files as well as ordinary image sources.

Before adding photos, confirm publication permission, visible people/customer details, actual project scope, materials, and location. A photo alone does not establish those facts. Preflight retains guards against previously restricted images and unsupported business claims.

The excerpts attributed to Josh Siterlet and mitch curtis were verified on the [Google Business Profile](https://maps.app.goo.gl/jtYCjoKoGrFmHQuJ7) on September 5, 2026. Exact review dates and changing rating/count badges are not claimed.

Further content needs Roy’s current accepted/excluded services, coverage, quote/site-visit process, and an approved biography/team photo. Project stories need approved before/after photos and accurate job descriptions. Service links preselect the corresponding quote category; nearby service locations are confirmed through Roy.

## Deployment

The public repository is [The-Corner-Stone-Masonry/the-corner-stone-masonry.github.io](https://github.com/The-Corner-Stone-Masonry/the-corner-stone-masonry.github.io), owned by the **The-Corner-Stone-Masonry organization**. Its default branch is `main`. This workspace has no usable Git metadata, so local edits do not publish automatically. Confirm the repository's Settings → Pages publishing source before deployment.

`CNAME` contains `thecornerstonemasonry.net`; DNS is managed separately in Cloudflare. A CNAME file alone does not verify ownership or release a domain assigned to another account. Custom GitHub Actions deployments use the domain in repository Pages settings and ignore this file.

### Recover the domain from the old GitHub account

1. As an organization owner, open **The-Corner-Stone-Masonry → Settings → Pages → Add a domain** and enter `thecornerstonemasonry.net`. Use the organization's Pages settings, not your personal account's settings or the repository's settings.
2. Add GitHub's exact generated TXT name and value in Cloudflare DNS. Return to GitHub and click **Verify** after DNS updates. Keep that TXT record afterward. GitHub says verification releases a domain used by another account unless the other account has already verified it. If it is already verified by the inaccessible account, contact [GitHub Support](https://support.github.com/contact) with the exact error, domain, new repository, old account if known, and evidence of DNS control. See [GitHub's domain verification guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages).
3. Once verified, open the **repository → Settings → Pages**, set **Custom domain** to `thecornerstonemasonry.net`, and save.
4. In Cloudflare, configure these hosting records, preserving mail and verification records:

   | Type | Name | Target |
   | --- | --- | --- |
   | A | `@` | `185.199.108.153` |
   | A | `@` | `185.199.109.153` |
   | A | `@` | `185.199.110.153` |
   | A | `@` | `185.199.111.153` |
   | CNAME | `www` | `the-corner-stone-masonry.github.io` |

5. Wait for GitHub's DNS check and certificate provisioning, then enable **Enforce HTTPS**. Check both the apex and `www` addresses, the current site content, phone/email links, and quote delivery once Formspree is configured. See [GitHub's custom-domain configuration guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).

Domain verification and DNS changes have not been performed from this workspace.
