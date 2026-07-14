(() => {
  'use strict';

  const html = document.documentElement;
  const langBtn = document.getElementById('langBtn');
  const themeBtn = document.getElementById('themeBtn');
  const menuBtn = document.getElementById('menuBtn');
  const performanceBtn = document.getElementById('performanceBtn');
  const performanceLabel = document.getElementById('performanceLabel');
  const nav = document.getElementById('navlinks');
  const toast = document.getElementById('toast');
  const modeGate = document.getElementById('modeGate');
  const rememberMode = document.getElementById('rememberMode');
  const modeButtons = [...document.querySelectorAll('[data-mode]')];

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const compactViewport = window.matchMedia('(max-width: 780px)').matches;
  const lowMemory = Number.isFinite(navigator.deviceMemory) && navigator.deviceMemory <= 4;
  const recommendedMode = (reducedMotion || compactViewport || lowMemory) ? 'lite' : 'full';

  const storage = {
    getLocal(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    setLocal(key, value) {
      try { localStorage.setItem(key, value); } catch { /* storage unavailable */ }
    },
    removeLocal(key) {
      try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
    },
    getSession(key) {
      try { return sessionStorage.getItem(key); } catch { return null; }
    },
    setSession(key, value) {
      try { sessionStorage.setItem(key, value); } catch { /* storage unavailable */ }
    }
  };

  const preferredTheme = storage.getLocal('site-theme')
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const preferredLang = storage.getLocal('site-lang')
    || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en');

  let activeMode = null;
  let siteStarted = false;
  let liquidScriptPromise = null;
  let toastTimer = null;

  setTheme(preferredTheme);
  setLang(preferredLang);
  document.getElementById('year').textContent = new Date().getFullYear();
  markRecommendedMode();

  function setTheme(theme) {
    html.dataset.theme = theme;
    storage.setLocal('site-theme', theme);
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.content = theme === 'dark' ? '#070b14' : '#edf4ff';
  }

  function setLang(language) {
    html.dataset.lang = language;
    html.lang = language === 'zh' ? 'zh-CN' : 'en';
    langBtn.textContent = language === 'zh' ? 'EN' : '中';
    storage.setLocal('site-lang', language);
    updateModeButton();
  }

  function markRecommendedMode() {
    modeButtons.forEach(button => {
      button.classList.toggle('recommended', button.dataset.mode === recommendedMode);
    });
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

  function updateModeButton() {
    if (!performanceLabel) return;
    if (activeMode === 'full') {
      performanceLabel.textContent = html.dataset.lang === 'zh' ? '全量' : 'FULL';
      performanceBtn?.setAttribute(
        'aria-label',
        html.dataset.lang === 'zh' ? '当前为全量模式，点击切换' : 'Full mode active, click to change'
      );
    } else if (activeMode === 'lite') {
      performanceLabel.textContent = html.dataset.lang === 'zh' ? '精简' : 'LITE';
      performanceBtn?.setAttribute(
        'aria-label',
        html.dataset.lang === 'zh' ? '当前为精简模式，点击切换' : 'Lite mode active, click to change'
      );
    } else {
      performanceLabel.textContent = html.dataset.lang === 'zh' ? '模式' : 'MODE';
    }
  }

  themeBtn.addEventListener('click', () => {
    setTheme(html.dataset.theme === 'dark' ? 'light' : 'dark');
  });

  langBtn.addEventListener('click', () => {
    setLang(html.dataset.lang === 'zh' ? 'en' : 'zh');
  });

  menuBtn.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(isOpen));
  });

  nav.querySelectorAll('a').forEach(anchor => {
    anchor.addEventListener('click', () => {
      nav.classList.remove('open');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  performanceBtn?.addEventListener('click', () => {
    openModeGate();
  });

  document.querySelectorAll('.copy-email').forEach(button => {
    button.addEventListener('click', async () => {
      const email = button.dataset.email;
      try {
        await navigator.clipboard.writeText(email);
      } catch {
        const area = document.createElement('textarea');
        area.value = email;
        area.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      showToast(html.dataset.lang === 'zh' ? `邮箱已复制：${email}` : `Email copied: ${email}`);
    });
  });

  modeButtons.forEach(button => {
    button.addEventListener('click', () => {
      chooseMode(button.dataset.mode);
    });
  });

  function openModeGate() {
    modeGate.hidden = false;
    modeGate.classList.remove('leaving');
    modeGate.classList.add('open');
    html.classList.add('mode-pending');
    document.body.style.overflow = 'hidden';
    const selected = modeButtons.find(button => button.dataset.mode === activeMode)
      || modeButtons.find(button => button.dataset.mode === recommendedMode)
      || modeButtons[0];
    window.setTimeout(() => selected?.focus(), 30);
  }

  function closeModeGate() {
    modeGate.classList.add('leaving');
    modeGate.classList.remove('open');
    html.classList.remove('mode-pending');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      modeGate.hidden = true;
      modeGate.classList.remove('leaving');
    }, 360);
  }

  function persistMode(mode) {
    storage.setSession('site-performance-mode', mode);
    if (rememberMode.checked) {
      storage.setLocal('site-performance-mode', mode);
    } else {
      storage.removeLocal('site-performance-mode');
    }
  }

  async function chooseMode(mode) {
    if (mode !== 'full' && mode !== 'lite') return;

    persistMode(mode);
    modeButtons.forEach(button => {
      button.disabled = true;
      button.classList.toggle('selected', button.dataset.mode === mode);
    });

    if (siteStarted && activeMode && activeMode !== mode) {
      // A reload is the cleanest way to remove filters, observers and transforms
      // when switching from full mode to lite mode.
      window.setTimeout(() => window.location.reload(), 150);
      return;
    }

    activeMode = mode;
    html.dataset.performance = mode;
    updateModeButton();

    await waitForCriticalImage(800);

    if (mode === 'full') {
      startFullMode();
    } else {
      startLiteMode();
    }

    siteStarted = true;
    html.classList.add('site-started');
    closeModeGate();

    modeButtons.forEach(button => {
      button.disabled = false;
      button.classList.remove('selected');
    });
  }

  function startLiteMode() {
    document.querySelectorAll('.reveal').forEach(element => {
      element.classList.add('visible');
    });
    setupSectionNavigation();
    setupLightbox();
    setupTopbarScrollState();
  }

  function startFullMode() {
    setupRevealAnimations();
    setupSectionNavigation();
    setupLightbox();
    initializeTopbarFlow();
    initializeDirectionalStretch();

    loadLiquidGlassScript().then(() => {
      window.dispatchEvent(new CustomEvent('site:ready-for-effects'));
    });
  }

  function loadLiquidGlassScript() {
    if (liquidScriptPromise) return liquidScriptPromise;

    liquidScriptPromise = new Promise(resolve => {
      const script = document.createElement('script');
      script.src = 'liquid-glass.js?v=6.0.0';
      script.async = true;
      script.onload = resolve;
      script.onerror = () => {
        console.debug('Liquid glass script unavailable; CSS fallback remains active.');
        resolve();
      };
      document.head.appendChild(script);
    });

    return liquidScriptPromise;
  }

  function waitForCriticalImage(maximumWait = 800) {
    const image = document.querySelector('[data-critical-image]');
    if (!image) return Promise.resolve();

    const imageReady = image.complete && image.naturalWidth > 0
      ? (typeof image.decode === 'function' ? image.decode().catch(() => undefined) : Promise.resolve())
      : new Promise(resolve => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', resolve, { once: true });
        });

    const timeout = new Promise(resolve => window.setTimeout(resolve, maximumWait));
    return Promise.race([imageReady, timeout]);
  }

  function setupRevealAnimations() {
    if (reducedMotion) {
      document.querySelectorAll('.reveal').forEach(element => element.classList.add('visible'));
      return;
    }

    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '120px 0px' });

    document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));
  }

  function setupSectionNavigation() {
    if (setupSectionNavigation.done) return;
    setupSectionNavigation.done = true;

    const sections = [...document.querySelectorAll('main section[id]')];
    const links = [...nav.querySelectorAll('a')];

    const sectionObserver = new IntersectionObserver(entries => {
      const visible = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;

      links.forEach(anchor => {
        anchor.classList.toggle('active', anchor.getAttribute('href') === `#${visible.target.id}`);
      });
    }, { rootMargin: '-32% 0px -58%', threshold: [0.01, 0.2, 0.5] });

    sections.forEach(section => sectionObserver.observe(section));
  }

  function setupTopbarScrollState() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || setupTopbarScrollState.done) return;
    setupTopbarScrollState.done = true;

    const updateScrollState = () => {
      topbar.classList.toggle('is-scrolled', window.scrollY > 18);
    };

    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
  }

  function initializeDirectionalStretch() {
    if (!finePointer || reducedMotion) return;

    const cards = document.querySelectorAll('.glass:not(.topbar):not(.status-pill)');

    cards.forEach(card => {
      const state = {
        x: 0, y: 0,
        targetX: 0, targetY: 0,
        amount: 0, targetAmount: 0,
        running: false
      };

      const baseAngle = card.classList.contains('portrait-card') ? 1.5 : 0;

      function animate() {
        state.x += (state.targetX - state.x) * 0.24;
        state.y += (state.targetY - state.y) * 0.24;
        state.amount += (state.targetAmount - state.amount) * 0.22;

        const rect = card.getBoundingClientRect();
        const minDimension = Math.max(1, Math.min(rect.width, rect.height));
        const strength = Math.max(0.082, Math.min(0.18, 44 / minDimension));
        const xWeight = Math.abs(state.x);
        const yWeight = Math.abs(state.y);

        const scaleX = 1 + state.amount * (0.035 + xWeight * strength + yWeight * 0.024);
        const scaleY = 1 + state.amount * (0.035 + yWeight * strength + xWeight * 0.024);
        const translateX = state.x * state.amount * 18;
        const translateY = state.y * state.amount * 15;
        const rotateY = state.x * state.amount * 9;
        const rotateX = -state.y * state.amount * 8;
        const originX = 50 - state.x * 47;
        const originY = 50 - state.y * 47;

        card.style.transformOrigin = `${originX}% ${originY}%`;
        card.style.transform = `perspective(1050px) translate3d(${translateX}px, ${translateY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${baseAngle}deg) scaleX(${scaleX}) scaleY(${scaleY})`;
        card.style.setProperty('--mx', `${(state.x * 0.5 + 0.5) * 100}%`);
        card.style.setProperty('--my', `${(state.y * 0.5 + 0.5) * 100}%`);

        const moving = Math.abs(state.targetX - state.x) > 0.002
          || Math.abs(state.targetY - state.y) > 0.002
          || Math.abs(state.targetAmount - state.amount) > 0.002;

        if (moving) {
          requestAnimationFrame(animate);
        } else {
          state.running = false;
          if (state.targetAmount === 0) {
            card.style.removeProperty('transform-origin');
            card.style.removeProperty('transform');
            card.style.removeProperty('--mx');
            card.style.removeProperty('--my');
          }
        }
      }

      function startAnimation() {
        if (state.running) return;
        state.running = true;
        requestAnimationFrame(animate);
      }

      card.addEventListener('pointerenter', () => {
        state.targetAmount = 1;
        card.classList.add('is-liquid-hovered');
        startAnimation();
      });

      card.addEventListener('pointermove', event => {
        const rect = card.getBoundingClientRect();
        state.targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
        state.targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
        startAnimation();
      }, { passive: true });

      card.addEventListener('pointerleave', () => {
        state.targetX = 0;
        state.targetY = 0;
        state.targetAmount = 0;
        card.classList.remove('is-liquid-hovered');
        startAnimation();
      });
    });
  }

  function initializeTopbarFlow() {
    setupTopbarScrollState();

    const topbar = document.querySelector('.topbar');
    if (!topbar || !finePointer || reducedMotion || compactViewport) return;

    const state = {
      x: 0, y: 0,
      targetX: 0, targetY: 0,
      amount: 0, targetAmount: 0,
      running: false
    };

    function animate() {
      state.x += (state.targetX - state.x) * 0.18;
      state.y += (state.targetY - state.y) * 0.18;
      state.amount += (state.targetAmount - state.amount) * 0.16;

      const ax = Math.abs(state.x);
      const ay = Math.abs(state.y);
      const power = state.amount;
      const scaleX = 1 + power * (0.028 + ax * 0.072 + ay * 0.012);
      const scaleY = 1 + power * (0.045 + ay * 0.17 + ax * 0.025);
      const translateX = state.x * power * 24;
      const translateY = state.y * power * 10;
      const rotateY = state.x * power * 3.1;
      const rotateX = -state.y * power * 4.5;
      const originX = 50 - state.x * 49;
      const originY = 50 - state.y * 49;

      topbar.style.transformOrigin = `${originX}% ${originY}%`;
      topbar.style.transform = `perspective(1500px) translate3d(${translateX}px, ${translateY}px, 0) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scaleX(${scaleX}) scaleY(${scaleY})`;
      topbar.style.setProperty('--bar-x', `${(state.x * 0.5 + 0.5) * 100}%`);
      topbar.style.setProperty('--bar-y', `${(state.y * 0.5 + 0.5) * 100}%`);
      topbar.style.setProperty('--bar-edge-x', String(state.x));
      topbar.style.setProperty('--bar-edge-y', String(state.y));
      topbar.style.setProperty('--bar-power', String(power));

      const moving = Math.abs(state.targetX - state.x) > 0.0015
        || Math.abs(state.targetY - state.y) > 0.0015
        || Math.abs(state.targetAmount - state.amount) > 0.0015;

      if (moving) {
        requestAnimationFrame(animate);
      } else {
        state.running = false;
        if (state.targetAmount === 0) {
          topbar.style.removeProperty('transform-origin');
          topbar.style.removeProperty('transform');
          topbar.style.removeProperty('--bar-x');
          topbar.style.removeProperty('--bar-y');
          topbar.style.removeProperty('--bar-edge-x');
          topbar.style.removeProperty('--bar-edge-y');
          topbar.style.removeProperty('--bar-power');
        }
      }
    }

    function startAnimation() {
      if (state.running) return;
      state.running = true;
      requestAnimationFrame(animate);
    }

    topbar.addEventListener('pointerenter', event => {
      state.targetAmount = 1;
      topbar.classList.add('is-flowing');
      const rect = topbar.getBoundingClientRect();
      state.targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      state.targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
      startAnimation();
    });

    topbar.addEventListener('pointermove', event => {
      const rect = topbar.getBoundingClientRect();
      state.targetX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width - 0.5) * 2));
      state.targetY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height - 0.5) * 2));
      startAnimation();
    }, { passive: true });

    topbar.addEventListener('pointerleave', () => {
      state.targetX = 0;
      state.targetY = 0;
      state.targetAmount = 0;
      topbar.classList.remove('is-flowing');
      startAnimation();
    });
  }

  function setupLightbox() {
    if (setupLightbox.done) return;
    setupLightbox.done = true;

    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightboxImg');
    const closeButton = document.getElementById('closeLightbox');
    if (!lightbox || !lightboxImage || !closeButton) return;

    function closeLightbox() {
      lightbox.classList.remove('open');
      lightboxImage.src = '';
      document.body.style.overflow = '';
    }

    document.querySelectorAll('[data-lightbox]').forEach(button => {
      button.addEventListener('click', () => {
        const image = button.querySelector('img');
        lightboxImage.src = button.dataset.lightbox;
        lightboxImage.alt = image?.alt || '';
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    closeButton.addEventListener('click', closeLightbox);
    lightbox.addEventListener('click', event => {
      if (event.target === lightbox) closeLightbox();
    });
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeLightbox();
    });
  }

  const savedMode = storage.getSession('site-performance-mode')
    || storage.getLocal('site-performance-mode');

  if (savedMode === 'full' || savedMode === 'lite') {
    activeMode = savedMode;
    html.dataset.performance = savedMode;
    updateModeButton();
    rememberMode.checked = Boolean(storage.getLocal('site-performance-mode'));

    modeGate.hidden = true;
    html.classList.remove('mode-pending');

    if (savedMode === 'full') {
      startFullMode();
    } else {
      startLiteMode();
    }

    siteStarted = true;
    html.classList.add('site-started');
  } else {
    openModeGate();
  }
})();
