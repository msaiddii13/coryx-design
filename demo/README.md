# CORYX — client demo (Phase D)

Standalone design concept. **Not connected to Shopify.** Products, prices and photos were
taken from the public storefront (`coryxworld.com/products.json`) on 19 Nov 2026.

## Open it
- **Locally:** double-click `index.html`.
- **Share a link:** drag the whole `demo` folder onto https://app.netlify.com/drop
  (or `vercel deploy` inside it). Over http(s) you also get the masked fabric sheen on the spin.

## What's inside
- `index.html`, `demo.css`, `demo.js`: the page; `<coryx-spin>` lives in `demo.js`
- `data.js`: real product titles / prices / image order (generated)
- `images/`: product photos (WebP, max 1600 px) + `images/cutouts/` background-removed spin frames (rembg)
- `vendor/`: GSAP 3.12.5 + ScrollTrigger, Lenis 1.1.13 · `fonts/`: Anton + Inter (OFL)
