/**
 * Lazy liquid-glass refraction for content cards.
 *
 * Critical rendering is left to CSS Gaussian blur. SVG displacement filters
 * are created only after the loader disappears and only for surfaces near the
 * viewport, reducing startup work and scroll jank.
 */
(() => {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const XLINK_NS = 'http://www.w3.org/1999/xlink';
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const initialized = new WeakSet();
  let started = false;

  const smoothStep = (a, b, t) => {
    t = clamp((t - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };

  const roundedRectSDF = (x, y, halfWidth, halfHeight, radius) => {
    const qx = Math.abs(x) - halfWidth + radius;
    const qy = Math.abs(y) - halfHeight + radius;
    return Math.min(Math.max(qx, qy), 0)
      + Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
      - radius;
  };

  class LiquidSurface {
    constructor(element, index) {
      this.element = element;
      this.id = `liquid-glass-${index}-${Math.random().toString(36).slice(2, 8)}`;
      this.isProminent = element.hasAttribute('data-liquid');
      this.resizeTimer = 0;

      this.createFilter();
      this.createRefractionLayer();
      this.refresh();

      if ('ResizeObserver' in window) {
        this.resizeObserver = new ResizeObserver(() => {
          clearTimeout(this.resizeTimer);
          this.resizeTimer = window.setTimeout(() => this.refresh(), 100);
        });
        this.resizeObserver.observe(this.element);
      }
    }

    createFilter() {
      this.svg = document.createElementNS(SVG_NS, 'svg');
      this.svg.setAttribute('width', '0');
      this.svg.setAttribute('height', '0');
      this.svg.setAttribute('aria-hidden', 'true');
      this.svg.style.cssText = 'position:fixed;left:-9999px;top:-9999px;pointer-events:none;overflow:hidden';

      const defs = document.createElementNS(SVG_NS, 'defs');
      this.filter = document.createElementNS(SVG_NS, 'filter');
      this.filter.setAttribute('id', this.id);
      this.filter.setAttribute('filterUnits', 'userSpaceOnUse');
      this.filter.setAttribute('primitiveUnits', 'userSpaceOnUse');
      this.filter.setAttribute('color-interpolation-filters', 'sRGB');

      this.softBlur = document.createElementNS(SVG_NS, 'feGaussianBlur');
      this.softBlur.setAttribute('in', 'SourceGraphic');
      this.softBlur.setAttribute('stdDeviation', '0.55');
      this.softBlur.setAttribute('result', 'softSource');

      this.map = document.createElementNS(SVG_NS, 'feImage');
      this.map.setAttribute('preserveAspectRatio', 'none');
      this.map.setAttribute('result', 'displacementMap');

      this.displacement = document.createElementNS(SVG_NS, 'feDisplacementMap');
      this.displacement.setAttribute('in', 'softSource');
      this.displacement.setAttribute('in2', 'displacementMap');
      this.displacement.setAttribute('xChannelSelector', 'R');
      this.displacement.setAttribute('yChannelSelector', 'G');

      this.filter.append(this.softBlur, this.map, this.displacement);
      defs.appendChild(this.filter);
      this.svg.appendChild(defs);
      document.body.appendChild(this.svg);

      this.canvas = document.createElement('canvas');
      this.context = this.canvas.getContext('2d');
    }

    createRefractionLayer() {
      this.layer = document.createElement('span');
      this.layer.className = 'liquid-refraction-layer';
      this.layer.setAttribute('aria-hidden', 'true');
      this.element.prepend(this.layer);
    }

    refresh() {
      const rect = this.element.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10 || !this.context) return;

      const maxMapSize = this.isProminent ? 210 : 116;
      const ratio = Math.min(1, maxMapSize / Math.max(rect.width, rect.height));
      const width = Math.max(28, Math.round(rect.width * ratio));
      const height = Math.max(28, Math.round(rect.height * ratio));

      this.canvas.width = width;
      this.canvas.height = height;

      const image = this.context.createImageData(width, height);
      const pixels = image.data;
      const aspect = rect.width / rect.height;
      const cornerRadius = clamp(28 / Math.min(rect.width, rect.height), 0.06, 0.28);

      let offset = 0;
      for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
          const nx = (x + 0.5) / width - 0.5;
          const ny = (y + 0.5) / height - 0.5;
          const px = nx * Math.max(1, aspect);
          const py = ny * Math.max(1, 1 / aspect);
          const edgeDistance = roundedRectSDF(nx, ny, 0.5, 0.5, cornerRadius);
          const rim = 1 - smoothStep(-0.18, 0.01, edgeDistance);
          const centreDistance = clamp(Math.hypot(px, py) / 0.72, 0, 1);
          const lens = (1 - centreDistance) * 0.028;
          const edgeBulge = rim * rim * (this.isProminent ? 0.105 : 0.068);
          const wave = Math.sin((nx * 3.2 + ny * 2.4) * Math.PI) * rim * 0.006;
          const length = Math.hypot(px, py) || 1;
          const dx = (px / length) * (edgeBulge + lens) + wave;
          const dy = (py / length) * (edgeBulge + lens) - wave * 0.75;

          pixels[offset++] = clamp((0.5 + dx) * 255, 0, 255);
          pixels[offset++] = clamp((0.5 + dy) * 255, 0, 255);
          pixels[offset++] = 128;
          pixels[offset++] = 255;
        }
      }

      this.context.putImageData(image, 0, 0);
      const url = this.canvas.toDataURL('image/png');
      this.map.setAttribute('href', url);
      this.map.setAttributeNS(XLINK_NS, 'xlink:href', url);
      this.map.setAttribute('x', '0');
      this.map.setAttribute('y', '0');
      this.map.setAttribute('width', String(rect.width));
      this.map.setAttribute('height', String(rect.height));

      this.filter.setAttribute('x', '0');
      this.filter.setAttribute('y', '0');
      this.filter.setAttribute('width', String(rect.width));
      this.filter.setAttribute('height', String(rect.height));

      const scale = clamp(
        Math.min(rect.width, rect.height) * (this.isProminent ? 0.082 : 0.052),
        10,
        32
      );
      this.displacement.setAttribute('scale', String(scale));

      const filterValue = `url(#${this.id}) blur(0.6px) saturate(1.2) contrast(1.07)`;
      this.layer.style.backdropFilter = filterValue;
      this.layer.style.webkitBackdropFilter = filterValue;
    }
  }

  function scheduleTask(task) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(task, { timeout: 850 });
    } else {
      window.setTimeout(task, 80);
    }
  }

  function initializeSurface(element, index) {
    if (initialized.has(element)) return;
    initialized.add(element);
    scheduleTask(() => {
      try {
        new LiquidSurface(element, index);
      } catch (error) {
        console.debug('Liquid glass refraction fallback:', error);
      }
    });
  }

  function initialize() {
    if (started) return;
    started = true;

    const surfaces = [...document.querySelectorAll('.glass:not(.topbar):not(.status-pill)')];

    if (!('IntersectionObserver' in window)) {
      surfaces.forEach(initializeSurface);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const index = surfaces.indexOf(entry.target);
        initializeSurface(entry.target, index);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '420px 0px', threshold: 0.01 });

    surfaces.forEach(surface => observer.observe(surface));
  }

  function scheduleInitialize() {
    scheduleTask(initialize);
  }

  window.addEventListener('site:ready-for-effects', scheduleInitialize, { once: true });
  window.addEventListener('load', () => window.setTimeout(scheduleInitialize, 1400), { once: true });
})();
