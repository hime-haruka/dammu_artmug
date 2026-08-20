(function () {
  'use strict';

  var IFRAME_ORIGIN = 'https://hime-haruka.github.io';
  var IFRAME_PATH = 'hime-haruka.github.io/dammu_artmug';
  var FRAME_KEYS = [IFRAME_PATH, 'dammu_artmug', 'dammu-artmug', 'dammu'];
  var STYLE_ID = 'dammu-artmug-parent-style';
  var MODAL_ID = 'dammu-artmug-parent-modal';
  var VIDEO_EMBED_BASE = 'https://www.youtube.com/embed/';
  var lastHeight = 0;
  var timer = null;

  function frame() {
    var selectors = FRAME_KEYS.map(function (key) {
      return 'iframe[src*="' + key + '"]';
    });
    selectors.push('section[name="am-root"] iframe');
    selectors.push('[name="am-root"] iframe');
    return document.querySelector(selectors.join(','));
  }

  function origin() {
    return IFRAME_ORIGIN;
  }

  function css() {
    if (document.getElementById(STYLE_ID)) return;

    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.dammu-parent-modal{position:fixed;inset:0;z-index:1000000;display:none;align-items:center;justify-content:center;padding:34px;background:rgba(22,28,36,.68);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}',
      '.dammu-parent-modal.is-open{display:flex}',
      '.dammu-parent-modal__panel{position:relative;width:auto;max-width:min(94vw,1280px);max-height:90vh;border-radius:24px;background:#fff;box-shadow:0 30px 100px rgba(18,24,32,.34);overflow:hidden}',
      '.dammu-parent-modal__img{display:block;max-width:100%;max-height:90vh;object-fit:contain;background:#fff}',
      '.dammu-parent-modal__video{display:none;position:relative;width:min(90vw,1120px);aspect-ratio:16/9;background:#000}',
      '.dammu-parent-modal__video iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}',
      '.dammu-parent-modal.is-video .dammu-parent-modal__panel{width:min(90vw,1120px);background:#000}',
      '.dammu-parent-modal.is-video .dammu-parent-modal__img{display:none}',
      '.dammu-parent-modal.is-video .dammu-parent-modal__video{display:block}',
      '.dammu-parent-modal__close{position:absolute;top:12px;right:12px;width:42px;height:42px;border:1px solid rgba(255,255,255,.24);border-radius:50%;background:rgba(34,42,52,.64);color:#fff;font-size:26px;font-weight:800;line-height:1;cursor:pointer;box-shadow:0 10px 24px rgba(0,0,0,.18)}'
    ].join('');
    document.head.appendChild(style);
  }

  function removeArtmugMoreButton() {
    document.querySelectorAll('.btn_open_btn,.btn_open,.btn_close').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.detailinfo,.detailinfo .showcontent').forEach(function (el) {
      el.classList.remove('showstep1');
      el.style.maxHeight = 'none';
      el.style.overflow = 'visible';
    });
  }

  function prepareFrame() {
    var iframe = frame();
    if (!iframe) return;

    iframe.style.width = '100%';
    iframe.style.maxWidth = '1180px';
    iframe.style.margin = '0 auto';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.overflow = 'hidden';
    iframe.setAttribute('scrolling', 'no');

    if (!iframe.dataset.dammuParentBound) {
      iframe.dataset.dammuParentBound = '1';
      iframe.addEventListener('load', function () {
        [80, 220, 700, 1400].forEach(function (ms) {
          setTimeout(requestHeight, ms);
        });
      });
    }
  }

  function setHeight(value) {
    var iframe = frame();
    var next = Math.max(720, Math.ceil(Number(value) || 0) + 24);

    if (!iframe || !next || Math.abs(next - lastHeight) < 30) return;

    iframe.style.width = '100%';
    iframe.style.maxWidth = '1180px';
    iframe.style.margin = '0 auto';
    iframe.style.height = next + 'px';
    iframe.style.minHeight = '720px';
    iframe.style.border = '0';
    iframe.style.display = 'block';
    iframe.style.overflow = 'hidden';
    iframe.height = String(next);
    iframe.setAttribute('height', String(next));
    iframe.setAttribute('scrolling', 'no');
    lastHeight = next;
  }

  function requestHeight() {
    var iframe = frame();
    if (!iframe || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ source: 'dammu-parent', type: 'DAMMU_REQUEST_HEIGHT' }, origin());
  }

  function modal() {
    var m = document.getElementById(MODAL_ID);
    if (m) return m;

    m = document.createElement('div');
    m.id = MODAL_ID;
    m.className = 'dammu-parent-modal';
    m.innerHTML = '<div class="dammu-parent-modal__panel"><button type="button" class="dammu-parent-modal__close" aria-label="닫기">×</button><img class="dammu-parent-modal__img" alt="이미지 크게 보기"><div class="dammu-parent-modal__video"><iframe class="dammu-parent-modal__iframe" title="YouTube video player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></div>'; 
    m.addEventListener('click', function (event) { if (event.target === m) closeModal(); });
    m.querySelector('button').addEventListener('click', closeModal);
    document.body.appendChild(m);
    return m;
  }

  function openModal(src) {
    if (!src) return;
    var m = modal();
    var img = m.querySelector('img');
    var iframe = m.querySelector('iframe');
    m.classList.remove('is-video');
    if (iframe) iframe.removeAttribute('src');
    img.src = src;
    m.classList.add('is-open');
  }

  function openVideoModal(videoId) {
    if (!videoId) return;
    var safeId = String(videoId).match(/^[a-zA-Z0-9_-]{11}$/) ? String(videoId) : '';
    if (!safeId) return;

    var m = modal();
    var img = m.querySelector('img');
    var iframe = m.querySelector('iframe');
    if (img) img.removeAttribute('src');
    m.classList.add('is-video');
    if (iframe) iframe.src = VIDEO_EMBED_BASE + safeId + '?autoplay=1&rel=0';
    m.classList.add('is-open');
  }

  function closeModal() {
    var m = document.getElementById(MODAL_ID);
    if (!m) return;
    m.classList.remove('is-open');
    m.classList.remove('is-video');
    var img = m.querySelector('img');
    var iframe = m.querySelector('iframe');
    if (img) img.removeAttribute('src');
    if (iframe) iframe.removeAttribute('src');
  }

  function bind() {
    if (window.__dammuParentBound) return;
    window.__dammuParentBound = true;

    window.addEventListener('message', function (event) {
      var iframe = frame();
      if (!iframe) return;

      var expected = origin();
      if (expected !== '*' && event.origin !== expected) return;

      var data = event.data || {};
      if (data.source !== 'dammu-artmug') return;

      if (data.type === 'DAMMU_HEIGHT') setHeight(data.height);
      if (data.type === 'DAMMU_OPEN_MEDIA' && data.mediaType === 'image') openModal(data.src);
      if (data.type === 'DAMMU_OPEN_MEDIA' && data.mediaType === 'video') openVideoModal(data.videoId);
      if (data.type === 'DAMMU_READY') requestHeight();
    });

    window.addEventListener('resize', function () {
      clearTimeout(timer);
      timer = setTimeout(requestHeight, 120);
    });
    window.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeModal(); });
  }

  function run() {
    css();
    removeArtmugMoreButton();
    bind();
    prepareFrame();
    requestHeight();
  }

  function watch() {
    if (window.__dammuParentWatching) return;
    window.__dammuParentWatching = true;

    var observer = new MutationObserver(function () {
      clearTimeout(timer);
      timer = setTimeout(function () {
        removeArtmugMoreButton();
        prepareFrame();
        requestHeight();
      }, 120);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    [300, 900, 1800, 3200, 5200].forEach(function (ms) { setTimeout(run, ms); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { run(); watch(); });
  } else {
    run();
    watch();
  }
})();
