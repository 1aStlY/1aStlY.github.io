(() => {
  'use strict';

  const html = document.documentElement;
  const langBtn = document.getElementById('langBtn');
  const themeBtn = document.getElementById('themeBtn');
  const menuBtn = document.getElementById('menuBtn');
  const nav = document.getElementById('navlinks');
  const toast = document.getElementById('toast');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  const storage = {
    get(key) {
      try { return localStorage.getItem(key); } catch { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, value); } catch { /* no-op */ }
    }
  };

  const preferredTheme = storage.get('site-theme')
    || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const preferredLang = storage.get('site-lang')
    || (navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en');

  setTheme(preferredTheme);
  setLang(preferredLang);
  document.getElementById('year').textContent = new Date().getFullYear();

  function setTheme(theme) {
    html.dataset.theme = theme;
    storage.set('site-theme', theme);
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#070b14' : '#edf4ff';
  }

  function setLang(language) {
    html.dataset.lang = language;
    html.lang = language === 'zh' ? 'zh-CN' : 'en';
    langBtn.textContent = language === 'zh' ? 'EN' : '中';
    storage.set('site-lang', language);
  }

  themeBtn.addEventListener('click', () => setTheme(html.dataset.theme === 'dark' ? 'light' : 'dark'));
  langBtn.addEventListener('click', () => setLang(html.dataset.lang === 'zh' ? 'en' : 'zh'));

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

  let toastTimer;
  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('show');
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 2200);
  }

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

  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.reveal').forEach(element => revealObserver.observe(element));

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
  }, { rootMargin: '-35% 0px -55%', threshold: [0.01, 0.2, 0.5] });
  sections.forEach(section => sectionObserver.observe(section));

  function initializeDirectionalStretch() {
    if (!finePointer || reducedMotion) return;

    const cards = document.querySelectorAll(
      '.glass:not(.topbar):not(.status-pill):not(.liquid-cursor)'
    );

    cards.forEach(card => {
      const state = {
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        amount: 0,
        targetAmount: 0,
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
        card.style.setProperty('--edge-x', String(state.x));
        card.style.setProperty('--edge-y', String(state.y));
        card.style.setProperty('--hover-power', String(state.amount));

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
            card.style.removeProperty('--edge-x');
            card.style.removeProperty('--edge-y');
            card.style.removeProperty('--hover-power');
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

  const lightbox = document.getElementById('lightbox');
  const lightboxImage = document.getElementById('lightboxImg');

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

  document.getElementById('closeLightbox').addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox) closeLightbox();
  });
  window.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeLightbox();
  });

  // Strengthen the fixed Gaussian-glass title bar after the page begins scrolling.
  const topbar = document.querySelector('.topbar');
  const updateTopbarState = () => {
    topbar?.classList.toggle('is-scrolled', window.scrollY > 18);
  };
  updateTopbarState();
  window.addEventListener('scroll', updateTopbarState, { passive: true });

  initializeDirectionalStretch();
})();
