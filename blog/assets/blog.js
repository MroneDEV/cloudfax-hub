/* ==========================================================================
   CloudFax Journal — Interactive Reader, TOC Spy, Lightbox & Hub Filtering
   ========================================================================== */

(function () {
  'use strict';

  /* 1. Reading Progress Bar */
  const progressBar = document.getElementById('reading-progress');
  if (progressBar) {
    const updateProgress = () => {
      const docEl = document.documentElement;
      const scrollTop = docEl.scrollTop || document.body.scrollTop;
      const scrollHeight = docEl.scrollHeight - docEl.clientHeight;
      const pct = scrollHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / scrollHeight) * 100)) : 0;
      progressBar.style.width = pct.toFixed(2) + '%';
    };
    window.addEventListener('scroll', updateProgress, { passive: true });
    updateProgress();
  }

  /* 2. Reader Typography Preferences (Serif / Sans + Font Size) */
  window.setReaderFont = function (mode) {
    const clean = mode === 'sans' ? 'sans' : 'serif';
    document.documentElement.setAttribute('data-reader-font', clean);
    const btnSerif = document.getElementById('btn-font-serif');
    const btnSans = document.getElementById('btn-font-sans');
    if (btnSerif) btnSerif.classList.toggle('active', clean === 'serif');
    if (btnSans) btnSans.classList.toggle('active', clean === 'sans');
    try { localStorage.setItem('cfj_font', clean); } catch (e) {}
  };

  const SIZES = ['md', 'lg', 'sm'];
  window.cycleReaderSize = function () {
    const cur = document.documentElement.getAttribute('data-reader-size') || 'md';
    const next = SIZES[(SIZES.indexOf(cur) + 1) % SIZES.length];
    document.documentElement.setAttribute('data-reader-size', next);
    const btnSize = document.getElementById('btn-font-size');
    if (btnSize) {
      btnSize.textContent = next === 'lg' ? 'A+ Large' : (next === 'sm' ? 'A- Compact' : 'Aa Size');
    }
    try { localStorage.setItem('cfj_size', next); } catch (e) {}
  };

  try {
    const savedFont = localStorage.getItem('cfj_font');
    if (savedFont === 'sans' || savedFont === 'serif') window.setReaderFont(savedFont);
    const savedSize = localStorage.getItem('cfj_size');
    if (savedSize && SIZES.includes(savedSize)) {
      document.documentElement.setAttribute('data-reader-size', savedSize);
    }
  } catch (e) {}

  /* 3. Sticky Table of Contents Scroll-Spy */
  const tocLinks = Array.from(document.querySelectorAll('.toc-list a[href^="#"]'));
  if (tocLinks.length > 0 && 'IntersectionObserver' in window) {
    const headings = tocLinks
      .map(a => document.getElementById(a.getAttribute('href').slice(1)))
      .filter(Boolean);

    const activateId = (id) => {
      tocLinks.forEach(a => {
        a.classList.toggle('active', a.getAttribute('href') === '#' + id);
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter(e => e.isIntersecting);
        if (visible.length > 0) {
          activateId(visible[0].target.id);
        }
      },
      { rootMargin: '-95px 0px -68% 0px', threshold: 0.05 }
    );

    headings.forEach(h => observer.observe(h));
  }

  /* 4. Click-to-Zoom Lightbox for 3D Covers & Infographics */
  const lightbox = document.getElementById('editorial-lightbox');
  const lightboxImg = document.getElementById('editorial-lightbox-img');
  if (lightbox && lightboxImg) {
    document.querySelectorAll('.hero-cover-frame img, .editorial-figure img').forEach(img => {
      img.parentElement.addEventListener('click', () => {
        lightboxImg.src = img.src;
        lightboxImg.alt = img.alt || '';
        lightbox.classList.add('open');
      });
    });

    lightbox.addEventListener('click', () => lightbox.classList.remove('open'));
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') lightbox.classList.remove('open');
    });
  }

  /* 5. Share & Copy Link Helpers */
  window.shareArticle = function (platform, btnEl) {
    const url = window.location.href;
    const title = document.title;
    if (platform === 'copy') {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url);
      }
      if (btnEl) {
        const orig = btnEl.innerHTML;
        btnEl.innerHTML = '✓ Copied!';
        setTimeout(() => { btnEl.innerHTML = orig; }, 1800);
      }
      return;
    }
    const routes = {
      reddit: 'https://www.reddit.com/submit?url=' + encodeURIComponent(url) + '&title=' + encodeURIComponent(title),
      linkedin: 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url),
      x: 'https://twitter.com/intent/tweet?url=' + encodeURIComponent(url) + '&text=' + encodeURIComponent(title),
      whatsapp: 'https://api.whatsapp.com/send?text=' + encodeURIComponent(title + ' — ' + url)
    };
    if (routes[platform]) {
      window.open(routes[platform], '_blank', 'noopener,noreferrer,width=680,height=560');
    }
  };

  /* 6. Blog Magazine Hub Filtering, Live Search & Language Routing */
  const grid = document.getElementById('blog-articles-grid');
  if (grid) {
    const cards = Array.from(grid.querySelectorAll('.article-card'));
    const catBtns = Array.from(document.querySelectorAll('[data-filter-cat]'));
    const langBtns = Array.from(document.querySelectorAll('[data-filter-lang]'));
    const searchInput = document.getElementById('blog-search-input');
    const countLabel = document.getElementById('visible-articles-count');
    const emptyState = document.getElementById('empty-search-state');

    let activeCat = 'all';
    let activeLang = document.documentElement.getAttribute('data-default-filter-lang') || 'all';
    let query = '';

    const applyFilters = () => {
      const q = query.trim().toLowerCase();
      let shown = 0;

      cards.forEach(card => {
        const cCat = card.getAttribute('data-cat') || '';
        const cLang = card.getAttribute('data-lang') || '';
        const cSearch = (card.getAttribute('data-search') || '').toLowerCase();

        const matchCat = activeCat === 'all' || cCat === activeCat;
        const matchLang = activeLang === 'all' || cLang === activeLang;
        const matchQ = !q || cSearch.includes(q);

        const visible = matchCat && matchLang && matchQ;
        card.style.display = visible ? 'flex' : 'none';
        if (visible) shown++;
      });

      if (countLabel) countLabel.textContent = String(shown);
      if (emptyState) emptyState.style.display = shown === 0 ? 'block' : 'none';
    };

    window.filterByCategory = function (cat) {
      activeCat = cat;
      catBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-filter-cat') === cat));
      applyFilters();
    };

    window.filterByLang = function (lang) {
      activeLang = lang;
      langBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-filter-lang') === lang));
      if (lang === 'en' || lang === 'fr') {
        window.setHubUiLang(lang, false);
      }
      applyFilters();
    };

    window.setHubUiLang = function (uiLang, alsoFilterCards) {
      const norm = uiLang === 'fr' ? 'fr' : 'en';
      document.documentElement.setAttribute('data-ui-lang', norm);
      document.documentElement.setAttribute('lang', norm);
      const uEn = document.getElementById('ui-lang-en');
      const uFr = document.getElementById('ui-lang-fr');
      if (uEn) uEn.classList.toggle('active', norm === 'en');
      if (uFr) uFr.classList.toggle('active', norm === 'fr');
      if (searchInput) {
        searchInput.placeholder = norm === 'fr'
          ? 'Rechercher un guide (ChatGPT, RGPD, Gmail, iPhone...)'
          : 'Search 24 guides (ChatGPT, HIPAA, IRS 2553, Gmail...)';
      }
      try { localStorage.setItem('cloudfax_lang', norm); } catch (e) {}
      if (alsoFilterCards) {
        window.filterByLang(norm);
      }
    };

    window.resetBlogFilters = function () {
      if (searchInput) searchInput.value = '';
      query = '';
      activeCat = 'all';
      activeLang = 'all';
      catBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-filter-cat') === 'all'));
      langBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-filter-lang') === 'all'));
      applyFilters();
    };

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        query = e.target.value || '';
        applyFilters();
      });
    }

    /* Check URL params & visitor language on load */
    const params = new URLSearchParams(window.location.search);
    const pCat = params.get('cat');
    const pLang = params.get('lang');
    const pQ = params.get('q');

    if (pCat) activeCat = pCat;
    if (pQ && searchInput) {
      searchInput.value = pQ;
      query = pQ;
    }

    const isDedicatedFrPage = document.documentElement.getAttribute('data-dedicated-fr') === 'true';
    if (isDedicatedFrPage) {
      window.setHubUiLang('fr', false);
      activeLang = pLang || 'fr';
    } else if (pLang === 'fr' || pLang === 'en' || pLang === 'all') {
      if (pLang === 'fr' || pLang === 'en') window.setHubUiLang(pLang, false);
      activeLang = pLang;
    } else {
      let detected = 'en';
      try {
        const saved = localStorage.getItem('cloudfax_lang');
        if (saved === 'fr' || saved === 'en') {
          detected = saved;
        } else {
          const langs = navigator.languages || [navigator.language || 'en'];
          if (langs.some(l => l && l.toLowerCase().startsWith('fr'))) detected = 'fr';
        }
      } catch (e) {}
      window.setHubUiLang(detected, false);
      /* On main hub, keep all 24 visible unless French visitor wants FR prioritized */
      if (detected === 'fr') {
        activeLang = 'fr';
      }
    }

    catBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-filter-cat') === activeCat));
    langBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-filter-lang') === activeLang));
    applyFilters();
  }
})();

