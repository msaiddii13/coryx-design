/* CORYX — design concept demo.
 * Vanilla JS + custom elements. GSAP, ScrollTrigger and Lenis are vendored in ./vendor.
 * Same patterns that will be ported to the Shopify theme (coryx-spin.js etc.).
 */
(() => {
  'use strict';

  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const MOBILE = () => window.matchMedia('(max-width: 900px)').matches;
  const PRODUCTS = window.CORYX_PRODUCTS || [];
  const byHandle = (h) => PRODUCTS.find((p) => p.handle === h);
  const money = (n) => 'QAR ' + (Math.round(n * 100) / 100).toString().replace(/\.0+$/, '');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const mod = (n, m) => ((n % m) + m) % m;

  /* ==========================================================================
   * <coryx-spin> — "fake 3D" product spin
   * attrs: frames='["front.webp","back.webp", ...]'  mode="auto|drag|scroll"
   *        label="Product title"  ratio="1000/1500"  eager (hero only)
   * 2 frames  -> front/back planes rotated in 3D (rotateY 0 / 180)
   * 3+ frames -> image-sequence spin (frame chosen by angle) + residual turn
   * ======================================================================== */
  const ICON_L = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';
  const ICON_R = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>';

  class CoryxSpin extends HTMLElement {
    connectedCallback() {
      if (this._ready) return;
      this._ready = true;
      this.angle = 0;
      this.frames = JSON.parse(this.getAttribute('frames') || '[]');
      this.mode = REDUCED ? 'static' : (this.getAttribute('mode') || 'auto');
      this.homeMode = this.mode;
      this.style.setProperty('--ratio', this.getAttribute('ratio') || '2/3');
      this.build();
      this.render();
      if (this.mode === 'auto' || this.mode === 'drag') this.bindDrag();
      if (this.mode === 'auto') this.watchVisibility();
    }

    get seq() { return this.frames.length >= 3; }
    get step() { return 360 / Math.max(1, this.frames.length); }

    build() {
      const label = this.getAttribute('label') || 'Product';
      const eager = this.hasAttribute('eager');
      this.masks = location.protocol !== 'file:';   // CSS masks are blocked on file:// — fall back to a brightness sheen
      if (!this.masks) this.classList.add('no-mask');
      const img = (src, i) => `<div class="spin__face"${this.masks ? ` style="--mask:url('${src}')"` : ''}>
          <img src="${src}" alt="" draggable="false" ${eager && i === 0 ? 'loading="eager" fetchpriority="high"' : (eager ? 'loading="eager"' : 'loading="lazy"')} decoding="async" class="spin__img">
          <div class="spin__sheen"></div></div>`;
      const faces = this.frames.map(img).join('');
      this.innerHTML = `
        <div class="spin__tilt" role="img" aria-label="${label} – front and back view">
          <div class="spin__rot">${faces}</div>
        </div>
        <div class="spin__shadow" aria-hidden="true"></div>
        <div class="spin__controls">
          <button class="spin__btn" type="button" data-dir="-1" aria-label="${REDUCED ? 'View front' : 'Rotate left'}">${ICON_L}</button>
          <button class="spin__btn" type="button" data-dir="1" aria-label="${REDUCED ? 'View back' : 'Rotate right'}">${ICON_R}</button>
        </div>`;
      this.tilt = this.querySelector('.spin__tilt');
      this.rot = this.querySelector('.spin__rot');
      this.imgs = [...this.querySelectorAll('.spin__img')];
      this.faces = [...this.querySelectorAll('.spin__face')];
      this.sheens = [...this.querySelectorAll('.spin__sheen')];
      this.shadow = this.querySelector('.spin__shadow');
      this.querySelectorAll('.spin__btn').forEach((b) => b.addEventListener('click', () => this.nudge(+b.dataset.dir)));
    }

    /* Draw the current angle.
     * Each photo turns up to ±~70° in 3D and crossfades into the next one, so a flat
     * photo is never seen edge-on (which reads as a thin sliver). 2 photos = front/back,
     * 3+ photos = image-sequence spin. */
    render() {
      const n = this.frames.length;
      const s = this.step;
      const na = mod(this.angle, 360);
      const k = Math.floor(na / s) % n;
      const t = (na - k * s) / s;                       // 0..1 between frame k and k+1
      const k2 = (k + 1) % n;
      const fadeIn = smooth(0.32, 0.68, t);
      const turn = Math.min(s * 0.42, 70);              // residual 3D turn per frame
      const edge = Math.sin(t * Math.PI);               // 0 on a face, 1 mid-turn
      const dip = 1 - 0.04 * edge;                      // scale dip ≈0.96 mid-turn
      this.faces.forEach((f, i) => {
        let o = 0, r = 0;
        if (i === k) { o = 1 - fadeIn; r = t * turn; }
        if (i === k2 && k2 !== k) { o = Math.max(o, fadeIn); r = (t - 1) * turn; }
        f.style.opacity = o.toFixed(3);
        f.style.visibility = o > 0.001 ? 'visible' : 'hidden';
        f.style.transform = o > 0.001 ? `rotateY(${r.toFixed(2)}deg) scale(${dip.toFixed(4)})` : 'none';
      });
      if (this.masks) this.sheens.forEach((sh) => { sh.style.opacity = (edge * 0.85).toFixed(3); sh.style.backgroundPosition = `${100 - t * 100}% 0`; });
      else this.imgs.forEach((im) => { im.style.filter = `drop-shadow(0 30px 40px rgba(0,0,0,.45)) brightness(${(1 + 0.22 * edge).toFixed(3)})`; });
      this.shadow.style.transform = `scaleX(${(1 - 0.38 * edge).toFixed(3)})`;
      this.shadow.style.opacity = (1 - 0.3 * edge).toFixed(3);
    }

    setAngle(a) { this.angle = a; this.render(); }

    /* Swap image set (e.g. colour swatch) */
    setFrames(list) {
      const pre = list.map((src) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = res; i.src = src; }));
      Promise.all(pre).then(() => {
        const swap = () => {
          this.faces.forEach((f, i) => {
            if (!list[i]) return;
            f.querySelector('img').src = list[i];
            if (this.masks) f.style.setProperty('--mask', `url('${list[i]}')`);
          });
          this.frames = list;
        };
        if (REDUCED || !window.gsap) { swap(); return; }
        gsap.timeline()
          .to(this.tilt, { opacity: 0, scale: 0.94, duration: 0.25, ease: 'power2.in' })
          .add(swap)
          .to(this.tilt, { opacity: 1, scale: 1, duration: 0.6, ease: 'expo.out' });
      });
    }

    /* Rotate to the previous / next face (buttons, keyboard) */
    nudge(dir) {
      this.stopAuto();
      const target = Math.round(this.angle / this.step) * this.step + dir * this.step;
      if (REDUCED || !window.gsap) { this.setAngle(target); return; }
      this.tween = gsap.to(this, { angle: target, duration: 1, ease: 'power3.out', onUpdate: () => this.render(), onStart: () => this.classList.add('is-animating'), onComplete: () => { this.classList.remove('is-animating'); this.resumeLater(); } });
    }

    /* ---- auto mode: slow turn, short pause on each face ---- */
    startAuto() {
      if (this.mode !== 'auto' || this.autoOn || !window.gsap) return;
      this.autoOn = true;
      const turn = () => {
        if (!this.autoOn) return;
        const target = Math.round(this.angle / this.step) * this.step + this.step;
        const atFace = this.seq ? Math.round(target / this.step) % (this.frames.length / 2) === 0 : true;
        this.classList.add('is-animating');
        this.tween = gsap.to(this, {
          angle: target, duration: this.seq ? 1.7 : 3.2, ease: this.seq ? 'power1.inOut' : 'power2.inOut',
          onUpdate: () => this.render(),
          onComplete: () => { this.classList.remove('is-animating'); this.wait = gsap.delayedCall(atFace ? 1.1 : 0.15, turn); },
        });
      };
      this.wait = gsap.delayedCall(0.6, turn);
    }
    stopAuto() {
      this.autoOn = false;
      if (this.tween) this.tween.kill();
      if (this.wait) this.wait.kill();
      clearTimeout(this.resumeT);
    }
    resumeLater() {
      clearTimeout(this.resumeT);
      if (this.homeMode !== 'auto' || REDUCED) return;
      this.resumeT = setTimeout(() => { this.mode = 'auto'; if (this.visible) this.startAuto(); }, 5000);
    }
    watchVisibility() {
      new IntersectionObserver(([e]) => {
        this.visible = e.isIntersecting;
        if (e.isIntersecting && this.mode === 'auto') this.startAuto();
        else if (!e.isIntersecting) { this.autoOn = false; if (this.tween) this.tween.pause(); if (this.wait) this.wait.kill(); }
      }).observe(this);
    }

    /* ---- drag mode with momentum + settle to nearest face ---- */
    bindDrag() {
      let x0 = 0, y0 = 0, last = 0, lastT = 0, v = 0, dragging = false, decided = false;
      const down = (e) => {
        if (e.target.closest('.spin__btn')) return;
        x0 = last = e.clientX; y0 = e.clientY; lastT = performance.now(); v = 0; dragging = true; decided = e.pointerType === 'mouse';
        if (decided) this.grab(e);
      };
      const move = (e) => {
        if (!dragging) return;
        if (!decided) {                                   // touch: only take horizontal drags
          const dx = Math.abs(e.clientX - x0), dy = Math.abs(e.clientY - y0);
          if (dx < 6 && dy < 6) return;
          decided = true;
          if (dy > dx) { dragging = false; return; }
          this.grab(e);
        }
        const now = performance.now();
        const dx = e.clientX - last;
        this.angle += dx * 0.5;
        v = (dx * 0.5) / Math.max(1, now - lastT) * 16;   // deg per frame
        last = e.clientX; lastT = now;
        this.render();
      };
      const up = () => {
        if (!dragging) return;
        dragging = false;
        if (!this.classList.contains('is-dragging')) return;
        this.classList.remove('is-dragging');
        const projected = this.angle + v * 14;
        const target = Math.round(projected / this.step) * this.step;
        this.tween = gsap.to(this, { angle: target, duration: 1.1, ease: 'expo.out', onUpdate: () => this.render(), onComplete: () => this.classList.remove('is-animating') });
        this.resumeLater();
      };
      this.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
    }
    grab(e) {
      this.stopAuto();
      this.mode = 'drag';
      this.classList.add('is-dragging', 'is-animating');
      try { this.setPointerCapture(e.pointerId); } catch (_) {}
    }
  }
  customElements.define('coryx-spin', CoryxSpin);

  /* ==========================================================================
   * Boot
   * ======================================================================== */
  document.addEventListener('DOMContentLoaded', () => {
    const hasGSAP = !!window.gsap;
    if (hasGSAP) gsap.registerPlugin(ScrollTrigger);
    buildRail();
    fillPrices();
    if (!hasGSAP) return;

    /* ---- Lenis smooth scroll (desktop only) ---- */
    let lenis = null;
    if (!REDUCED && FINE && window.Lenis) {
      lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    document.querySelectorAll('a[href^="#"]').forEach((a) => a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const el = id.length > 1 && document.querySelector(id);
      if (!el) return;
      e.preventDefault();
      closeMenu();
      if (lenis) lenis.scrollTo(el, { duration: 1.4 });
      else el.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth' });
    }));

    header();
    mobileMenu();
    if (FINE && !REDUCED) { cursor(); magnetic(); }

    splitHeroTitle();
    reveals();
    marquee();
    showcase();
    rail();
    split();
    categories();
    trust();
    heroScroll();
    swatches();

    intro(() => heroIn());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  });

  /* ---------- Intro: logo reveal + curtain, ≤1.2 s, once per session ---------- */
  function intro(done) {
    const el = document.getElementById('intro');
    let seen = false;
    try { seen = sessionStorage.getItem('coryx-intro') === '1'; sessionStorage.setItem('coryx-intro', '1'); } catch (_) {}
    if (seen || REDUCED) { el.classList.add('is-done'); done(); return; }
    const mark = el.querySelector('.intro__mark');
    const tl = gsap.timeline({ onComplete: () => { el.classList.add('is-done'); } });
    tl.to(mark, { clipPath: 'inset(0% 0 0 0)', duration: 0.45, ease: 'expo.out' })
      .to(mark, { scale: 0.8, opacity: 0, duration: 0.25, ease: 'power2.in' }, '+=0.12')
      .to('.intro__panel--top', { yPercent: -100, duration: 0.55, ease: 'expo.inOut' }, '-=0.05')
      .to('.intro__panel--bottom', { yPercent: 100, duration: 0.55, ease: 'expo.inOut' }, '<')
      .add(done, '-=0.4');
    el.querySelector('.intro__skip').addEventListener('click', () => tl.progress(1));
  }

  /* ---------- Hero ---------- */
  function splitHeroTitle() {
    const h = document.querySelector('.hero__title');
    h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    h.querySelectorAll('.hero__line').forEach((s) => {
      s.innerHTML = [...s.textContent].map((c) => c === ' ' ? ' ' : `<span class="char">${c}</span>`).join('');
      s.setAttribute('aria-hidden', 'true');
    });
    if (!REDUCED) gsap.set('.hero__title .char', { yPercent: 115 });
    if (!REDUCED) gsap.set(['#heroSpin', '.chip', '.hero__copy .eyebrow', '.hero__buy > *', '.hero__outline'], { opacity: 0 });
  }
  function heroIn() {
    if (REDUCED) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.fromTo('.hero__outline', { opacity: 0, scale: 1.15 }, { opacity: 1, scale: 1, duration: 1.6 }, 0)
      .fromTo('#heroSpin', { opacity: 0, y: 60, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 1.4 }, 0.05)
      .to('.hero__title .char', { yPercent: 0, duration: 1.1, stagger: 0.028 }, 0.15)
      .fromTo('.hero__copy .eyebrow', { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.8 }, 0.3)
      .fromTo('.chip', { opacity: 0, scale: 0.7, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.9, stagger: 0.09 }, 0.55)
      .fromTo('.hero__buy > *', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08 }, 0.5);

    // chips drift with the mouse (parallax)
    if (FINE) {
      const chips = [...document.querySelectorAll('.chip')].map((c) => ({ d: +c.dataset.depth || 1, x: gsap.quickTo(c, 'x', { duration: 0.9, ease: 'power3.out' }), y: gsap.quickTo(c, 'y', { duration: 0.9, ease: 'power3.out' }) }));
      const spin = document.getElementById('heroSpin');
      const tx = gsap.quickTo(spin.tilt, 'rotationY', { duration: 1, ease: 'power3.out' });
      const ty = gsap.quickTo(spin.tilt, 'rotationX', { duration: 1, ease: 'power3.out' });
      document.querySelector('.hero').addEventListener('pointermove', (e) => {
        const nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
        chips.forEach((c) => { c.x(nx * 30 * c.d); c.y(ny * 22 * c.d); });
        if (!spin.classList.contains('is-dragging')) { tx(nx * 12); ty(-ny * 12); }   // ±6°
      });
    }
  }
  function heroScroll() {
    if (REDUCED) return;
    const tl = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    tl.to('#heroSpin', { scale: 0.78, yPercent: 10, ease: 'none' }, 0)
      .to('.hero__outline', { xPercent: -18, ease: 'none' }, 0)
      .to('.hero__copy', { yPercent: -40, opacity: 0, ease: 'none' }, 0)
      .to('.chips', { opacity: 0, ease: 'none' }, 0)
      .to('.hero__buy', { opacity: 0, ease: 'none' }, 0);
  }
  function swatches() {
    const sets = {
      national: { label: 'The National', frames: [0, 1, 2, 3].map((i) => `images/cutouts/jersey-national-${i}.webp`) },
      noir: { label: 'Noir', frames: [0, 1, 2, 3].map((i) => `images/cutouts/jersey-noir-${i}.webp`) },
    };
    const spin = document.getElementById('heroSpin');
    document.querySelectorAll('.hero .swatch').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('.hero .swatch').forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-checked', x === b); });
      const s = sets[b.dataset.set];
      document.getElementById('swatchLabel').textContent = s.label;
      spin.setFrames(s.frames);
    }));
    // warm the cache for the alternate colourway
    setTimeout(() => sets.noir.frames.forEach((f) => { const i = new Image(); i.src = f; }), 2500);
  }

  /* ---------- Prices (live from products.json export) ---------- */
  function fillPrices() {
    const j = byHandle('coryx-team-jersey-first-edition');
    if (j) {
      document.getElementById('heroName').textContent = j.title.replace(' - ', ' – ');
      document.getElementById('heroPrice').textContent = money(j.price);
      document.getElementById('heroWas').textContent = j.compare ? money(j.compare) : '';
    }
    document.querySelectorAll('.sc-item').forEach((it) => {
      const p = byHandle(it.dataset.handle);
      if (!p) return;
      it.querySelector('.price__now').textContent = money(p.price);
      it.querySelector('.price__was').textContent = p.compare ? money(p.compare) : '';
    });
  }

  /* ---------- Header ---------- */
  function header() {
    const h = document.getElementById('header');
    let lastY = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        h.classList.toggle('is-solid', y > 40);
        h.classList.toggle('is-hidden', y > innerHeight * 0.9 && y > lastY && !document.body.classList.contains('menu-open'));
        lastY = y;
      },
    });
  }
  function mobileMenu() {
    const btn = document.querySelector('.menu-btn');
    const menu = document.getElementById('mobileMenu');
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', open);
      btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      menu.hidden = !open;
      document.body.classList.toggle('menu-open', open);
      if (open && !REDUCED) gsap.from(menu.children, { yPercent: 60, opacity: 0, stagger: 0.05, duration: 0.7, ease: 'expo.out' });
    });
  }
  function closeMenu() {
    const btn = document.querySelector('.menu-btn');
    if (btn.getAttribute('aria-expanded') === 'true') btn.click();
  }

  /* ---------- Cursor + magnetic buttons (desktop only) ---------- */
  function cursor() {
    document.documentElement.classList.add('has-cursor');
    const c = document.querySelector('.cursor');
    const x = gsap.quickTo(c, 'x', { duration: 0.18, ease: 'power3.out' });
    const y = gsap.quickTo(c, 'y', { duration: 0.18, ease: 'power3.out' });
    window.addEventListener('pointermove', (e) => {
      x(e.clientX); y(e.clientY);
      const t = e.target;
      const spin = t.closest && t.closest('coryx-spin');
      const drag = spin && spin.getAttribute('mode') !== 'scroll' && !t.closest('.spin__btn');
      c.classList.toggle('is-drag', !!drag);
      c.classList.toggle('is-link', !drag && !!(t.closest && t.closest('a, button, .card__media, input')));
    }, { passive: true });
  }
  function magnetic() {
    document.querySelectorAll('.magnetic').forEach((b) => {
      const x = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3.out' });
      const y = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3.out' });
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.3);
        y((e.clientY - r.top - r.height / 2) * 0.4);
      });
      b.addEventListener('pointerleave', () => { x(0); y(0); });
    });
  }

  /* ---------- [data-reveal] split-text utility ---------- */
  function reveals() {
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      el.setAttribute('aria-label', el.innerText.replace(/\s+/g, ' ').trim());
      const parts = el.innerHTML.split(/<br\s*\/?>/i);
      el.innerHTML = parts.map((line) => `<span style="display:block;overflow:hidden;padding-block:.04em" aria-hidden="true">${
        line.trim().split(/\s+/).map((w) => `<span class="rw" style="display:inline-block">${w}</span>`).join(' ')}</span>`).join('');
      if (REDUCED) return;
      gsap.from(el.querySelectorAll('.rw'), {
        yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 85%' },
      });
    });
    document.querySelectorAll('[data-reveal-lines]').forEach((el) => {
      if (REDUCED) return;
      const words = el.textContent.trim().split(/\s+/);
      el.innerHTML = words.map((w) => `<span class="w" style="display:inline-block">${w}</span>`).join(' ');
      const lines = [];
      let top = null;
      el.querySelectorAll('.w').forEach((w) => { if (w.offsetTop !== top) { lines.push([]); top = w.offsetTop; } lines[lines.length - 1].push(w.textContent); });
      el.innerHTML = lines.map((l) => `<span class="line"><span>${l.join(' ')}</span></span>`).join('');
      gsap.from(el.querySelectorAll('.line > span'), { yPercent: 100, opacity: 0, duration: 1, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: el, start: 'top 85%' } });
    });
  }

  /* ---------- Marquee: infinite, reacts to scroll velocity + direction ---------- */
  function marquee() {
    const rows = [...document.querySelectorAll('.marquee__row')].map((row) => {
      const track = row.querySelector('.marquee__track');
      const clone = track.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      row.appendChild(clone);
      return { row, dir: +row.dataset.dir, x: 0 };
    });
    if (REDUCED) return;
    let boost = 0, scrollDir = 1;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => { scrollDir = self.direction; boost = clamp(Math.abs(self.getVelocity()) / 300, 0, 12); },
    });
    gsap.ticker.add((_, dt) => {
      boost *= 0.92;
      rows.forEach((r) => {
        const w = r.row.scrollWidth / 2;
        const speed = (0.05 + boost * 0.05) * r.dir * scrollDir;   // px per ms
        r.x = mod(r.x - speed * dt, w) - w;
        r.row.style.transform = `translate3d(${r.x}px,0,0) skewX(${-8 - clamp(boost, 0, 6) * scrollDir}deg)`;
      });
    });
  }

  /* ---------- Pinned scroll showcase ---------- */
  function showcase() {
    const items = [...document.querySelectorAll('.sc-item')];
    const spins = [...document.querySelectorAll('.showcase__spin')];
    const words = [...document.querySelectorAll('.showcase__word span')];
    const bg = document.querySelector('.showcase__bg');
    const bar = document.querySelector('.showcase__progress span');
    const n = items.length;
    let active = 0;
    bg.style.backgroundColor = items[0].dataset.bg;
    items[0].classList.add('is-active');

    const go = (i) => {
      if (i === active) return;
      const prev = active; active = i;
      const it = items[i];
      bg.style.backgroundColor = it.dataset.bg;
      gsap.to(items[prev], { opacity: 0, y: -24, duration: 0.4, ease: 'power2.in', onComplete: () => items[prev].classList.remove('is-active') });
      it.classList.add('is-active');
      gsap.fromTo(it, { opacity: 0, y: 34 }, { opacity: 1, y: 0, duration: 0.9, ease: 'expo.out', delay: 0.15 });
      gsap.fromTo(it.querySelectorAll('.sc-bullets li'), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.8, stagger: 0.08, ease: 'expo.out', delay: 0.3 });
      gsap.to(spins[prev], { opacity: 0, scale: 0.9, duration: 0.5, ease: 'power2.in' });
      gsap.fromTo(spins[i], { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out', delay: 0.1 });
      gsap.to(words[prev], { opacity: 0, yPercent: i > prev ? -20 : 20, duration: 0.6, ease: 'power2.in' });
      gsap.fromTo(words[i], { opacity: 0, yPercent: i > prev ? 20 : -20 }, { opacity: 1, yPercent: 0, duration: 1, ease: 'expo.out' });
    };

    ScrollTrigger.create({
      trigger: '.showcase',
      pin: '.showcase__pin',
      start: 'top top',
      end: () => '+=' + innerHeight * (MOBILE() ? 2.2 : 3),
      scrub: true,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const seg = self.progress * n;
        const i = clamp(Math.floor(seg), 0, n - 1);
        bar.style.transform = `scaleX(${self.progress})`;
        if (!REDUCED) spins.forEach((s, j) => s.setAngle(smooth(0.08, 0.86, seg - j) * 360));
        go(i);
      },
    });
  }

  /* ---------- Product rail ---------- */
  function buildRail() {
    const track = document.getElementById('railTrack');
    const flipIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M18 3v4h-4M6 21v-4h4" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    track.innerHTML = PRODUCTS.map((p) => {
      const off = p.compare ? Math.round((1 - p.price / p.compare) * 100) : 0;
      const dots = p.colors.slice(0, 5).map((c) => `<span style="--c:${c.hex}" title="${c.name}"></span>`).join('');
      const cta = p.single
        ? `<button class="btn btn--primary card__cta" type="button" data-add="${p.short}"><span>Add to cart</span></button>`
        : `<a class="btn btn--ghost card__cta" href="${p.url}" target="_blank" rel="noopener"><span>Choose options</span></a>`;
      return `<div class="card">
        <a class="card__media" href="${p.url}" target="_blank" rel="noopener" aria-label="${p.title}">
          <div class="card__tilt"><div class="card__flip">
            <div class="card__face"><img src="${p.front}" alt="${p.title} – front" loading="lazy" decoding="async" width="${p.w}" height="${p.h}"></div>
            <div class="card__face card__face--back"><img src="${p.back}" alt="${p.title} – ${p.hasBack ? 'back' : 'detail'}" loading="lazy" decoding="async"></div>
          </div>
          ${off ? `<span class="card__badge">−${off}%</span>` : ''}
          </div>
        </a>
        <div class="card__info">
          <h3 class="card__title"><a href="${p.url}" target="_blank" rel="noopener" style="text-decoration:none">${p.title}</a></h3>
          <div class="card__dots" aria-label="${p.colors.length} colours">${dots}</div>
          <p class="price"><span class="price__now">${money(p.price)}</span>${p.compare ? ` <s class="price__was">${money(p.compare)}</s>` : ''}</p>
          ${cta}
        </div>
      </div>`;
    }).join('');
    // tap-to-flip button on touch devices
    if (!FINE) track.querySelectorAll('.card__tilt').forEach((t) => {
      const b = document.createElement('button');
      b.className = 'card__flip-hint'; b.type = 'button'; b.setAttribute('aria-label', 'Show other side'); b.innerHTML = flipIcon;
      b.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); b.closest('.card').classList.toggle('is-flipped'); });
      t.appendChild(b);
    });
    let count = 0;
    track.addEventListener('click', (e) => {
      const add = e.target.closest('[data-add]');
      if (!add) return;
      count += 1;
      const el = document.getElementById('cartCount');
      el.textContent = count; el.hidden = false; el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
      document.querySelector('.cart-btn').setAttribute('aria-label', `Cart, ${count} items`);
      toast(`${add.dataset.add} added to cart`);
    });
  }
  function rail() {
    const track = document.getElementById('railTrack');
    // 3D tilt on hover (desktop)
    if (FINE && !REDUCED) track.querySelectorAll('.card__media').forEach((m) => {
      const t = m.querySelector('.card__tilt');
      m.addEventListener('pointermove', (e) => {
        const r = m.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5, ny = (e.clientY - r.top) / r.height - 0.5;
        t.style.transform = `rotateX(${-ny * 10}deg) rotateY(${nx * 10}deg)`;
      });
      m.addEventListener('pointerleave', () => { t.style.transform = ''; });
    });
    // mouse drag-to-scroll
    let down = false, sx = 0, sl = 0, moved = false;
    track.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse' || e.target.closest('button')) return; down = true; moved = false; sx = e.clientX; sl = track.scrollLeft; });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 5) { moved = true; track.classList.add('is-grabbing'); }
      if (moved) track.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => { if (!down) return; down = false; track.classList.remove('is-grabbing'); });
    track.addEventListener('click', (e) => { if (moved) { e.preventDefault(); moved = false; } }, true);
    track.addEventListener('dragstart', (e) => e.preventDefault());
    document.querySelectorAll('[data-rail]').forEach((b) => b.addEventListener('click', () => {
      const card = track.querySelector('.card');
      track.scrollBy({ left: +b.dataset.rail * (card.offsetWidth + 16) * (MOBILE() ? 1 : 2), behavior: 'smooth' });
    }));
    if (!REDUCED) gsap.from(track.querySelectorAll('.card'), { y: 90, opacity: 0, rotateX: -12, duration: 1.1, stagger: 0.07, ease: 'expo.out', scrollTrigger: { trigger: track, start: 'top 85%' } });
  }

  /* ---------- Split feature ---------- */
  function split() {
    if (REDUCED) return;
    const media = document.querySelector('.split__media');
    gsap.fromTo(media, { clipPath: 'inset(0% 100% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: media, start: 'top 78%' } });
    gsap.fromTo(media.querySelector('img'), { yPercent: -6, scale: 1.15 }, { yPercent: 6, scale: 1, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.split .eyebrow, .split .btn', { opacity: 0, y: 24, duration: 1, stagger: 0.15, ease: 'expo.out', scrollTrigger: { trigger: '.split__copy', start: 'top 80%' } });
  }

  /* ---------- Categories ---------- */
  function categories() {
    document.querySelectorAll('.cat').forEach((c) => c.addEventListener('pointermove', (e) => {
      const r = c.getBoundingClientRect();
      c.style.setProperty('--mx', `${e.clientX - r.left}px`);
      c.style.setProperty('--my', `${e.clientY - r.top}px`);
    }));
    if (!REDUCED) gsap.from('.cat', { y: 80, opacity: 0, duration: 1.1, stagger: 0.1, ease: 'expo.out', scrollTrigger: { trigger: '.cats__grid', start: 'top 85%' } });
  }

  /* ---------- Trust strip ---------- */
  function trust() {
    if (REDUCED) { document.querySelectorAll('.counter').forEach((c) => { c.textContent = c.dataset.to; }); return; }
    gsap.from('.trust__list li', { y: 30, opacity: 0, duration: 0.9, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.trust', start: 'top 85%' } });
    document.querySelectorAll('.counter').forEach((c) => {
      const o = { v: 0 };
      gsap.to(o, { v: +c.dataset.to, duration: 1.2, ease: 'power3.out', onUpdate: () => { c.textContent = Math.round(o.v); }, scrollTrigger: { trigger: c, start: 'top 90%' } });
    });
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('is-on'), 2200);
  }
})();
