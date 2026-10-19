// assets/videos-page.js — Page /videos
// Agrégateur YouTube · ~34 chaînes, fetch /api/youtube, render grid + modal embed
(function () {
  'use strict';

  // Libellés lang-aware (page EN sous /en/ → <html lang="en">)
  const isEN = document.documentElement.lang === 'en';
  const T = {
    count: (n) => isEN ? `${n} video${n > 1 ? 's' : ''}` : `${n} vidéo${n > 1 ? 's' : ''}`,
    empty: isEN
      ? 'No video matches your search. Try another keyword or category.'
      : 'Aucune vidéo ne correspond à ta recherche. Essaye un autre mot-clé ou une autre catégorie.',
    error: isEN
      ? "Can't load the videos right now. Reload the page in a few minutes."
      : "Impossible de charger les vidéos pour l'instant. Recharge la page dans quelques minutes.",
  };

  const state = {
    videos: [],
    filtered: [],
    query: '',
    category: 'all',
  };

  function timeAgo(iso) {
    if (!iso) return '';
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return `il y a ${seconds} s`;
    const m = Math.floor(seconds / 60);
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h} h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `il y a ${d} j`;
    const mo = Math.floor(d / 30);
    if (mo < 12) return `il y a ${mo} mois`;
    const y = Math.floor(mo / 12);
    return `il y a ${y} an${y > 1 ? 's' : ''}`;
  }

  function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatViews(n) {
    if (!n || n <= 0) return '';
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace('.0', '')} Md vues`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} M vues`;
    if (n >= 1_000) return `${Math.round(n / 1_000)} K vues`;
    return `${n} vues`;
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function normalize(s) {
    return String(s || '').toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function applyFilters() {
    let list = state.videos.slice();
    if (state.category !== 'all') {
      list = list.filter(v => v.channel && v.channel.category === state.category);
    }
    if (state.query) {
      const q = normalize(state.query);
      list = list.filter(v =>
        normalize(v.title).includes(q) ||
        normalize(v.channel && v.channel.name).includes(q) ||
        normalize(v.description || '').includes(q)
      );
    }
    state.filtered = list;
    render();
  }

  function render() {
    const grid = document.getElementById('videosGrid');
    if (!grid) return;
    grid.classList.remove('skeleton-grid');

    const count = document.getElementById('videosCount');
    if (count) count.textContent = T.count(state.filtered.length);

    if (!state.filtered.length) {
      grid.innerHTML = `<div class="videos-empty">${T.empty}</div>`;
      return;
    }

    grid.innerHTML = state.filtered.map(videoCard).join('');
  }

  function videoCard(v) {
    const ch = v.channel || {};
    const cat = ch.category || '';
    const catSlug = cat.toLowerCase();
    const duration = formatDuration(v.duration_seconds);
    const views = formatViews(v.view_count);
    const dateLabel = timeAgo(v.publishedAt);
    return `
      <article class="video-card" data-video-id="${escapeHtml(v.videoId)}" data-video-url="${escapeHtml(v.url)}" data-video-title="${escapeHtml(v.title)}" data-channel-name="${escapeHtml(ch.name)}" data-channel-avatar="${escapeHtml(ch.avatar || '')}">
        <div class="video-thumb">
          <img src="${escapeHtml(v.thumbnail)}" alt="" loading="lazy">
          <div class="video-thumb-play" aria-hidden="true">▶</div>
          ${duration ? `<span class="video-duration">${escapeHtml(duration)}</span>` : ''}
        </div>
        <div class="video-meta">
          <h3 class="video-title">${escapeHtml(v.title)}</h3>
          <div class="video-sub-line1">
            <img class="video-channel-avatar" src="${escapeHtml(ch.avatar || '/photos/og-jerwis.jpg')}" alt="" loading="lazy" width="24" height="24" onerror="this.src='/photos/og-jerwis.jpg'">
            <span class="video-channel-name">${escapeHtml(ch.name || '')}</span>
          </div>
          <div class="video-stats">
            ${views ? `${escapeHtml(views)} · ` : ''}${escapeHtml(dateLabel)}
          </div>
          ${cat ? `<span class="video-cat-pill cat-${escapeHtml(catSlug)}">${escapeHtml(cat)}</span>` : ''}
        </div>
      </article>
    `;
  }

  // Modal
  function openModal(card) {
    const modal = document.getElementById('videoModal');
    if (!modal) return;
    const videoId = card.dataset.videoId;
    const title = card.dataset.videoTitle;
    const channelName = card.dataset.channelName;
    const avatar = card.dataset.channelAvatar;
    const iframe = document.getElementById('videoIframe');
    if (iframe) iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
    const titleEl = modal.querySelector('.video-modal-title');
    if (titleEl) titleEl.textContent = title || '';
    const chanEl = modal.querySelector('.video-modal-channel');
    if (chanEl) chanEl.textContent = channelName || '';
    const av = modal.querySelector('.video-modal-avatar');
    if (av) {
      av.src = avatar || '/photos/og-jerwis.jpg';
      av.alt = channelName || '';
      av.onerror = function () { this.src = '/photos/og-jerwis.jpg'; };
    }
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const modal = document.getElementById('videoModal');
    if (!modal) return;
    const iframe = document.getElementById('videoIframe');
    if (iframe) iframe.src = '';  // stops playback
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Init
  async function init() {
    try {
      const res = await fetch('/api/youtube');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      state.videos = Array.isArray(data) ? data : [];
      applyFilters();
    } catch (e) {
      const grid = document.getElementById('videosGrid');
      const count = document.getElementById('videosCount');
      if (grid) {
        grid.classList.remove('skeleton-grid');
        grid.innerHTML = `<div class="videos-empty">${T.error}</div>`;
      }
      if (count) count.textContent = '';
    }

    document.querySelectorAll('.cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        state.category = btn.dataset.cat || 'all';
        document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b === btn));
        applyFilters();
      });
    });

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(e => {
        state.query = e.target.value;
        applyFilters();
      }, 200));
    }

    // Modal handlers
    const grid = document.getElementById('videosGrid');
    if (grid) {
      grid.addEventListener('click', e => {
        const card = e.target.closest('.video-card');
        if (!card) return;
        openModal(card);
      });
    }
    document.querySelector('.video-modal-close')?.addEventListener('click', closeModal);
    document.querySelector('.video-modal-backdrop')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
