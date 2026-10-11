(function () {
  var root = document.documentElement;

  function save(key, value) {
    try { localStorage.setItem(key, value); } catch (e) {}
  }

  document.querySelectorAll('[data-set-lang]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var lang = btn.getAttribute('data-set-lang');
      root.dataset.lang = lang;
      root.lang = lang;
      save('lang', lang);
    });
  });

  document.querySelector('.theme-toggle').addEventListener('click', function () {
    var current = root.dataset.theme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    var next = current === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    save('theme', next);
  });

  /* ---------- viewer (PDFs and project write-ups) ---------- */
  var dialog = document.getElementById('viewer');
  var titleEl = document.getElementById('viewer-title');
  var bodyEl = dialog.querySelector('.viewer-body');
  var PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
  var pdfjsReady = null;
  var renderToken = 0;

  function loadPdfjs() {
    if (pdfjsReady) return pdfjsReady;
    pdfjsReady = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = PDFJS + 'pdf.min.js';
      s.onload = function () {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + 'pdf.worker.min.js';
        resolve(window.pdfjsLib);
      };
      s.onerror = function () { pdfjsReady = null; reject(new Error('pdf.js failed to load')); };
      document.head.appendChild(s);
    });
    return pdfjsReady;
  }

  function setTitle(en, ko) {
    titleEl.innerHTML = '';
    var a = document.createElement('span'); a.className = 'en'; a.textContent = en;
    var b = document.createElement('span'); b.className = 'ko'; b.textContent = ko || en;
    titleEl.append(a, b);
  }

  function open() {
    if (!dialog.open) dialog.showModal();
    bodyEl.scrollTop = 0;
  }

  function message(en, ko, href) {
    bodyEl.innerHTML = '<p class="viewer-msg"><span class="en"></span><span class="ko"></span></p>';
    bodyEl.querySelector('.en').textContent = en;
    bodyEl.querySelector('.ko').textContent = ko;
    if (href) {
      var link = document.createElement('a');
      link.href = href; link.target = '_blank'; link.rel = 'noopener';
      link.className = 'btn';
      link.innerHTML = '<span class="en">Open in a new tab</span><span class="ko">새 탭에서 열기</span>';
      bodyEl.querySelector('.viewer-msg').appendChild(link);
    }
  }

  function openPdf(url, en, ko) {
    var token = ++renderToken;
    setTitle(en, ko);
    message('Loading…', '불러오는 중…');
    open();
    loadPdfjs()
      .then(function (lib) { return lib.getDocument(url).promise; })
      .then(function (pdf) {
        if (token !== renderToken) return;
        bodyEl.innerHTML = '';
        var width = bodyEl.clientWidth - 32;
        var dpr = window.devicePixelRatio || 1;
        var chain = Promise.resolve();
        for (var n = 1; n <= pdf.numPages; n++) {
          (function (n) {
            chain = chain.then(function () { return pdf.getPage(n); }).then(function (page) {
              if (token !== renderToken) return;
              var base = page.getViewport({ scale: 1 });
              var vp = page.getViewport({ scale: (width / base.width) * dpr });
              var canvas = document.createElement('canvas');
              canvas.className = 'pdf-page';
              canvas.width = vp.width;
              canvas.height = vp.height;
              canvas.style.aspectRatio = vp.width + ' / ' + vp.height;
              bodyEl.appendChild(canvas);
              return page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
            });
          })(n);
        }
        return chain;
      })
      .catch(function () {
        if (token !== renderToken) return;
        message('The PDF could not be displayed here.', '여기서 PDF를 표시할 수 없습니다.', url);
      });
  }

  function openProject(id, card) {
    var tpl = document.getElementById('tpl-' + id);
    if (!tpl) return;
    renderToken++;
    var h = card.querySelector('h3');
    setTitle(h.querySelector('.en').textContent, h.querySelector('.ko').textContent);
    bodyEl.innerHTML = '';
    bodyEl.appendChild(tpl.content.cloneNode(true));
    open();
  }

  document.addEventListener('click', function (e) {
    var pdf = e.target.closest('[data-pdf]');
    if (pdf) {
      e.preventDefault();
      openPdf(pdf.getAttribute('data-pdf'), pdf.getAttribute('data-title-en'), pdf.getAttribute('data-title-ko'));
      return;
    }
    var project = e.target.closest('[data-project]');
    if (project) {
      e.preventDefault();
      openProject(project.getAttribute('data-project'), project);
    }
  });

  dialog.querySelector('.viewer-close').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
})();
