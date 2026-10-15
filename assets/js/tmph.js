/**
 * TMPH — the personal AI assistant panel.
 *
 * What it adds to every page (loaded by layout.js):
 *   - a floating "TMPH" button (bottom-right) that opens a chat panel on the right side
 *   - streaming replies, Markdown + code blocks, Copy buttons, Stop, Clear chat, Esc to close
 *   - chat history kept in localStorage (per login), so it survives a refresh
 *
 * Safety: this file never sees the Gemini key. It only talks to api.php (?action=ai.status / ai.chat);
 * the server checks who you are, keeps the key, and applies the limits.
 * The button only appears for people the server says may use TMPH (config.php: TMPH_ALLOWED_ROLES / TMPH_ALLOWED_USERS).
 *
 * Every CSS rule is prefixed ".tmph-" so nothing here can change the look of an existing page.
 * Needs: assets/js/config.js (API_BASE_URL) and assets/js/api.js (api) — every page already loads both.
 */
(function () {
  'use strict';
  if (window.__tmphLoaded) return;
  window.__tmphLoaded = true;
  if (typeof api === 'undefined' || typeof API_BASE_URL === 'undefined') return;   // a page without the API helper
  var token = null;
  try { token = api.token(); } catch (e) {}
  if (!token) return;                                                               // not logged in

  var me = {};
  try { me = api.currentUser() || {}; } catch (e) {}
  var UID = String(me.user_id || me.username || 'u');
  var CHAT_KEY = 'tmph_chat_' + UID;          // one saved chat per login
  var OK_KEY = 'tmph_ok_' + UID;              // remembered answer of ai.status (10 minutes)
  var OK_TTL = 10 * 60 * 1000;

  /* ------------------------------------------------------------------ is TMPH turned on for this person? */
  function getCached() {
    try {
      var c = JSON.parse(sessionStorage.getItem(OK_KEY) || 'null');
      if (c && Date.now() - c.ts < OK_TTL) return c;
    } catch (e) {}
    return null;
  }
  function boot() {
    var c = getCached();
    if (c) { if (c.enabled) build(c); return; }
    api.get('ai.status').then(function (d) {
      var c2 = { enabled: !!(d && d.enabled), stream: !d || d.stream !== false, max: (d && d.max_chars) || 2000, ts: Date.now() };
      try { sessionStorage.setItem(OK_KEY, JSON.stringify(c2)); } catch (e) {}
      if (c2.enabled) build(c2);
    }).catch(function () { /* old api.php without TMPH, or offline: stay invisible */ });
  }

  /* ------------------------------------------------------------------ styles (scoped with .tmph-) */
  var CSS = [
    '.tmph-root{--t-bg:var(--surface,#fff);--t-ink:var(--ink,#14161a);--t-muted:var(--muted,#6f7480);--t-line:var(--line,#e6e8ec);',
    '--t-soft:#f4f5f7;--t-user:var(--ink,#14161a);--t-user-ink:#fff;--t-accent:var(--accent,#ff7a2f);--t-accent-dark:var(--accent-dark,#e8651a);',
    '--t-code:#14161a;--t-code-ink:#e8eaee;--t-ok:var(--ok-fg,#16945a);--t-bad:var(--bad-fg,#d9423b);--t-bad-bg:var(--bad-bg,#fdecea);',
    '--t-radius:var(--radius,26px);--t-shadow:0 24px 60px rgba(20,22,26,.18),0 2px 6px rgba(20,22,26,.06);',
    'font-family:var(--font,"Inter","Segoe UI",-apple-system,BlinkMacSystemFont,Roboto,Arial,sans-serif);font-size:14px;line-height:1.5;color:var(--t-ink)}',
    '.tmph-root.tmph-dark{--t-bg:#1b1d22;--t-ink:#eef0f3;--t-muted:#9aa0ac;--t-line:#2c3038;--t-soft:#262930;--t-user:#ff7a2f;--t-user-ink:#1b1d22;',
    '--t-code:#0f1013;--t-bad-bg:#3a2123;--t-shadow:0 24px 60px rgba(0,0,0,.55),0 0 0 1px #2c3038}',
    '.tmph-root *{box-sizing:border-box}',
    /* :where() keeps the button reset at zero specificity so the real colours below always win */
    ':where(.tmph-root) button{font:inherit;color:inherit;cursor:pointer}',
    /* the site makes every button at least 38px tall on phones — TMPH sets its own button sizes */
    '.tmph-root button{min-height:0;min-width:0;margin:0;text-transform:none;letter-spacing:normal}',
    '.tmph-fab{position:fixed;right:20px;bottom:20px;z-index:90;display:flex;align-items:center;gap:10px;height:54px;padding:0 20px 0 9px;border:none;border-radius:999px;',
    'background:#14161a;color:#fff;font-weight:800;font-size:15px;letter-spacing:.01em;box-shadow:0 10px 30px rgba(20,22,26,.28);transition:transform .18s,opacity .18s}',
    '.tmph-fab:hover{transform:translateY(-2px)}',
    '.tmph-fab-ic{width:36px;height:36px;border-radius:50%;background:var(--t-accent);display:flex;align-items:center;justify-content:center}',
    '.tmph-fab svg{width:19px;height:19px;fill:#fff}',
    '.tmph-root.tmph-open .tmph-fab{opacity:0;pointer-events:none}',
    '.tmph-panel{display:none;position:fixed;z-index:110;top:12px;right:12px;bottom:12px;width:min(430px,calc(100vw - 24px));flex-direction:column;',
    'background:var(--t-bg);border-radius:var(--t-radius);box-shadow:var(--t-shadow);overflow:hidden}',
    /* .tmph-on is put on the panel itself: layout.js watches class changes on .tmph-panel so the phone's Back button can close it */
    '.tmph-panel.tmph-on{display:flex;animation:tmphIn .26s cubic-bezier(.2,.8,.2,1)}',
    '@keyframes tmphIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}',
    '.tmph-head{display:flex;align-items:center;gap:12px;padding:16px 16px 14px 18px;border-bottom:1px solid var(--t-line);flex:none}',
    '.tmph-avatar{width:42px;height:42px;border-radius:14px;background:var(--t-accent);display:flex;align-items:center;justify-content:center;flex:none}',
    '.tmph-avatar svg{width:22px;height:22px;fill:#fff}',
    '.tmph-title{flex:1;min-width:0}',
    '.tmph-title b{display:block;font-size:17px;font-weight:800;letter-spacing:-.01em;line-height:1.2}',
    '.tmph-title span{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--t-muted)}',
    '.tmph-title span::before{content:"";width:7px;height:7px;border-radius:50%;background:#2bb673}',
    '.tmph-hbtn{display:flex;align-items:center;gap:6px;height:34px;padding:0 12px;border:none;border-radius:999px;background:var(--t-soft);font-size:12.5px;font-weight:700;color:var(--t-muted)}',
    '.tmph-hbtn:hover{color:var(--t-bad);background:var(--t-bad-bg)}',
    '.tmph-hbtn svg{width:14px;height:14px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.tmph-x{width:34px;height:34px;padding:0;justify-content:center;color:var(--t-ink)}',
    '.tmph-x:hover{background:var(--t-line);color:var(--t-ink)}',
    '.tmph-chat{flex:1;overflow-y:auto;padding:18px 16px 8px;display:flex;flex-direction:column;gap:14px;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:var(--t-line) transparent}',
    '.tmph-msg{display:flex;flex-direction:column;max-width:92%}',
    '.tmph-msg.tmph-u{align-self:flex-end;align-items:flex-end}',
    '.tmph-msg.tmph-a{align-self:flex-start;align-items:flex-start;max-width:100%;width:100%}',
    '.tmph-who{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--t-muted);margin:0 6px 4px}',
    '.tmph-a .tmph-who{color:var(--t-accent-dark)}',
    '.tmph-bubble{padding:10px 14px;border-radius:20px;word-wrap:break-word;overflow-wrap:anywhere;min-width:0;max-width:100%}',
    '.tmph-u .tmph-bubble{background:var(--t-user);color:var(--t-user-ink);border-bottom-right-radius:6px;white-space:pre-wrap}',
    '.tmph-a .tmph-bubble{background:var(--t-soft);border-top-left-radius:6px}',
    '.tmph-msg.tmph-err .tmph-bubble{background:var(--t-bad-bg);color:var(--t-bad);border:1px solid var(--t-bad)}',
    '.tmph-msg.tmph-err .tmph-who{color:var(--t-bad)}',
    '.tmph-bubble p{margin:0 0 8px}.tmph-bubble p:last-child{margin-bottom:0}',
    '.tmph-bubble ul,.tmph-bubble ol{margin:4px 0 8px;padding-left:20px}.tmph-bubble li{margin:2px 0}',
    '.tmph-bubble h4{margin:10px 0 4px;font-size:14px;font-weight:800}',
    '.tmph-bubble a{color:var(--t-accent-dark);font-weight:600}',
    '.tmph-bubble code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;background:rgba(127,127,127,.18);padding:1px 6px;border-radius:6px}',
    '.tmph-code{margin:6px 0 8px;border-radius:14px;overflow:hidden;background:var(--t-code)}',
    '.tmph-code-h{display:flex;justify-content:space-between;align-items:center;padding:6px 8px 6px 12px;font-size:11px;font-weight:700;color:#9aa0ac;text-transform:uppercase;letter-spacing:.05em;background:rgba(255,255,255,.06)}',
    '.tmph-code-h button{border:none;background:rgba(255,255,255,.1);color:#e8eaee;border-radius:8px;padding:3px 9px;font-size:11px;font-weight:700}',
    '.tmph-code-h button:hover{background:rgba(255,255,255,.2)}',
    '.tmph-code pre{margin:0;padding:10px 12px;overflow-x:auto;color:var(--t-code-ink)}',
    '.tmph-code pre code{background:none;padding:0;color:inherit;font-size:12.5px}',
    '.tmph-tblwrap{overflow-x:auto;margin:6px 0 8px;border-radius:12px;border:1px solid var(--t-line)}',
    '.tmph-bubble table{border-collapse:collapse;width:100%;font-size:13px;background:var(--t-bg)}',
    '.tmph-bubble th,.tmph-bubble td{padding:7px 10px;text-align:left;border-bottom:1px solid var(--t-line);white-space:nowrap}',
    '.tmph-bubble th{font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:var(--t-muted)}',
    '.tmph-bubble tr:last-child td{border-bottom:none}',
    '.tmph-copy{margin:5px 0 0 6px;display:inline-flex;align-items:center;gap:5px;border:none;background:none;padding:3px 6px;border-radius:8px;font-size:12px;font-weight:700;color:var(--t-muted)}',
    '.tmph-copy:hover{background:var(--t-soft);color:var(--t-ink)}',
    '.tmph-copy svg{width:13px;height:13px;stroke:currentColor;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
    '.tmph-copy.tmph-done{color:var(--t-ok)}',
    '.tmph-typing{display:inline-flex;gap:5px;padding:4px 2px}',
    '.tmph-typing i{width:7px;height:7px;border-radius:50%;background:var(--t-muted);animation:tmphDot 1.1s infinite ease-in-out}',
    '.tmph-typing i:nth-child(2){animation-delay:.16s}.tmph-typing i:nth-child(3){animation-delay:.32s}',
    '@keyframes tmphDot{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-4px)}}',
    '.tmph-caret::after{content:"";display:inline-block;width:7px;height:14px;margin-left:2px;vertical-align:-2px;background:var(--t-accent);border-radius:2px;animation:tmphBlink .9s steps(2) infinite}',
    '@keyframes tmphBlink{50%{opacity:0}}',
    '.tmph-empty{margin:auto 0;text-align:center;padding:10px 14px 18px}',
    '.tmph-empty .tmph-avatar{width:56px;height:56px;border-radius:18px;margin:0 auto 12px}',
    '.tmph-empty .tmph-avatar svg{width:28px;height:28px}',
    '.tmph-empty h3{margin:0 0 4px;font-size:19px;font-weight:800;letter-spacing:-.01em}',
    '.tmph-empty p{margin:0;color:var(--t-muted)}',
    '.tmph-foot{padding:10px 14px 12px;border-top:1px solid var(--t-line);flex:none}',
    '.tmph-box{display:flex;align-items:flex-end;gap:8px;background:var(--t-soft);border-radius:22px;padding:6px 6px 6px 16px;border:1.5px solid transparent;transition:border-color .15s}',
    '.tmph-box:focus-within{border-color:var(--t-accent)}',
    '.tmph-box textarea{flex:1;border:none;outline:none;resize:none;background:transparent;font:inherit;color:inherit;max-height:130px;min-height:24px;padding:8px 0;line-height:1.45;box-shadow:none;border-radius:0;width:auto}',
    '.tmph-box textarea::placeholder{color:var(--t-muted)}',
    '.tmph-send,.tmph-stop{width:40px;height:40px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;flex:none;padding:0}',
    '.tmph-send{background:var(--t-accent);color:#fff}.tmph-send:hover{background:var(--t-accent-dark)}',
    '.tmph-send:disabled{opacity:.4;cursor:not-allowed}',
    '.tmph-stop{background:var(--t-ink);color:var(--t-bg);display:none}',
    '.tmph-stop i{width:13px;height:13px;border-radius:3px;background:currentColor;display:block}',
    '.tmph-send svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
    '.tmph-root.tmph-busy .tmph-send{display:none}.tmph-root.tmph-busy .tmph-stop{display:flex}',
    '.tmph-hint{margin:7px 6px 0;font-size:11px;color:var(--t-muted);text-align:center}',
    '@media (max-width:640px){',
    '.tmph-fab{right:14px;bottom:calc(14px + env(safe-area-inset-bottom));height:50px}',
    '.tmph-panel{inset:0;width:100%;border-radius:0;height:100dvh}',
    '.tmph-foot{padding-bottom:calc(12px + env(safe-area-inset-bottom))}',
    '.tmph-hbtn span{display:none}.tmph-hbtn{padding:0;width:34px;justify-content:center}}',
    '@media print{.tmph-root{display:none !important}}',
    '@media (prefers-reduced-motion:reduce){.tmph-panel.tmph-on,.tmph-fab{animation:none;transition:none}.tmph-typing i,.tmph-caret::after{animation:none}}'
  ].join('\n');

  /* ------------------------------------------------------------------ tiny, safe Markdown renderer (escapes HTML first) */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function inline(t) {
    t = esc(t);
    t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
    t = t.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
    t = t.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>');
    t = t.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!?]|$)/g, '$1<i>$2</i>');
    t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');   // http(s) links only
    return t;
  }
  function md(src) {
    var blocks = [];
    var s = String(src).replace(/```(\w*)\n([\s\S]*?)```/g, function (m, l, c) { blocks.push([l, c]); return '\u0000' + (blocks.length - 1) + '\u0000'; });
    s = s.replace(/```(\w*)\n([\s\S]*)$/, function (m, l, c) { blocks.push([l, c]); return '\u0000' + (blocks.length - 1) + '\u0000'; });   // code block still streaming
    var L = s.split('\n'), out = [], i = 0, m;
    function special(x) { return /^\u0000\d+\u0000$/.test(x) || /^#{1,3}\s/.test(x) || /^\s*([-*]|\d+\.)\s+/.test(x) || /^\|.*\|\s*$/.test(x); }
    while (i < L.length) {
      var ln = L[i];
      if ((m = ln.match(/^\u0000(\d+)\u0000$/))) {
        var b = blocks[+m[1]];
        out.push('<div class="tmph-code"><div class="tmph-code-h"><span>' + esc(b[0] || 'code') + '</span><button type="button" data-codecopy>Copy</button></div><pre><code>' + esc(b[1].replace(/\n$/, '')) + '</code></pre></div>'); i++;
      } else if (/^#{1,3}\s/.test(ln)) { out.push('<h4>' + inline(ln.replace(/^#{1,3}\s+/, '')) + '</h4>'); i++; }
      else if (/^\|.*\|\s*$/.test(ln) && i + 1 < L.length && /^\|?\s*:?-{2,}/.test(L[i + 1])) {
        var rows = []; while (i < L.length && /^\|.*\|\s*$/.test(L[i])) { rows.push(L[i]); i++; }
        var cells = function (r) { return r.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); }); };
        var head = cells(rows[0]), body = rows.slice(2).map(cells);
        out.push('<div class="tmph-tblwrap"><table><thead><tr>' + head.map(function (h) { return '<th>' + inline(h) + '</th>'; }).join('') + '</tr></thead><tbody>' +
          body.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>');
      } else if (/^\s*([-*]|\d+\.)\s+/.test(ln)) {
        var ord = /^\s*\d+\./.test(ln), items = [];
        while (i < L.length && /^\s*([-*]|\d+\.)\s+/.test(L[i])) { items.push(L[i].replace(/^\s*([-*]|\d+\.)\s+/, '')); i++; }
        out.push((ord ? '<ol>' : '<ul>') + items.map(function (x) { return '<li>' + inline(x) + '</li>'; }).join('') + (ord ? '</ol>' : '</ul>'));
      } else if (!ln.trim()) { i++; }
      else { var p = []; while (i < L.length && L[i].trim() && !special(L[i])) { p.push(inline(L[i])); i++; } if (!p.length) { p.push(inline(L[i])); i++; } out.push('<p>' + p.join('<br>') + '</p>'); }
    }
    return out.join('');
  }

  /* ------------------------------------------------------------------ the panel */
  var STAR = '<svg viewBox="0 0 24 24"><path d="M12 2l2.2 6.3L20.5 10.5l-6.3 2.2L12 19l-2.2-6.3L3.5 10.5l6.3-2.2L12 2zM19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9L19 15z"/></svg>';
  var COPY_SVG = '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>';

  function build(cfg) {
    var style = document.createElement('style'); style.id = 'tmph-style'; style.textContent = CSS; document.head.appendChild(style);
    var root = document.createElement('div'); root.className = 'tmph-root'; root.id = 'tmph';
    root.innerHTML =
      '<button class="tmph-fab" id="tmphFab" type="button" aria-label="Open TMPH assistant"><span class="tmph-fab-ic">' + STAR + '</span>TMPH</button>' +
      '<aside class="tmph-panel" id="tmphPanel" role="dialog" aria-label="TMPH assistant">' +
        '<header class="tmph-head"><div class="tmph-avatar">' + STAR + '</div>' +
          '<div class="tmph-title"><b>TMPH</b><span>Personal AI assistant</span></div>' +
          '<button class="tmph-hbtn" id="tmphClear" type="button" title="Clear chat"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/></svg><span>Clear chat</span></button>' +
          '<button class="tmph-hbtn tmph-x" id="tmphClose" type="button" data-dp="x" aria-label="Close"><svg viewBox="0 0 24 24" style="width:16px;height:16px"><path d="M6 6l12 12M18 6L6 18"/></svg></button>' +
        '</header>' +
        '<div class="tmph-chat" id="tmphChat" aria-live="polite"></div>' +
        '<footer class="tmph-foot"><div class="tmph-box">' +
          '<textarea id="tmphInput" rows="1" maxlength="' + cfg.max + '" placeholder="Ask TMPH anything…"></textarea>' +
          '<button class="tmph-send" id="tmphSend" type="button" aria-label="Send"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' +
          '<button class="tmph-stop" id="tmphStop" type="button" aria-label="Stop"><i></i></button>' +
        '</div><div class="tmph-hint">Enter = send · Shift+Enter = new line · Esc = close</div></footer>' +
      '</aside>';
    document.body.appendChild(root);

    var chat = root.querySelector('#tmphChat'), input = root.querySelector('#tmphInput'), fab = root.querySelector('#tmphFab');
    var msgs = [], stickBottom = true, streaming = false, ctrl = null;

    /* ---------- saved chat ---------- */
    try { msgs = JSON.parse(localStorage.getItem(CHAT_KEY) || '[]') || []; } catch (e) { msgs = []; }
    if (!Array.isArray(msgs)) msgs = [];
    msgs = msgs.filter(function (m) { return m && (m.role === 'user' || m.role === 'ai') && typeof m.text === 'string'; });
    function save() {
      try { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.filter(function (m) { return !m.err; }).slice(-40))); } catch (e) {}
    }

    /* ---------- drawing ---------- */
    function msgEl(m, idx) {
      var d = document.createElement('div');
      d.className = 'tmph-msg ' + (m.role === 'user' ? 'tmph-u' : 'tmph-a') + (m.err ? ' tmph-err' : ''); d.dataset.i = idx;
      if (m.role === 'user') {
        d.innerHTML = '<div class="tmph-who">You</div><div class="tmph-bubble"></div>';
        d.querySelector('.tmph-bubble').textContent = m.text;
      } else if (m.err) {
        d.innerHTML = '<div class="tmph-who">TMPH</div><div class="tmph-bubble"></div>';
        d.querySelector('.tmph-bubble').textContent = m.text;
      } else {
        d.innerHTML = '<div class="tmph-who">TMPH</div><div class="tmph-bubble">' + md(m.text) + '</div><button class="tmph-copy" type="button" data-copy>' + COPY_SVG + 'Copy</button>';
      }
      return d;
    }
    function toBottom(force) { if (force || stickBottom) chat.scrollTop = chat.scrollHeight; }
    chat.addEventListener('scroll', function () { stickBottom = chat.scrollHeight - chat.scrollTop - chat.clientHeight < 60; });
    function renderAll() {
      chat.innerHTML = '';
      if (!msgs.length) {
        chat.insertAdjacentHTML('beforeend',
          '<div class="tmph-empty"><div class="tmph-avatar">' + STAR + '</div><h3>Hi, I\'m TMPH</h3>' +
          '<p>Ask me in Gujarati, Hindi, English or Hinglish.</p></div>');
      } else msgs.forEach(function (m, i) { chat.appendChild(msgEl(m, i)); });
      toBottom(true);
    }

    /* ---------- open / close ---------- */
    function isDark() {
      var h = document.documentElement, b = document.body;
      return h.getAttribute('data-theme') === 'dark' || h.classList.contains('dark') || b.classList.contains('dark') || b.classList.contains('dark-mode');
    }
    function syncTheme() { root.classList.toggle('tmph-dark', isDark()); }
    var panel = root.querySelector('#tmphPanel');
    function open() { syncTheme(); root.classList.add('tmph-open'); panel.classList.add('tmph-on'); setTimeout(function () { input.focus(); }, 60); }
    function close() { root.classList.remove('tmph-open'); panel.classList.remove('tmph-on'); try { fab.focus({ preventScroll: true }); } catch (e) {} }
    fab.onclick = open;
    root.querySelector('#tmphClose').onclick = close;
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('tmph-open')) close(); });
    try { new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] }); } catch (e) {}

    /* ---------- sending ---------- */
    function setBusy(b) { streaming = b; root.classList.toggle('tmph-busy', b); }
    function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 130) + 'px'; }

    function addError(text) {
      msgs.push({ role: 'ai', text: text, err: true });
      chat.appendChild(msgEl(msgs[msgs.length - 1], msgs.length - 1)); toBottom(true);
    }

    function send(text) {
      text = (text || '').trim();
      if (!text || streaming) return;
      if (text.length > cfg.max) { addError('Your message is too long (maximum ' + cfg.max + ' characters).'); return; }
      msgs = msgs.filter(function (m) { return !m.err; });        // an earlier error bubble is not part of the chat
      msgs.push({ role: 'user', text: text }); input.value = ''; autosize();
      var payload = msgs.map(function (m) { return { role: m.role, text: m.text }; });
      save(); renderAll();                                         // draws the chat up to the new question…
      var ai = { role: 'ai', text: '' }; msgs.push(ai);            // …then the empty reply bubble is added on its own
      var el = msgEl(ai, msgs.length - 1), bub = el.querySelector('.tmph-bubble'), cp = el.querySelector('.tmph-copy');
      chat.appendChild(el); cp.style.display = 'none';
      bub.innerHTML = '<span class="tmph-typing"><i></i><i></i><i></i></span>'; toBottom(true); setBusy(true);

      var raf = 0;
      function paint(live) {
        // the caret is a private marker inside the text, so it sits at the end of the last line
        bub.innerHTML = live ? md(ai.text + '█').replace('█', '<span class="tmph-caret"></span>') : md(ai.text);
        toBottom();
      }
      function schedule() { if (!raf) raf = requestAnimationFrame(function () { raf = 0; paint(true); }); }
      function finish(errText, stopped) {
        if (raf) { cancelAnimationFrame(raf); raf = 0; }
        if (ctrl !== mine) return;                                  // Clear chat was pressed meanwhile: this reply is no longer wanted
        setBusy(false); ctrl = null;
        if (!ai.text) {
          // nothing was written: drop the empty bubble and show the problem (stopping with no text just removes the bubble)
          var ix = msgs.indexOf(ai); if (ix > -1) msgs.splice(ix, 1);
          if (!stopped && errText) msgs.push({ role: 'ai', text: errText, err: true });
          save(); renderAll(); return;
        }
        paint(false); cp.style.display = '';
        if (errText) addError(errText);
        save();
      }

      var mine = ctrl = new AbortController();
      var gotAny = false, failText = '';
      fetch(API_BASE_URL + '?action=ai.chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.token() },
        body: JSON.stringify({ messages: payload, stream: cfg.stream }),
        signal: mine.signal, cache: 'no-store'
      }).then(function (res) {
        if (res.status === 401) { try { api.clearToken(); } catch (e) {} window.location.href = 'index.html'; throw new Error('Session expired'); }
        var ct = res.headers.get('content-type') || '';
        if (ct.indexOf('application/json') > -1) {            // a problem before Gemini was called, or a non-streamed reply
          return res.json().then(function (d) {
            if (d && d.reply) { ai.text = String(d.reply); gotAny = true; return; }
            failText = (d && d.error) || ('Server error (' + res.status + ').');
          });
        }
        if (!res.ok || !res.body) { failText = 'Server error (' + res.status + '). Please try again.'; return; }
        var reader = res.body.getReader(), dec = new TextDecoder('utf-8'), buf = '';
        function handle(ev) {
          ev.split('\n').forEach(function (ln) {
            if (ln.indexOf('data:') !== 0) return;
            var o; try { o = JSON.parse(ln.slice(5).trim()); } catch (e) { return; }
            if (o.t) { ai.text += o.t; gotAny = true; schedule(); }
            else if (o.error) failText = o.error;
          });
        }
        function pump() {
          return reader.read().then(function (r) {
            if (r.done) { if (buf.trim()) handle(buf); return; }
            buf += dec.decode(r.value, { stream: true }).replace(/\r\n/g, '\n');
            var p; while ((p = buf.indexOf('\n\n')) > -1) { handle(buf.slice(0, p)); buf = buf.slice(p + 2); }
            return pump();
          });
        }
        return pump();
      }).then(function () {
        if (!gotAny && !failText) failText = 'TMPH could not make an answer. Please try again.';
        finish(failText, false);
      }).catch(function (err) {
        if (err && err.name === 'AbortError') { finish('', true); return; }
        if (err && err.message === 'Session expired') return;
        finish('Could not reach the server. Please check your internet and try again.', false);
      });
    }

    root.querySelector('#tmphStop').onclick = function () { if (ctrl) ctrl.abort(); };
    root.querySelector('#tmphSend').onclick = function () { send(input.value); };
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); } });
    input.addEventListener('input', autosize);

    /* ---------- clear chat / copy ---------- */
    root.querySelector('#tmphClear').onclick = function () { if (ctrl) { ctrl.abort(); ctrl = null; } msgs = []; save(); setBusy(false); renderAll(); };
    function copyText(t, btn) {
      var ok = function () { var o = btn.innerHTML; btn.classList.add('tmph-done'); btn.textContent = 'Copied ✓'; setTimeout(function () { btn.classList.remove('tmph-done'); btn.innerHTML = o; }, 1400); };
      function fb() { var a = document.createElement('textarea'); a.value = t; a.style.position = 'fixed'; a.style.opacity = '0'; document.body.appendChild(a); a.select(); try { document.execCommand('copy'); ok(); } catch (e) {} a.remove(); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(t).then(ok, fb); else fb();
    }
    chat.addEventListener('click', function (e) {
      var c = e.target.closest('[data-copy]'), k = e.target.closest('[data-codecopy]');
      if (c) { var m = msgs[+c.closest('.tmph-msg').dataset.i]; if (m) copyText(m.text, c); }
      else if (k) copyText(k.closest('.tmph-code').querySelector('code').textContent, k);
    });

    renderAll();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
