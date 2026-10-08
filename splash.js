/**
 * TM·PH opening splash — "comet chain + name".
 *
 * A comet of orange dots orbits, glides into the centre, the TM·PH logo lands
 * and "TM Perfume House" draws in under it, then the splash lifts and the
 * page underneath is revealed. ~3.6 s, once per browser session (so: once
 * each time the app is opened, not on every page). Tap / click / any key
 * skips it. Skipped entirely for people who turned on "reduce motion".
 *
 * Loaded by index.html (login page) and by assets/js/layout.js (every page
 * after login), so it plays on whichever page the app opens on. The logo file
 * is assets/img/tmph-logo.png. Change the brand line with BRAND below.
 */
(function () {
  'use strict';
  if (window.__hrmsSplash) return;
  window.__hrmsSplash = true;

  var BRAND = 'TM Perfume House';
  var KEY = 'hrms_splash_done';
  var TOTAL_MS = 3600;

  try { if (sessionStorage.getItem(KEY)) return; } catch (e) { /* private mode: fall through */ }
  try { if (window.top !== window.self) return; } catch (e) { return; }   // never inside an iframe

  function markDone() { try { sessionStorage.setItem(KEY, '1'); } catch (e) { /* ignore */ } }
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { markDone(); return; }

  var cs = document.currentScript;
  var base = (cs && cs.src) ? cs.src.replace(/js\/splash\.js.*$/, '') : 'assets/';
  var logoUrl = base + 'img/tmph-logo.png';
  try { var pre = new Image(); pre.src = logoUrl; } catch (e) { /* ignore */ }

  // Dots of the comet: size (px at a 150px logo), fade
  var SIZES = [16, 14, 12, 10, 8, 6];
  var dots = '';
  for (var k = 0; k < SIZES.length; k++) {
    dots += '<u style="--a:' + (-k * 15) + 'deg;--s:calc(var(--L)*' + (SIZES[k] / 150).toFixed(4) + ');--o:' + (1 - k * 0.13).toFixed(2) + '"></u>';
  }

  var css =
    '#hrmsSplash{position:fixed;inset:0;z-index:2147483000;background:#faf1e2;display:flex;align-items:center;justify-content:center;' +
      '-webkit-tap-highlight-color:transparent;cursor:pointer;animation:hsSp ' + TOTAL_MS + 'ms linear both;' +
      '--O:cubic-bezier(.22,1,.36,1);--I:cubic-bezier(.65,0,.35,1)}' +
    '#hrmsSplash.hs-skip{animation:hsSkip .28s ease-out both}' +
    '#hrmsSplash .hs-stack{display:flex;flex-direction:column;align-items:center;--L:clamp(110px,38vmin,190px);gap:calc(var(--L)*.16)}' +
    '#hrmsSplash .hs-lg{position:relative;width:var(--L);height:var(--L);--R:calc(var(--L)*.56)}' +
    '#hrmsSplash .hs-logo{position:absolute;inset:0;background:url("' + logoUrl + '") center/contain no-repeat;opacity:0;animation:hsKl ' + TOTAL_MS + 'ms linear both;will-change:transform,opacity}' +
    '#hrmsSplash .hs-ow{position:absolute;inset:0;animation:hsKo ' + TOTAL_MS + 'ms linear both;will-change:transform}' +
    '#hrmsSplash .hs-ow u{position:absolute;left:50%;top:50%;width:var(--s);height:var(--s);margin:calc(var(--s)/-2);border-radius:50%;background:#ff7a2f;opacity:0;' +
      'text-decoration:none;display:block;animation:hsKd ' + TOTAL_MS + 'ms linear both;will-change:transform,opacity}' +
    '#hrmsSplash .hs-nm{display:flex;flex-direction:column;align-items:center;gap:calc(var(--L)*.07)}' +
    '#hrmsSplash .hs-ln{width:calc(var(--L)*.6);height:2px;border-radius:2px;background:#ff7a2f;transform:scaleX(0);animation:hsKln ' + TOTAL_MS + 'ms linear both}' +
    '#hrmsSplash .hs-nm b{font:700 calc(var(--L)*.074)/1 "Inter","Segoe UI",Arial,sans-serif;letter-spacing:.26em;text-transform:uppercase;color:#7a6f60;opacity:0;white-space:nowrap;padding-left:.26em;animation:hsKn ' + TOTAL_MS + 'ms linear both}' +
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

  var styleEl = document.createElement('style');
  styleEl.id = 'hrmsSplashCss';
  styleEl.textContent = css;

  var el = document.createElement('div');
  el.id = 'hrmsSplash';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<div class="hs-stack">' +
      '<div class="hs-lg"><div class="hs-ow">' + dots + '</div><div class="hs-logo"></div></div>' +
      '<div class="hs-nm"><span class="hs-ln"></span><b></b></div>' +
    '</div>';
  el.querySelector('b').textContent = BRAND;

  var root = document.documentElement;
  var prevOverflow = root.style.overflow;
  root.style.overflow = 'hidden';
  (document.head || root).appendChild(styleEl);
  root.appendChild(el);

  var finished = false;
  function finish() {
    if (finished) return;
    finished = true;
    clearTimeout(fallback);
    document.removeEventListener('keydown', skip, true);
    if (el.parentNode) el.parentNode.removeChild(el);
    if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
    root.style.overflow = prevOverflow;
    markDone();
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
  var fallback = setTimeout(finish, TOTAL_MS + 800);   // in case the tab was in the background and animationend never fired
})();