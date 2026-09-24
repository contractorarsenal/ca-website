# CONTRACTOR ARSENAL — V6 DESIGN SYSTEM (CLAUDE.md)

This supersedes V5 below. V5 established the current nav/hero/Growth Library shape; that structure is unchanged. V6 is two combined passes that turned the design system into an actual system: (1) real interaction fixes (pulsing LIVE indicators, corrected homepage hero spacing, a from-scratch dropdown hover fix, the demo plan-selector moved inside the form, a real client-side Growth Library search with a results popover, six new Service Area pages), then (2) full header/hero/dropdown centralization so every page shares one spacing token system and one dropdown component instead of each page inventing its own numbers, plus a completely redesigned Services/Resources dropdown and the addition of Seattle King Roofing to the portfolio. Visual identity (black/white/gray/red, typography, five-tab nav) did not change.

## STACK

Static multi-page HTML site. No build step, no framework, no package.json.

- `styles.css` — shared design tokens + component classes, linked from every page. **Page-specific `<style>` blocks must never redefine `.page-hero` padding, `.nav-logo-mark` size, or `.nav-h`/hero-gap tokens.** Those are centralized (see HEADER + HERO SYSTEM below) specifically because per-page spacing overrides caused the site to swing between "too tight" and "too much whitespace" across several passes. Page `<style>` blocks are for layout that genuinely differs per page (grids, card visuals, page-specific components), not vertical rhythm.
- `main.js` — shared behavior: nav scroll-to-black, mobile nav toggle, scroll-reveal, count-up stats, FAQ accordion, nav-dropdown `aria-expanded` sync (visibility itself is pure CSS), demo plan-radio panel swap, Growth Library search + popover + tag filters, directory search/filter/sort, article TOC highlighting.
- Forms (`demo.html` #demoForm, `apply.html` #applyForm, `arsenal.html` #arsenal001Form) submit via inline `<script>` at the bottom of each page to Web3Forms/UseBasin. Field `name` attributes are the API contract, never rename them without checking the receiving Zap/automation.
- GTM `GTM-5PKHXQ2R` must stay byte-identical in the `<head>` and `<body>` noscript of every page. **Never hand-type this block into a new file.** Always `cp` an existing page and edit around it. Verify with: `for f in *.html resources/*.html service-areas/*.html; do grep -A3 "<!-- Google Tag Manager -->" "$f" | md5; done | sort | uniq -c` and confirm exactly one hash across all ~35 pages (excluding `dotcomjay/`, an unrelated project living in this folder that must never be touched).
- `[id]{scroll-margin-top:calc(var(--nav-h) + 20px);}` is global so anchor targets never land under the fixed nav.
- Background agents used for bulk content (new articles, new city pages) have self-reported success on work that was actually incomplete or unedited more than once. **Always independently verify agent-authored batches** (grep the actual files for leftover placeholder text, check title tags, diff against the template) rather than trusting the agent's own summary.

## HEADER + HERO TOKEN SYSTEM (new in V6, do not re-fragment)

All header and hero spacing lives in `:root` and two responsive tiers, nowhere else:

```
--nav-h:86px (desktop) → 80px (≤1024px) → 75px (≤640px)
--logo-w:88px (desktop) → 78px (≤640px, via --logo-w-mobile), aspect ratio locked via calc(var(--logo-w)/2.448)
--hero-gap-home / --hero-bottom-home   (TYPE A, homepage only)
--hero-gap-page / --hero-bottom-page   (TYPE B, every standard page)
--hero-headline-max:840px  --hero-copy-max:680px
```

- `.nav-logo-mark{height:calc(var(--logo-w) / 2.448);width:var(--logo-w);}` — one token controls both dimensions so aspect ratio can't drift. Never hardcode a page-specific logo size.
- `.page-hero` (base, in `styles.css`) sets TYPE B padding from the tokens above. Modifiers: `.page-hero--center` / `.page-hero--left` (text alignment + h-sub centering), `.page-hero--home` (TYPE A, homepage only, more breathing room). Every standard page's `<section class="page-hero page-hero--center">` (or `--left` for `services.html`/`about.html`) gets its spacing entirely from the shared class, zero inline padding. Homepage uses `<section class="page-hero page-hero--home">`.
- Article pages (`resources/*.html`) are TYPE C and keep their own distinct `.article-hero` component (tighter, reading-optimized) — that was already a single shared class before V6 and didn't need to change.
- `demo.html` also draws from the shared `.page-hero page-hero--center` system now, even though its layout (two-column form) is otherwise bespoke.
- If a future pass wants different breathing room on a specific page, **do not add inline `.page-hero{padding:...}` back**. Either it's a real TYPE-level change (edit the shared token) or it doesn't belong on that page.

## NAV (dropdown fully rebuilt in V6)

- **Five nav items, order fixed:** Work / **Services** (dropdown) / Pricing / **Resources** (dropdown) / Company, plus the `Get a Free Demo` CTA. This follows the buying process (prove → explain → price → demonstrate expertise → trust) and must not be reordered (Company does not move to the front).
- **Trigger is a real link, not a button.** `<a href="services.html" class="nav-drop-trigger">`/`<a href="resources.html" class="nav-drop-trigger">` — clicking the label itself navigates to the landing page; hovering (or `:focus-within`) opens the panel with no click required. This was a deliberate behavior change in V6.
- **Visibility is pure CSS**, `.nav-drop:hover .nav-drop-panel` / `.nav-drop:focus-within .nav-drop-panel`, with a `.nav-drop::after` invisible bridge (16px) covering the gap between trigger and panel so the cursor never "leaves" the hoverable region while moving down into it. **Do not reintroduce a JS `.open` class that toggles independently of hover** — that was the exact V5 bug (a click-opened dropdown had no way to close except an explicit outside click, so two dropdowns could end up open at once). `main.js`'s dropdown IIFE only syncs `aria-expanded` for screen readers now; it does not control visibility.
- **Dropdown panel visual language** (new in V6, distinctly Contractor Arsenal, not a generic floating white box): white background, 1px `--ink` border, 8px radius, small drop shadow, a small rotated-square caret pointing at the trigger (`.nav-drop-panel::before`). Services panel is 440px, single column, top `.nav-drop-label` in red uppercase, four `.nav-drop-row` items (eyebrow / bold title / description / right arrow that shifts +4px and reddens on hover, plus a red left bar that expands on hover), then a `.nav-drop-foot` with "Websites start at $297/mo" and "View All Services →". Resources panel is 540px (`.nav-drop-panel-wide`), a 2-column `.nav-drop-grid` (`grid-auto-flow:column` so the DOM order Websites/Search Visibility/Google Business/Leads/Google Ads/Trade Guides fills left-column-then-right-column, matching the intended layout), rows use `.nav-drop-row-compact` (title + description, no eyebrow/arrow), footer is a single centered "Browse the Growth Library →".
- Open/close motion: opacity 0→1 + translateY(6px→0) over ~160ms on open, a `visibility` delay on close so it doesn't feel sticky.
- Mobile nav is untouched by any of this: still `<details class="nav-mobile-drop">` accordion inside `.nav-mobile`, tap-to-expand, no floating dropdown boxes. `.nav-toggle` has 10px padding (44×44px tap target) and mobile entries have ~18px vertical padding.
- Nav still collapses to the hamburger at `1180px`.

## HEADER CONTRAST RULE (unchanged from V5)

Dark ink text and `mark-dark.png` on light/transparent-over-light nav states. Light (`--ink-inv`) text and `mark-light.png` on `.scrolled` and `.nav-on-dark:not(.scrolled)` states. Dropdown panels are always a light surface with dark ink text regardless of nav state. `arsenal.html` is the only page with `<header class="nav nav-on-dark">`.

## STRUCTURE THAT MUST NOT DRIFT

- `services.html` = **Websites** product page. `pricing.html` = **Pricing**. `seo.html` (filename kept on purpose) = **Search Visibility**, explaining SEO/AEO/GEO honestly with explicit no-guarantee language, especially for AEO/GEO.
- Homepage `.stat-strip` is a true 4-column CSS grid, 2×2 under 768px, with real per-cell mobile padding (`1.5rem` sides) — don't let cells butt against the viewport edge again.
- Homepage hero (`.page-hero.page-hero--home`) does **not** use `min-height:72vh` or forced flex-centering (that caused a huge blank-space complaint once already). Spacing comes entirely from `--hero-gap-home`/`--hero-bottom-home`.
- **Contractor Growth Library** (`resources.html`) has 6 categories (Websites, Search Visibility with SEO/AEO/GEO/LOCAL tag chips, Google Business, Leads, Google Ads, Trade Guides), a "Start Here" section, and 14 articles. Its search box now has a **real results popover** (`data-res-search-panel`, built from `[data-res-row]` title/description/category + `data-tags`/`data-keywords` attributes on each row for forgiving matching), keyboard arrow/enter/escape navigation, an empty state that always offers next steps, and a `.content-medium`-width toolbar so it reads as one centered component instead of stretching edge-to-edge. If a future pass can't keep the search actually working, the hard rule is to remove the search field entirely rather than ship a fake one.
- `demo.html`: the plan question (Not sure yet / Growth $297 / Growth+ $497 / Pro $997) is **inside the form itself** now, as four `.plan-radio` rows after the optional Current Website field, not a separate panel above the form. The left-column `.next-panel` still updates dynamically per selection (default reassurance copy, or per-plan price + short feature list), animated with a ~230ms fade-out/shift-up/fade-in (`main.js`, no CSS transition on `prefers-reduced-motion` since the global rule collapses durations). Submit button text is hard-locked to **"Get My Free Demo"**.
- **Service Areas** (`service-areas/`, new in V6): a hub (`service-areas/index.html`) plus six city pages (`seattle-`, `bellevue-`, `tacoma-`, `spokane-`, `everett-`, `redmond-wa-contractor-websites.html`), one shared 8-section template (hero, trade chips, search examples, SEO/AEO/GEO mini-grid, what's-included, recent work, pricing, FAQ) but genuinely different market-context copy per city, not city-swapped duplicates. Recent-work rows use the honest fallback framing ("Selected Contractor Arsenal work" or, on `everett-wa-contractor-websites.html`, a real local example) rather than inventing city-specific clients. Footer's Service Areas column links to all 6 + "View All Service Areas →" on every page site-wide.
- **LIVE status indicators** (`.tag-live`, `.build-status`, `.builds-head-tag`) use a shared `.live-dot`/`.live-dot-on-accent` component: small dot, opacity+scale+glow pulse at 1.4s, fully static under `prefers-reduced-motion` (explicit override, not just the global duration-collapse). Apply this component anywhere "LIVE" appears; don't hand-roll a new static badge.
- **Work directory / homepage Recent Builds**: Seattle King Roofing (`https://seattlekingroofing.com/`, Everett WA, King + Snohomish Counties) is the featured, first-listed roofing project (`data-order="1"` on `work.html`, first row in the homepage Recent Builds panel, replacing Highline Roofing WA there specifically since the panel only fits 3). It's real, not to be treated as a placeholder. Highline Roofing WA is still in the full directory and still listed on the Roofing industries page, just no longer first.
- CTA copy system: **nav CTA = "Get a Free Demo"**, **every other demo-related button = "Get My Free Demo"** (trade-specific variants may add a suffix, e.g. "Get My Free Roofing Demo →", but always start with "Get My Free"). Don't introduce a sixth variant ("Book a Demo," "Request Your Demo," etc.) for the same action.
- Footer is full black, five columns (Brand / Company / Industries / More / Service Areas), unchanged in shape from V4/V5.

## NEWSLETTER, PLANS, STACK (V6.1)

- **Newsletter ("The Contractor Arsenal Report")**: `newsletter.js` (loaded `defer` after `main.js` on every page) builds a native `<dialog>` popup 5s after load and binds the footer `.footer-news` form. Both POST to `/api/newsletter/subscribe`, a Cloudflare Pages Function at `functions/api/newsletter/subscribe.js` that upserts a Resend Contact (`POST /contacts`, falls back to `PATCH /contacts/{email}` for existing contacts). Env: `RESEND_API_KEY` (secret, required), optional `RESEND_SEGMENT_ID`, optional `RESEND_SOURCE_PROPERTY` (only if that custom property already exists in Resend). Never put the key in client code or a committed file; `.dev.vars`/`.env*` are in `.gitignore` and `.assetsignore`.
- Popup rules: localStorage `ca_nl_subscribed` suppresses it forever, `ca_nl_dismissed_at` for 7 days, sessionStorage `ca_nl_seen` once per session. Excluded paths live in the `EXCLUDED` regex (demo, apply, arsenal, partner, privacy, terms, prez). Analytics are `dataLayer` pushes only (`newsletter_popup_view/_dismiss`, `newsletter_signup_start/_success/_error`); wire them to GA4 inside GTM, never add a second analytics script.
- **Plans** (`.plans` / `.plan` / `.plan--featured` in `styles.css`) power the pricing page tiers. Growth+ is the only dark card. CTAs follow the "Get My Free..." rule and deep-link `demo.html?plan=growth|growth-plus|pro`, which `main.js` uses to preselect the plan radio.
- **Stack grid** (`services.html#stack`, `.tech-grid`) lists only tools verified on this site or live client sites (Cloudflare, GitHub, hand-coded HTML, Schema.org, GTM, Google Fonts, Web3Forms, Microsoft Clarity). Don't add a logo without evidence it's actually in use, and never frame it as a partnership.
- Section-level headings use `.h-display.h-section`, not an inline `font-size:clamp(...)`.

## /PREZ SALES PRESENTATION (separate from the marketing site)

`prez/index.html` + `prez/prez.css` + `prez/prez.js`, served at `/prez` (directory index; trailing-slash redirect is handled by the host). It is a 7-section scroll presentation for sales calls, **not** a marketing page: `noindex, nofollow`, deliberately **not** in `sitemap.xml`, no site nav, no `main.js`. It links `styles.css` only for tokens, fonts, `.btn` and `.nav-logo-mark`; everything else is scoped under `body.prez`. Asset/CTA paths are root-absolute (`/styles.css`, `/demo.html`) so the page works with or without the trailing slash.

- Vanilla CSS/JS only (no build step means no Framer Motion). Reveals are `.in` class toggles from IntersectionObserver; `html.js.motion` gates hidden states so the page is fully readable with JS off or `prefers-reduced-motion`.
- Red: `#9A1F1F` (`--p-red`) for fills, bars, buttons; `--p-red-hi` (`#E2453D`) for red text and thin lines on black, because `#9A1F1F` alone is ~2.4:1 on the black background.
- Slides 02 and 07 are two snap stops each (`.part[data-snap]`); keyboard/rail/step logic in `prez.js` walks parts and never skips the lower half of a part taller than the viewport.
- Slide 05 is an **illustrative simulation** and is labeled as such, with a "Currently in development" badge. Do not remove those labels or describe any part of it as a shipped product without checking with the owner. Never state or imply the tech changes a customer's site automatically.
- The deck is now 8 sections. 07 ends with "Now let's build yours." and a "Choose your plan" button that scrolls to 08 (`#s8`). Its secondary "Get my free demo" and the header CTA go to `/demo.html`.
- **08 Plans** (`#s8`): Growth $297, Growth+ $497 (most popular, emphasized), Pro $997. Each card's CTA links straight to its Whop checkout in a new tab (`plan_YiM8yaMbHvx4x`, `plan_GCPxacr12HqI8`, `plan_GiGpBi7kbe0i8`). The Select toggle/card click only arms the bottom "Continue to checkout" bar, whose href is copied from the selected card's CTA, so the plan IDs live in one place (the card `href`s). Whop is opened normally, not embedded. Do not add discounts or setup fees unless the business confirms them.

## COPY RULES

Direct, contractor-facing, no agency clichés. Zero em dashes anywhere in visible copy (checked with `grep -rln $'\xe2\x80\x94' --include="*.html" .`, excluding `dotcomjay/`). Don't promise specific rankings or that an AI tool will recommend a business. Prefer "Built for search"/"Built for Google and AI search" over "SEO-ready," but keep the homepage itself acronym-free. Don't invent statistics, testimonials, client names, or numeric ad-cost claims. Don't invent local offices or city-specific clients on Service Area pages unless the client is actually based there (Seattle King Roofing genuinely is Everett-based; say so plainly, don't fabricate anything similar for the other five cities).

## WHEN ADDING A NEW PAGE

Copy the nav/footer block verbatim from an existing page (adjust `../` prefixing if inside `resources/` or `service-areas/`), link `styles.css` + `main.js`, keep GTM + favicon + canonical/OG meta, add the URL to `sitemap.xml`. Use `<section class="page-hero page-hero--center">` (or `--left`) for the hero, no inline padding. For a new resources article: `cp` an existing article, keep breadcrumb/category matching one of the 6 real categories, keep desktop/mobile TOC identical to each other and to real `<h2 id>`s, add 3 real `related-guides` links. For a new service-area page: `cp` `service-areas/seattle-wa-contractor-websites.html`, keep the 8-section structure, write genuinely distinct market-context copy, never fabricate a local office or client.

---

# ARCHIVED — V5 STRUCTURAL NOTES (superseded by V6 above)

V5's dropdown was a JS-click-toggled `.open` class layered on top of CSS `:hover` as two independent triggers — this is what caused the "click it and it stays open forever" bug fixed in V6; don't reintroduce that pattern. V5's Services dropdown was single-column title+description only (no eyebrow, no arrow, no footer). Resources dropdown included a "Growth Library" grid item alongside the 6 categories and had no descriptions. Every page defined its own `.page-hero{padding:calc(var(--nav-h) + Npx) 0 Mpx}` inline, with N/M values that drifted across passes (this is exactly the "too tight → too much whitespace → too tight again" problem V6 was built to stop). The homepage hero used `min-height:72vh` + forced flex-centering. The Growth Library search only filtered the page below the fold with no visible feedback near the input. The demo plan selector was a separate `.plan-pills` block of buttons above the form, not inside it. There was no Service Areas section and no Seattle King Roofing in the portfolio.

# ARCHIVED — V4 STRUCTURAL NOTES (superseded)

V4's nav was 6 plain-link items with a visible "CONTRACTOR ARSENAL" wordmark next to the logo image, no dropdowns. `seo.html` was framed purely as "SEO," 5-item technical breakdown, no AEO/GEO. Growth Library had 5 categories and 7 articles, no search, no "Start Here." `demo.html` had no plan selector.

# ARCHIVED — V3 SPEC (superseded, kept for history only)

V3 used a warm cream canvas, construction-orange accent, Instrument Serif italic display headlines, a left-sidebar directory filter, and a search-bar-style hero, modeled on Y Combinator's directory/library pages. Do not resurrect any of it.

# ARCHIVED — V2 SPEC (superseded, kept for history only)

V2 called for dark navy + lime accent + Bebas Neue, an aggressive SaaS-dashboard feel. Do not resurrect Bebas Neue, the lime accent, or dark hero/nav sections.
