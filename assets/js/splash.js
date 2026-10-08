/**
 * TM·PH opening splash — "comet chain + name".
 *
 * A comet of orange dots orbits, glides into the centre, the TM·PH logo lands
 * and "TM Perfume House" draws in under it, then the splash lifts and the
 * page underneath is revealed (~3.6 s). Tap / click / any key skips it.
 *
 * WHEN IT PLAYS ("every time the app is opened"):
 *   - the first page of a new tab / newly launched app (the browser session is new), and
 *   - when you come back to the app after it sat in the background for 10+ minutes.
 *   It does NOT replay on every page you click through inside the app.
 *   To see it on demand (testing): add ?splash=1 to the address, e.g. index.html?splash=1
 *
 * If the device has "reduce motion" / "animation effects off" turned on, a calm
 * version plays instead (logo + name fade in and out, nothing moves).
 *
 * Loaded by index.html (login page) and by assets/js/layout.js (every page after
 * login). The logo file is assets/img/tmph-logo.png. Change the brand line with BRAND.
 */
(function () {
  'use strict';
  if (window.__hrmsSplashInit) return;
  window.__hrmsSplashInit = true;
  if (window.__hsGo) return;   // index.html is bouncing a signed-in user to the home page; the splash plays there

  var BRAND = 'TM Perfume House';
  var FLAG = 'hrms_splash_done';          // sessionStorage: already played in this tab / app launch
  var SEEN = 'hrms_splash_seen';          // localStorage: last time the app was on screen
  var IDLE_MS = 10 * 60 * 1000;           // away longer than this => play again on return
  var FULL_MS = 3600;                     // full animation
  var CALM_MS = 1800;                     // reduced-motion version

  try { if (window.top !== window.self) return; } catch (e) { return; }   // never inside an iframe

  var cs = document.currentScript;
  var base = (cs && cs.src) ? cs.src.replace(/js\/splash\.js.*$/, '') : 'assets/';
  var logoUrl = base + 'img/tmph-logo.png';
  try { var pre = new Image(); pre.src = logoUrl; } catch (e) { /* ignore */ }

  function now() { return Date.now(); }
  function getSeen() { try { return parseInt(localStorage.getItem(SEEN) || '0', 10) || 0; } catch (e) { return 0; } }
  function touch() { try { localStorage.setItem(SEEN, String(now())); } catch (e) { /* ignore */ } }
  function flagged() { try { return !!sessionStorage.getItem(FLAG); } catch (e) { return null; } }   // null = storage blocked
  function setFlag() { try { sessionStorage.setItem(FLAG, '1'); } catch (e) { /* ignore */ } }
  function reduced() { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }

  function shouldShow(force) {
    if (force) return true;
    var f = flagged();
    var t = getSeen();
    if (f === false) return true;                 // new tab / app launch
    return !t || (now() - t > IDLE_MS);           // came back after a long absence (or storage blocked)
  }

  // ---- markup / css -------------------------------------------------------
  var SIZES = [16, 14, 12, 10, 8, 6];             // comet dots, px at a 150px logo
  var dots = '';
  for (var k = 0; k < SIZES.length; k++) {
    dots += '<u style="--a:' + (-k * 15) + 'deg;--s:calc(var(--L)*' + (SIZES[k] / 150).toFixed(4) + ');--o:' + (1 - k * 0.13).toFixed(2) + '"></u>';
  }

  var css =
    '#hrmsSplash{position:fixed;inset:0;z-index:2147483000;background:#faf1e2;display:flex;align-items:center;justify-content:center;' +
      '-webkit-tap-highlight-color:transparent;cursor:pointer;animation:hsSp var(--T) linear both;' +
      '--O:cubic-bezier(.22,1,.36,1);--I:cubic-bezier(.65,0,.35,1)}' +
    '#hrmsSplash.hs-skip{animation:hsSkip .28s ease-out both}' +
    '#hrmsSplash .hs-stack{display:flex;flex-direction:column;align-items:center;--L:clamp(110px,38vmin,190px);gap:calc(var(--L)*.16)}' +
    '#hrmsSplash .hs-lg{position:relative;width:var(--L);height:var(--L);--R:calc(var(--L)*.56)}' +
    '#hrmsSplash .hs-logo{position:absolute;inset:0;background:url("' + logoUrl + '") center/contain no-repeat;opacity:0;animation:hsKl var(--T) linear both;will-change:transform,opacity}' +
    '#hrmsSplash .hs-ow{position:absolute;inset:0;animation:hsKo var(--T) linear both;will-change:transform}' +
    '#hrmsSplash .hs-ow u{position:absolute;left:50%;top:50%;width:var(--s);height:var(--s);margin:calc(var(--s)/-2);border-radius:50%;background:#ff7a2f;opacity:0;' +
      'text-decoration:none;display:block;animation:hsKd var(--T) linear both;will-change:transform,opacity}' +
    '#hrmsSplash .hs-nm{display:flex;flex-direction:column;align-items:center;gap:calc(var(--L)*.07)}' +
    '#hrmsSplash .hs-ln{width:calc(var(--L)*.6);height:2px;border-radius:2px;background:#ff7a2f;transform:scaleX(0);animation:hsKln var(--T) linear both}' +
    '#hrmsSplash .hs-nm b{font:700 calc(var(--L)*.074)/1 "Inter","Segoe UI",Arial,sans-serif;letter-spacing:.26em;text-transform:uppercase;color:#7a6f60;opacity:0;white-space:nowrap;padding-left:.26em;animation:hsKn var(--T) linear both}' +
    /* calm version (reduce motion): nothing moves, only fades */
    '#hrmsSplash.hs-calm .hs-ow{display:none}' +
    '#hrmsSplash.hs-calm .hs-logo{animation-name:hsCl}' +
    '#hrmsSplash.hs-calm .hs-nm b{animation-name:hsCl}' +
    '#hrmsSplash.hs-calm .hs-ln{transform:none;opacity:0;animation-name:hsCl}' +
    '@keyframes hsCl{0%{opacity:0}35%,100%{opacity:1}}' +
    '@keyframes hsKo{0%{transform:rotate(0);animation-timing-function:var(--I)}52%,100%{transform:rotate(720deg)}}' +
    '@keyframes hsKd{0%{transform:rotate(var(--a)) translateX(0) scale(0);opacity:0;animation-timing-function:var(--O)}' +
      '10%{transform:rotate(var(--a)) translateX(var(--R)) scale(1);opacity:var(--o);animation-timing-function:var(--I)}' +
      '28%{transform:rotate(var(--a)) translateX(var(--R)) scale(1);opacity:var(--o);animation-timing-function:var(--I)}' +
      '50%,100%{transform:rotate(var(--a)) translateX(0) scale(.3);opacity:0}}' +
    '@keyframes hsKl{0%,40%{opacity:0;transform:scale(.8);animation-timing-function:var(--O)}58%,100%{opacity:1;transform:none}}' +
    '@keyframes hsKn{0%,56%{opacity:0;transform:translateY(8px);animation-timing-function:var(--O)}72%,100%{opacity:1;transform:none}}' +
    '@keyframes hsKln{0%,54%{transform:scaleX(0);animation-timing-function:var(--O)}72%,100%{transform:scaleX(1)}}' +
    '@keyframes hsSp{0%,86%{opacity:1;transform:none;animation-timing-function:cubic-bezier(.65,0,.35,1)}100%{opacity:0;transform:scale(1.04)}}' +
    '@keyframes hsSkip{from{opacity:1}to{opacity:0}}';

  // ---- playing ------------------------------------------------------------
  var active = false;

  function play() {
    if (active) return;
    active = true;
    var calm = reduced();
    var total = calm ? CALM_MS : FULL_MS;
    var root = document.documentElement;

    var styleEl = document.createElement('style');
    styleEl.id = 'hrmsSplashCss';
    styleEl.textContent = css;

    var el = document.createElement('div');
    el.id = 'hrmsSplash';
    el.className = calm ? 'hs-calm' : '';
    el.style.setProperty('--T', total + 'ms');
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML =
      '<div class="hs-stack">' +
        '<div class="hs-lg"><div class="hs-ow">' + dots + '</div><div class="hs-logo"></div></div>' +
        '<div class="hs-nm"><span class="hs-ln"></span><b></b></div>' +
      '</div>';
    el.querySelector('b').textContent = BRAND;

    window.__hrmsSplashActive = true;   // index.html waits for this before redirecting, so the splash plays once, uninterrupted
    setFlag(); touch();                 // mark as played right away: no other page may start a second one

    var prevOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    (document.head || root).appendChild(styleEl);
    root.appendChild(el);

    var finished = false;
    var fallback;
    function finish() {
      if (finished) return;
      finished = true;
      clearTimeout(fallback);
      document.removeEventListener('keydown', skip, true);
      if (el.parentNode) el.parentNode.removeChild(el);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      root.style.overflow = prevOverflow;
      setFlag();
      touch();
      active = false;
      window.__hrmsSplashActive = false;
      try { document.dispatchEvent(new Event('hrms-splash-done')); } catch (e) { /* old browser */ }
    }
    function skip() {
      if (finished || el.classList.contains('hs-skip')) return;
      el.classList.add('hs-skip');
      setTimeout(finish, 320);
    }
    el.addEventListener('animationend', function (e) { if (e.animationName === 'hsSp' || e.animationName === 'hsSkip') finish(); });
    el.addEventListener('pointerdown', skip);
    el.addEventListener('click', skip);
    document.addEventListener('keydown', skip, true);
    fallback = setTimeout(finish, total + 800);   // tab was in the background and animationend never fired
  }

  // ---- when to play -------------------------------------------------------
  var forced = /[?&]splash=1(&|#|$)/.test(location.search);
  if (shouldShow(forced)) play();

  // remember when the app was last on screen, and replay after a long absence
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') { if (!active) touch(); return; }
    if (!active && shouldShow(false) && getSeen() && (now() - getSeen() > IDLE_MS)) play();
  });
  window.addEventListener('pagehide', function () { if (!active) touch(); });
})();