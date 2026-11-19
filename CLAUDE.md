# CORYX World — Shopify Theme Redesign Brief

You are working on the Shopify theme for **CORYX World** (https://coryxworld.com), a Qatar-based gym and sportswear brand. Products: T-shirts (men/women), compression shirt, performance shorts, hoodies (men/women), joggers (men/women), team jersey, workout tank, Pro Mini shin guards.

**Goal:** make the storefront look premium, athletic and "insane" — motion-heavy, high-contrast, Nike/Gymshark-level — using the **existing product photos**. No real 3D models. The signature effect is a **"fake 3D" spinning product** built from the existing front and back photos.

Read this whole file before doing anything. Follow the phases in order and stop at every **CHECKPOINT** to report and wait for my approval.

---

## 0. Hard rules (never break these)

1. **Never touch the live theme.** Do not run `shopify theme push` without `--theme <ID>` pointing at the unpublished working copy. Never use `--live`, `--publish`, or `shopify theme publish`. If unsure which theme is which, run `shopify theme list` and ask me.
2. **Never delete existing sections, templates, snippets or settings** that the live store uses. Add new files with the `coryx-` prefix. If you must change an existing file, keep the change minimal and explain it.
3. **Do not touch checkout, payments, apps, or app embeds.** Keep these working: WhatsApp chat/order links, the 15% email/WhatsApp signup popup, hCaptcha on the contact form, Instagram/TikTok links, newsletter signup, cart, search, account login, country/currency selector.
4. **No new paid apps.** Everything is built in theme code.
5. **Everything the client sees must be editable in the Theme Editor.** Every new section has a full `{% schema %}` with settings (text, images, product pickers, colors, toggles) and presets so it appears under "Add section". No hard-coded copy, prices or product names.
6. **Prices, titles, variants and availability always come live from Shopify** (product objects), never typed in.
7. **Commit to git after every completed step** with a clear message.
8. **Validate constantly:** run `shopify theme check` after each change and fix all errors before moving on. Use the Shopify AI Toolkit / Dev MCP to verify Liquid objects, filters and schema syntax instead of guessing.
9. Ask me before any decision that changes brand identity (logo, brand colors, brand fonts) or deletes content.

---

## 1. Tech stack and approach

- Shopify Liquid theme (whatever the store currently runs — detect it in Phase 0). Build on top of it; do not switch themes.
- Vanilla JS as **Web Components / custom elements** (the pattern Dawn/Horizon use). No React, no build step unless strictly needed.
- **GSAP + ScrollTrigger** (free, including plugins) for scroll and timeline animation. **Lenis** for smooth scrolling. Download the minified files into `/assets` (e.g. `assets/gsap.min.js`, `assets/ScrollTrigger.min.js`, `assets/lenis.min.js`) — do not load from external CDNs.
- Load all new JS with `defer`, and only on templates that use it. Initialise animations on `DOMContentLoaded` and re-initialise on `shopify:section:load` so they work inside the Theme Editor.
- CSS: one file per section (`assets/coryx-<section>.css`), loaded only when the section is present. Use CSS custom properties for colors/spacing so the client can change them from settings.

---

## 2. Design direction

- **Mood:** dark, aggressive, premium athletic. Black base (#0A0A0A-ish), off-white text, ONE accent color taken from the existing brand (detect from theme settings/logo; propose it to me at the Phase 0 checkpoint).
- **Typography:** huge condensed display type for headlines (outlined/stroked versions behind products), clean sans for body. Prefer fonts already in the theme or available in Shopify's font library; propose options at the checkpoint.
- **Motion language:** fast-in / slow-settle easing (`power3.out`, `expo.out`), staggered text reveals line by line, nothing bouncy or cartoonish. Every animation should feel like "performance in motion".
- **Texture:** subtle film-grain overlay (CSS/SVG noise, very low opacity), soft radial spotlight behind products, elliptical floor shadow under spinning products.
- Brand lines to reuse: "Performance in Motion", "Sleek in Motion", "The Essentials".

---

## 3. The signature effect: "fake 3D" product spin (snippet + custom element)

Build `snippets/coryx-spin.liquid` + `assets/coryx-spin.js` (custom element `<coryx-spin>`) + `assets/coryx-spin.css`. It is reused by the hero, the scroll showcase and the product page.

**Input:** a front image and a back image (and optionally more angles). Sources, in priority order:
1. Images explicitly picked in the section settings (`front_image`, `back_image`) — these will usually be background-removed cutouts uploaded to Shopify Files.
2. Otherwise the selected product's media: position 1 = front, position 2 = back.

**Behaviour:**
- Two stacked layers in a container with `perspective: 1200px`, `transform-style: preserve-3d`, `backface-visibility: hidden`. Front at `rotateY(0)`, back at `rotateY(180deg)`.
- Rotating the container around Y gives a convincing garment turn. Add during rotation: slight `scale` dip at 90° (≈0.96), a horizontal sheen gradient sweeping across the fabric, and the floor shadow ellipse narrowing at 90° and widening at 0°/180° — this sells the depth.
- **Modes (set by a `mode` attribute/setting):**
  - `auto` — slow idle spin (≈8–10 s per turn) with a short pause on front and back.
  - `scroll` — rotation scrubbed by scroll position via ScrollTrigger (0→360° across the pinned section).
  - `drag` — pointer/touch drag rotates it; release eases with momentum then settles to the nearest face. Auto mode switches to drag the moment the user touches it.
- **If 3+ angle images exist** (front, side, back, side), switch to an **image-sequence** spin: preload all frames and swap frames by rotation angle (Apple-AirPods style), still with shadow and sheen.
- Subtle mouse **tilt** (±6° X/Y) on desktop when idle.
- Accessibility: wrapper has `role="img"` with a meaningful `aria-label` (product title + "front and back view"); include visible "Rotate" buttons (prev/next face) usable by keyboard. Respect `prefers-reduced-motion`: show the front image static with a manual "View back" toggle.
- Performance: use `image_url` with `width` + `srcset` + `sizes`, `loading="eager"` + `fetchpriority="high"` only for the hero instance, lazy elsewhere. Use `will-change: transform` only while animating. No layout shift: reserve aspect-ratio.

---

## 4. Sections to build (each = `sections/coryx-*.liquid` with full schema + preset)

### 4.1 `coryx-hero-spin` — homepage hero
- Full viewport (100svh). Huge outlined headline behind the product (e.g. "CORYX" or "PERFORMANCE IN MOTION"), filled headline in front that reveals letter-by-letter on load.
- Center: `<coryx-spin>` of a chosen product (product picker + optional front/back image overrides), mode setting (auto / drag / scroll).
- Floating "spec chips" around the product (e.g. "Moisture-wicking", "4-way stretch") — editable blocks; they fade/slide in staggered and drift slightly with the mouse (parallax).
- Bottom: live product title + price, color swatches (clicking a swatch swaps the spin images to that variant's media), primary CTA "Shop Now" + secondary CTA.
- Optional background: dark radial gradient or a muted lifestyle photo/video with overlay.
- Scroll cue at the bottom. On scroll out, the product scales down and the headline slides away (ScrollTrigger).

### 4.2 `coryx-marquee` — kinetic text strip
- Infinite horizontal marquee of big words ("TRAIN • RECOVER • REPEAT •"), editable blocks, speed and direction settings, reacts to scroll velocity (speeds up / reverses with scroll direction). Option for outlined vs filled text, and a slight skew.

### 4.3 `coryx-scroll-showcase` — pinned product story
- Section pins for N screens. Each block = one product (picker + front/back overrides + headline + 2–3 bullets + background color).
- As you scroll, the current product spins (scroll mode), then crossfades to the next product; background color and giant background word transition between blocks; bullets reveal with stagger.
- Progress indicator (dots or a thin bar). On mobile: shorter pin, or fall back to stacked cards if `max-width: 749px` and the setting "Disable pin on mobile" is on (default on).

### 4.4 `coryx-product-rail` — bestsellers rail
- Collection picker. Horizontal drag/scroll rail with snap. Cards: product image on hover/tap **flips to the back image** with the same 3D flip as the spin; 3D tilt on hover; quick "Add to cart" for single-variant products, otherwise "Choose options" linking to the product. Live price and compare-at price, sale badge, color swatches.
- Card entrance: staggered rise-in when the rail enters the viewport.

### 4.5 `coryx-split-feature` — lifestyle image + copy
- Large existing lifestyle photo revealed with a clip-path wipe, slow parallax inside its frame; copy and CTA reveal line-by-line. Image left/right setting.

### 4.6 `coryx-categories` — "The Essentials"
- Big tiles (Men / Women / Accessories / etc., editable blocks with collection picker + image). Hover: image zooms, title text slides with an arrow, cursor-follow highlight. Mobile: 2-column grid.

### 4.7 `coryx-trust` — trust strip
- Icons + short lines (Performance quality, Secure checkout, Reliable delivery, Customer support), optional animated counters (e.g. "1st Anniversary"). Editable blocks.

### 4.8 Global polish (theme-wide, all toggleable in Theme settings → "CORYX Motion")
- Lenis smooth scroll (off by default on touch devices).
- Page-load intro: logo reveal + curtain, max 1.2 s, **once per session** (sessionStorage), skippable, off for reduced-motion.
- Custom cursor (desktop only): small dot that grows over links/products and shows "Drag" over spin elements.
- Magnetic primary buttons (desktop only).
- Split-text reveal utility: any heading with `data-coryx-reveal` animates in on scroll.
- Film-grain overlay toggle.
- Master toggle "Reduce motion for everyone" for the client.

---

## 5. Product page upgrades

- Add a `<coryx-spin>` block (app-style block in the main product section, or a `coryx-product-spin` section on the product template) above/beside the existing gallery, using that product's front/back media; swatch/variant change updates it.
- Sticky add-to-cart bar on mobile and on desktop after scrolling past the buy buttons (live price, variant, button).
- Keep the existing gallery, zoom, variant picker, Shopify 3D/AR media support, and all app blocks working.
- Replace placeholder collapsible-tab text with real content blocks (see Phase 1).

---

## 6. Image preparation (background removal)

For the spin to look premium, products need transparent cutouts.
- Download the product images I specify (or export them from the admin) into `./_source-images/` (git-ignored).
- Use `rembg` (`pip install rembg`) to remove backgrounds → save as WebP with alpha (and PNG backup) into `./_cutouts/<product-handle>-front.webp`, `-back.webp`, etc. Trim transparent padding, center, normalise canvas size so every product sits at the same scale.
- Show me a contact sheet of all cutouts before going further. I will upload approved cutouts to Shopify **Content → Files** and pick them in the Theme Editor (you do not upload to the store).
- If a product only has on-model photos, tell me — cutouts of on-model front/back shots also work for the spin.

---

## 7. Content fixes found in the current site

Split into (a) things you fix in theme code and (b) things I must fix in the Shopify admin — give me an exact checklist for (b).
- Placeholder text in shipping/returns collapsible tabs ("Ex: Shipping and return policies…", "Use collapsible tabs…").
- Shipping promo text repeated several times in the announcement bar.
- Country selector defaulting to UAE — the store is Qatar-first (Markets / localization settings + theme selector).
- Returns policy says 4 days for refunds/exchanges and also 7 business days processing — flag for the client to clarify.
- Almost every product shows QAR99 with a crossed-out "regular" price — flag only; do not change prices.
- Broken alt text (e.g. "Men&"), empty `theme-color` meta tag, Workout Tank showing no price on homepage, shin guards feature block with no category link.
- Vague FAQ answers — prepare improved drafts for the client to approve (delivery times, free-delivery eligibility, returns).

---

## 8. Performance, SEO and accessibility budget

- Mobile Lighthouse: Performance ≥ 85, Accessibility ≥ 95, SEO ≥ 95. LCP < 2.5 s, CLS < 0.05.
- Added JS (all CORYX + GSAP + Lenis) ≤ ~80 KB gzipped on the homepage.
- One `<h1>` per page, keep structured data and meta tags, meaningful alt text everywhere.
- All interactions keyboard-accessible, visible focus states, color contrast AA.
- Test at 390×844 (iPhone), 412×915 (Android), 768, 1280 and 1440 widths. Use Playwright (if available) to take screenshots of each section at mobile and desktop and review them yourself before reporting.
- Keep the theme RTL-safe (logical CSS properties: `margin-inline`, `inset-inline`, etc.) so an Arabic version can be added later.

---

## 9. Phases and checkpoints

### Phase D — Standalone client demo (do this FIRST, no Shopify access needed)
Purpose: a pitch demo I can show the client before the meeting. It must not touch the store, the CLI or any theme.
1. Work only inside `./demo/`. Plain `index.html` + `demo.css` + `demo.js`, GSAP/ScrollTrigger/Lenis vendored into `./demo/vendor/`. No build step; it must open by double-clicking `index.html` and also work when dropped onto Netlify Drop / Vercel as a static site.
2. Get real product data and photos from the public storefront: `https://coryxworld.com/products.json?limit=250` (titles, prices, images in order). Download the images into `./demo/images/` (resized to max 1600 px WebP). If a direct download is blocked, ask me to download them or drop them into that folder.
3. Run background removal (section 6) on the hero and showcase products for the demo.
4. Build a one-page homepage mock using the CORYX logo, real products and real prices: hero with `<coryx-spin>` (auto + drag), marquee, pinned scroll showcase (3 products), product rail with flip-to-back cards, categories, trust strip, footer. Same design direction and motion as sections 2–4 so the demo matches what we will build.
5. Add a small fixed label "Design concept – not the live store" in a corner.
6. Mobile must look as good as desktop (the client will likely open it on a phone). Take Playwright screenshots at 390 px and 1440 px and review them yourself.
7. Also produce a 20–30 s screen recording or a GIF of the hero spin + scroll (Playwright video) that I can send on WhatsApp.
**CHECKPOINT D — stop here. Do not start Phase 0 until I say the client approved.**

### Phase 0 — Setup and audit (no edits yet)
1. `shopify theme list` → identify the live theme and the unpublished working copy I created ("CORYX Redesign – WIP"). Pull the **working copy** only: `shopify theme pull --theme <WIP_ID>`. `git init` and commit the untouched baseline.
2. Report: theme name and version, sections used on the homepage and product template, installed app blocks/embeds, current fonts and colors, which products have front/back images (list per product with image positions), any existing JS libraries.
3. Propose: accent color, font pairing, the hero product, and the homepage section order.
**CHECKPOINT 0 — wait for approval.**

### Phase 1 — Quick content/theme fixes
Fix the theme-side items from section 7, give me the admin checklist. Run theme check. Push to WIP theme, give me the preview link.
**CHECKPOINT 1.**

### Phase 2 — Image cutouts
Section 6. Show the contact sheet.
**CHECKPOINT 2.**

### Phase 3 — Core engine
Global motion settings, vendor GSAP/ScrollTrigger/Lenis, `<coryx-spin>` snippet/element with all modes, reveal utility. Build a temporary test section showing the spin in auto, drag and scroll modes.
**CHECKPOINT 3 — I review the spin feel before anything else is built.**

### Phase 4 — Homepage sections
Build 4.1 → 4.7 one at a time. After each: theme check, push to WIP, screenshots mobile + desktop, preview link. Then assemble the new homepage in `templates/index.json` on the WIP theme only, keeping existing sections I want to keep (FAQ, contact form, newsletter) restyled to match.
**CHECKPOINT 4.**

### Phase 5 — Product page
Section 5.
**CHECKPOINT 5.**

### Phase 6 — QA and handoff
Full Lighthouse runs (mobile + desktop) on home, a collection, a product page; fix regressions. Test cart, add-to-cart, WhatsApp, popup, contact form, search, country selector. Test reduced-motion and keyboard navigation. Then write `HANDOFF.md`: how the client edits each new section in the Theme Editor, how to swap hero products and upload new cutouts, how to turn motion off, and a list of every file you added or changed.
**FINAL CHECKPOINT — I publish the theme myself after client approval.**

---

## 10. How to report to me

At each checkpoint: what you did (short), the preview link, screenshots, anything you're unsure about, and the next step. Keep it concise. If something in this brief is impossible or a bad idea on Shopify, say so and propose the better option instead of forcing it.
