/**
 * Sales Home — the top of My Sales (the salesperson's landing page).
 *
 *   hero      one cheering headline for the moment (positive; "ting ting" nudge when behind; a 🎁 bonus hook when close to the target)
 *   missions  🎯 daily target (orders to go, +bonus % on every order)   🔑 code goal (70% of the day's orders with a code → ALL orders pay full)
 *   offer     the single orange ⚡ Limited Time Offer card (flash_offer.js mounts itself into #shOffer, see window.FO_MOUNT)
 *   price     💲 My price chart — shower gel / attar / perfume combos and the % each price earns (api: combo_price.get)
 *   allocate  a big bottom button (＋ Allocate order · N waiting) that opens Order Allocation as a bottom-sheet pop-up
 *             (order_allocation.html?embed=1 in an iframe — same page, same congratulations pop-up, no sidebar)
 *
 * The page (my_sales.html) feeds it: SalesHome.setCoach(my.coach response), SalesHome.setRating(score), and gives it
 * SalesHome.onRefresh = () => reload the coach / target after orders were allocated.
 * Needs: #shHero, #shQuests, #shOffer, #shPrice in the page, plus api.js. No other dependency.
 */
(function () {
  if (window.SalesHome) return;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rs = (v) => '₹' + Math.round(Number(v) || 0).toLocaleString('en-IN');
  const plural = (n, w) => n + ' ' + w + (Number(n) === 1 ? '' : 's');
  const reduce = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } },
  };

  const css = `
.sh-hero{position:relative; overflow:hidden; border-radius:22px; padding:18px 18px 16px; margin-bottom:14px; color:#fff; background:linear-gradient(135deg,#111827 0%,#1f2937 60%,#312e81 130%); box-shadow:0 12px 30px rgba(17,24,39,.22);}
.sh-hero.tone-win{background:linear-gradient(135deg,#065f46 0%,#047857 55%,#0f766e 130%);}
.sh-hero.tone-go{background:linear-gradient(135deg,#7c2d12 0%,#c2410c 55%,#db2777 140%);}
.sh-hero.tone-ting{background:linear-gradient(135deg,#78350f 0%,#b45309 60%,#9a3412 140%);}
.sh-hero::after{content:""; position:absolute; right:-40px; top:-50px; width:170px; height:170px; border-radius:50%; background:rgba(255,255,255,.07);}
.sh-top{display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; position:relative; z-index:1;}
.sh-hi{font-size:13px; font-weight:700; opacity:.85;}
.sh-chip{display:inline-flex; align-items:center; gap:6px; border-radius:99px; padding:5px 11px; font-size:12px; font-weight:800; text-decoration:none; color:#fff; background:rgba(255,255,255,.14); border:1px solid rgba(255,255,255,.25); white-space:nowrap;}
.sh-chip.warn{background:#f59e0b; border-color:#f59e0b; color:#451a03;} .sh-chip.ok{background:rgba(34,197,94,.22); border-color:rgba(134,239,172,.5);}
.sh-snd{border:0; background:rgba(255,255,255,.14); color:#fff; border-radius:99px; width:30px; height:30px; padding:0; min-height:0; cursor:pointer; font-size:14px; line-height:1;}
.sh-row{display:flex; align-items:center; gap:8px;}
.sh-emoji{font-size:38px; line-height:1; margin:10px 0 2px; display:inline-block; position:relative; z-index:1;}
.sh-head{font-size:21px; line-height:1.2; font-weight:900; margin:4px 0 4px; letter-spacing:-.01em; position:relative; z-index:1;}
.sh-sub{font-size:13.5px; line-height:1.45; opacity:.92; margin:0; position:relative; z-index:1;}
.sh-sub b{color:#fde68a;}
.sh-bar{position:relative; height:14px; border-radius:9px; background:rgba(255,255,255,.2); margin:16px 0 4px; z-index:1;}
.sh-bar i{position:absolute; left:0; top:0; bottom:0; border-radius:9px; background:linear-gradient(90deg,#fde68a,#fbbf24); transition:width .9s cubic-bezier(.2,.8,.2,1);}
.sh-bar u{position:absolute; top:-5px; bottom:-5px; width:3px; margin-left:-1px; background:#fff; border-radius:2px; text-decoration:none; opacity:.9;}
.sh-bar s{position:absolute; right:-2px; top:-22px; font-size:10.5px; font-weight:900; text-decoration:none; background:#fde68a; color:#78350f; border-radius:99px; padding:1px 7px;}
.sh-bl{display:flex; justify-content:space-between; gap:8px; font-size:11.5px; opacity:.9; position:relative; z-index:1;}
.sh-mini{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:14px; position:relative; z-index:1;}
.sh-mini div{background:rgba(255,255,255,.12); border-radius:12px; padding:8px 10px; font-size:11px; opacity:.98;}
.sh-mini b{display:block; font-size:16px; font-weight:900;}
.sh-quests{display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:14px;}
.sh-q{background:#fff; border:1px solid var(--line,#e5e7eb); border-radius:18px; padding:14px 14px 13px; min-width:0; position:relative; overflow:hidden;}
.sh-q.done{border-color:#86efac; background:linear-gradient(180deg,#f0fdf4,#fff);}
.sh-q.near{border-color:#fdba74; background:linear-gradient(180deg,#fff7ed,#fff); box-shadow:0 0 0 3px rgba(251,146,60,.14);}
.sh-qh{display:flex; align-items:center; gap:7px; font-size:12.5px; font-weight:800; color:#334155;}
.sh-qh em{margin-left:auto; font-style:normal; font-size:11px; font-weight:900; border-radius:99px; padding:2px 9px; background:#f1f5f9; color:#475569; white-space:nowrap;}
.sh-q.done .sh-qh em{background:#dcfce7; color:#166534;} .sh-q.near .sh-qh em{background:#ffedd5; color:#9a3412;}
.sh-qbig{font-size:19px; line-height:1.2; font-weight:900; margin:8px 0 8px; color:#0f172a;}
.sh-qbar{height:9px; border-radius:6px; background:#e2e8f0; overflow:hidden;} .sh-qbar i{display:block; height:100%; border-radius:6px; background:linear-gradient(90deg,#fb923c,#f97316); transition:width .9s cubic-bezier(.2,.8,.2,1);}
.sh-q.done .sh-qbar i{background:linear-gradient(90deg,#4ade80,#16a34a);}
.sh-segs{display:flex; gap:4px;} .sh-segs i{flex:1; height:9px; border-radius:5px; background:#e2e8f0; min-width:6px; transition:background .4s;} .sh-segs i.on{background:linear-gradient(90deg,#4ade80,#16a34a);}
.sh-qs{font-size:12px; color:#64748b; line-height:1.45; margin-top:8px;} .sh-qs b{color:#0f172a;}
.sh-qw{margin-top:8px; font-size:11.5px; line-height:1.4; color:#9a3412; background:#fff7ed; border:1px solid #fed7aa; border-radius:10px; padding:6px 9px;}
.sh-q.done .sh-qw{color:#166534; background:#f0fdf4; border-color:#bbf7d0;}
#shOffer{margin-bottom:0;}
#shOffer #foBanner{margin-bottom:14px;}
.sh-price{padding:14px 16px 12px; margin-bottom:14px; border-radius:18px;}
.sh-ph{display:flex; align-items:center; justify-content:space-between; gap:8px; flex-wrap:wrap;} .sh-ph h2{margin:0; font-size:15px;} .sh-ph span{font-size:11.5px; color:var(--muted,#64748b);}
.sh-chips{display:flex; gap:8px; overflow-x:auto; padding:10px 2px 6px; scrollbar-width:none; -webkit-overflow-scrolling:touch;} .sh-chips::-webkit-scrollbar{display:none;}
.sh-pc{flex:0 0 auto; min-width:132px; border-radius:14px; padding:9px 12px; background:#f8fafc; border:1px solid #e2e8f0;}
.sh-pc.hot{background:linear-gradient(135deg,#fff7ed,#ffedd5); border-color:#fdba74;}
.sh-pc small{display:block; font-size:11px; font-weight:800; color:#475569;} .sh-pc b{display:block; font-size:18px; font-weight:900; color:#0f172a; margin:1px 0;} .sh-pc span{font-size:11px; color:#64748b;} .sh-pc span u{text-decoration:none; font-weight:800; color:#16a34a;}
.sh-tw{overflow-x:auto; margin:6px -4px 0; -webkit-overflow-scrolling:touch;}
.sh-tbl{width:100%; border-collapse:separate; border-spacing:0; font-size:12.5px; min-width:430px;}
.sh-tbl th{font-size:10.5px; font-weight:900; text-align:right; padding:6px 8px; color:#fff; white-space:nowrap;}
.sh-tbl th:first-child{text-align:left; color:#64748b; background:#fff;}
.sh-tbl td{padding:7px 8px; text-align:right; border-top:1px solid #f1f5f9; white-space:nowrap; font-variant-numeric:tabular-nums;}
.sh-tbl td:first-child{text-align:left; font-weight:800; color:#0f172a; position:sticky; left:0; background:#fff; white-space:normal; min-width:112px;}
.sh-tbl tr.sep td{border-top:2px solid #e2e8f0;}
.sh-tbl tr.fair td{background:#fff7ed;} .sh-tbl tr.fair td:first-child{background:#fff7ed;}
.sh-more{display:block; width:100%; margin-top:6px; border:0; background:#f1f5f9; color:#334155; border-radius:11px; padding:8px; font-weight:800; font-size:12.5px; cursor:pointer; min-height:0;}
.sh-fn{font-size:11.5px; color:#64748b; line-height:1.5; margin-top:8px;} .sh-fn a{font-weight:800;}
/* the big bottom Allocate button */
.sh-ab{position:fixed; left:0; right:0; bottom:0; z-index:60; padding:10px 14px calc(10px + env(safe-area-inset-bottom)); background:linear-gradient(180deg,rgba(255,255,255,0),rgba(255,255,255,.92) 40%); pointer-events:none;}
.sh-ab button{pointer-events:auto; width:100%; max-width:720px; margin:0 auto; display:flex; align-items:center; justify-content:center; gap:10px; border:0; border-radius:18px; padding:15px 18px; min-height:56px; font-size:16px; font-weight:900; color:#fff; background:linear-gradient(135deg,#f97316,#ea580c); box-shadow:0 12px 28px rgba(234,88,12,.4); cursor:pointer;}
.sh-ab button .pl{font-size:22px; line-height:1;} .sh-ab button .ct{background:#fff; color:#c2410c; border-radius:99px; padding:3px 11px; font-size:13px; font-weight:900;}
.sh-ab button.zero{background:linear-gradient(135deg,#1f2937,#111827); box-shadow:0 10px 24px rgba(17,24,39,.3);} .sh-ab button.zero .ct{background:rgba(255,255,255,.16); color:#fff;}
@media (prefers-reduced-motion:no-preference){ .sh-ab button.hasw{animation:shPulse 2.4s ease-in-out infinite;} }
@keyframes shPulse{0%,100%{box-shadow:0 12px 28px rgba(234,88,12,.4);}50%{box-shadow:0 12px 36px rgba(234,88,12,.7), 0 0 0 7px rgba(249,115,22,.18);}}
body.sh-pad .content{padding-bottom:96px;}
/* the allocation pop-up */
.sh-sheet{position:fixed; inset:0; z-index:1000; display:none;} .sh-sheet.on{display:block;}
.sh-sheet .bd{position:absolute; inset:0; background:rgba(15,23,42,.55); opacity:0; transition:opacity .25s;} .sh-sheet.on .bd{opacity:1;}
.sh-sheet .pn{position:absolute; left:0; right:0; bottom:0; height:94vh; height:94dvh; background:#fff; border-radius:22px 22px 0 0; box-shadow:0 -20px 50px rgba(0,0,0,.3); display:flex; flex-direction:column; overflow:hidden; transform:translateY(100%); transition:transform .32s cubic-bezier(.2,.8,.2,1);}
.sh-sheet.on .pn{transform:translateY(0);}
.sh-sheet .hd{display:flex; align-items:center; gap:10px; padding:10px 14px 8px; border-bottom:1px solid #eef0f4; flex:none;}
.sh-sheet .hd::before{content:""; position:absolute; left:50%; top:6px; width:38px; height:4px; margin-left:-19px; border-radius:3px; background:#d1d5db;}
.sh-sheet .hd b{font-size:15px; margin-top:6px;} .sh-sheet .hd small{color:#64748b; font-size:12px; margin-top:6px;}
.sh-sheet .hd button{margin-left:auto; margin-top:6px; width:auto; min-height:0; border:0; background:#f1f5f9; color:#0f172a; border-radius:99px; padding:7px 14px; font-weight:800; font-size:13px; cursor:pointer;}
.sh-sheet iframe{flex:1; width:100%; border:0; background:#fff;}
@media (min-width:900px){
  .sh-sheet .pn{left:50%; right:auto; bottom:auto; top:50%; width:min(1180px,94vw); height:88vh; border-radius:22px; transform:translate(-50%,-46%); opacity:0; transition:transform .28s cubic-bezier(.2,.8,.2,1), opacity .2s;}
  .sh-sheet.on .pn{transform:translate(-50%,-50%); opacity:1;}
  .sh-ab{left:auto; right:26px; bottom:22px; padding:0; background:none;}
  .sh-ab button{width:auto; min-width:250px; max-width:none;}
  body.sh-pad .content{padding-bottom:40px;}
}
body.sh-lock{overflow:hidden;} body.sh-lock #menuToggle{display:none !important;}
/* ting-ting toast */
.sh-toast{position:fixed; left:50%; top:14px; z-index:1100; width:min(440px,calc(100vw - 24px)); transform:translate(-50%,-140%); transition:transform .45s cubic-bezier(.2,1.2,.3,1); border-radius:16px; padding:11px 14px; display:flex; gap:11px; align-items:flex-start; color:#fff; background:linear-gradient(135deg,#f59e0b,#ea580c); box-shadow:0 16px 36px rgba(0,0,0,.28); font-size:13px; line-height:1.4; cursor:pointer;}
.sh-toast.on{transform:translate(-50%,0);} .sh-toast b{display:block; font-size:14px;} .sh-toast .e{font-size:26px; line-height:1; display:inline-block;}
.sh-toast.good{background:linear-gradient(135deg,#16a34a,#0f766e);}
@media (prefers-reduced-motion:no-preference){ .sh-toast.on .e{animation:shRing .9s ease-in-out 2;} .sh-hero.tone-ting .sh-emoji{animation:shRing 1.6s ease-in-out infinite; transform-origin:50% 8%;} .sh-hero.tone-go .sh-emoji,.sh-hero.tone-win .sh-emoji{animation:shBounce 1.8s ease-in-out infinite;} }
@keyframes shRing{0%,100%{transform:rotate(0);}15%{transform:rotate(18deg);}30%{transform:rotate(-16deg);}45%{transform:rotate(12deg);}60%{transform:rotate(-8deg);}75%{transform:rotate(4deg);}}
@keyframes shBounce{0%,100%{transform:translateY(0) scale(1);}50%{transform:translateY(-6px) scale(1.08);}}
.sh-cf{position:fixed; inset:0; z-index:1150; pointer-events:none;}
@media (max-width:520px){
  .sh-quests{grid-template-columns:1fr;}
  .sh-head{font-size:19px;} .sh-hero{padding:16px 15px 14px; border-radius:20px;}
}

.sh-mis{display:grid; gap:12px; margin-bottom:14px;}
.sh-meet{background:linear-gradient(135deg,#7f1d1d,#b91c1c); color:#fff; border-radius:18px; padding:14px 16px; box-shadow:0 6px 18px rgba(185,28,28,.25);}
.sh-meet b{display:block; font-size:15px; margin-bottom:3px;} .sh-meet p{margin:0; font-size:13px; line-height:1.45; opacity:.95;}
.sh-ting{background:#fff7ed; border:1px solid #fed7aa; border-radius:16px; padding:11px 14px; display:flex; gap:10px; align-items:flex-start; font-size:13px; line-height:1.45; color:#7c2d12;}
.sh-ting .e{font-size:20px; line-height:1;} .sh-ting b{display:block; color:#431407; font-size:13.5px;}
.sh-ting.good{background:#f0fdf4; border-color:#bbf7d0; color:#14532d;} .sh-ting.good b{color:#052e16;}
.sh-mgrid{display:grid; grid-template-columns:repeat(auto-fit,minmax(240px,1fr)); gap:12px;}
.sh-steps{display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;} .sh-steps span{font-size:11.5px; font-weight:800; padding:3px 10px; border-radius:99px; background:#f1f5f9; color:#64748b;} .sh-steps span.on{background:#dcfce7; color:#166534;} .sh-steps span.nx{background:#ffedd5; color:#9a3412;}
.sh-mixb{display:flex; height:12px; border-radius:7px; overflow:hidden; background:#e2e8f0; margin-top:8px;} .sh-mixb i{display:block; height:100%;}
.sh-mixl{display:flex; gap:10px; flex-wrap:wrap; font-size:11px; color:#475569; margin-top:5px;} .sh-mixl u{display:inline-block; width:9px; height:9px; border-radius:3px; margin-right:4px; text-decoration:none;}
.sh-idea{background:linear-gradient(135deg,#eef2ff,#faf5ff); border:1px solid #c7d2fe; border-radius:18px; padding:14px 16px;}
.sh-idea h3{margin:0 0 4px; font-size:15.5px; color:#312e81;} .sh-idea p{margin:0 0 6px; font-size:13px; line-height:1.5; color:#1e1b4b;} .sh-idea small{display:block; color:#4338ca; font-size:11.5px; margin-bottom:8px;}
.sh-idea .bt{display:flex; gap:8px; flex-wrap:wrap;} .sh-idea button, .sh-pop button{border:0; border-radius:99px; padding:8px 14px; font-weight:800; font-size:13px; cursor:pointer; min-height:0; width:auto;}
.sh-idea .a{background:#4f46e5; color:#fff;} .sh-idea .b{background:#fff; color:#312e81; border:1px solid #c7d2fe;}
.sh-out{display:flex; gap:12px; align-items:center;} .sh-out .big{font-size:30px; font-weight:900; line-height:1; color:#0f172a;} .sh-out .big small{font-size:13px; color:#64748b; font-weight:700;}
.sh-ob{display:flex; align-items:center; gap:8px; font-size:11.5px; color:#475569; margin-top:5px;} .sh-ob span{width:78px; flex:none;} .sh-ob div{flex:1; height:7px; background:#e2e8f0; border-radius:5px; overflow:hidden;} .sh-ob i{display:block; height:100%; border-radius:5px; background:linear-gradient(90deg,#fbbf24,#22c55e);}
.sh-popbd{position:fixed; inset:0; z-index:10040; background:rgba(15,23,42,.55); display:flex; align-items:center; justify-content:center; padding:16px;}
.sh-pop{background:#fff; border-radius:22px; max-width:440px; width:100%; padding:20px 18px 16px; box-shadow:0 24px 60px rgba(0,0,0,.35);}
.sh-pop h3{margin:0 0 4px; font-size:18px;} .sh-pop p{margin:4px 0 10px; font-size:13.5px; line-height:1.5; color:#334155;}
.sh-pop .row{display:flex; justify-content:space-between; align-items:center; gap:8px; padding:8px 10px; border:1px solid #e2e8f0; border-radius:12px; margin-top:6px; font-size:13px;}
.sh-pop .row button{background:#16a34a; color:#fff; padding:6px 12px;}
.sh-pop .main{display:block; width:100%; background:#16a34a; color:#fff; margin-top:12px; padding:12px; border-radius:12px; font-size:15px;}
.sh-pop .later{display:block; width:100%; background:transparent; color:#64748b; margin-top:6px; border:1px solid #e2e8f0; border-radius:12px; padding:10px;}
@media (min-width:1100px){ .sh-quests{grid-template-columns:1fr 1fr;} }
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  const S = {
    coach: null, rating: null, punch: null, combo: null, canAlloc: false, waiting: null,
    open: false, dirty: false, frame: null, lastKey: '', lastNudge: 0, sound: store.get('sh_sound') !== '0', first: true, interacted: false,
  };
  window.addEventListener('pointerdown', () => { S.interacted = true; }, { once: true, passive: true });

  // ------------------------------------------------------------------ the moment: one cheer for right now
  // Never red, never "you failed": ahead = green, close = a 🎁 hook, behind = a friendly ⏰ "ting ting" with the exact next step.
  function mood(d) {
    const m = d.me || {}, G = d.goal || { mode: 'none' }, T = Number(m.target) || 0, bonus = Number(d.bonus) || 0, sales = Number(m.sales) || 0;
    const tk = Number(m.ticket) > 0 ? Number(m.ticket) : (Number((d.team || {}).avg_ticket) > 0 ? Number(d.team.avg_ticket) : 1500);
    const left = T > 0 ? Math.max(0, T - sales) : 0, away = T > 0 && left > 0 ? Math.max(1, Math.ceil(left / tk)) : 0;
    const first = String(m.name || '').trim().split(/\s+/)[0] || '';
    const bn = bonus > 0 ? '+' + bonus + '% extra' : 'the target bonus';
    const o = { T, left, away, bonus, sales, tk, first, key: '' };
    if (T > 0 && sales >= T) return Object.assign(o, { tone: 'win', emoji: '🏆', head: 'Target smashed! Every order is now worth more', sub: bonus > 0 ? `<b>${bn}</b> on every order you add today 🎁 — keep stacking!` : 'Keep stacking — every order counts 💪', key: 'win' });
    if (T > 0 && away > 0 && away <= 3 && G.mode !== 'newgoal')
      return Object.assign(o, { tone: 'go', emoji: '🎯', head: `Only ${plural(away, 'order')} to go!`, sub: `Add <b>${rs(left)}</b> more and unlock <b>${bn}</b> on EVERY order today 🎁 — you're so close!`, key: 'go' + away });
    if (G.mode === 'newgoal') return Object.assign(o, { tone: 'go', emoji: '🚀', head: `New goal today: ${rs(G.goal)}`, sub: `You're at <b>${rs(sales)}</b> — just <b>${rs(G.left)}</b> more and today beats your normal day 👍`, key: 'ng' });
    if (G.mode === 'catchup' || G.mode === 'near') {
      const n = G.orders || 1;
      return Object.assign(o, { tone: 'ting', emoji: '⏰', head: `Ting ting! ~${plural(n, 'order')} puts you back on track`, sub: `${rs(G.behind)} to catch up${m.best_hour >= 2 ? ` — your best hour today was <b>${m.best_hour} orders</b>, repeat it` : ''}. You've got this 💪`, key: 'ting' + n });
    }
    if (G.mode === 'ahead' && (Number(m.orders) || 0) > 0) {
      const tm = d.team || {};
      return Object.assign(o, { tone: 'win', emoji: '🔥', head: "You're ahead of time!", sub: tm.people > 1 ? `Only <b>${tm.ahead} of ${tm.people}</b> are ahead right now — and you're one of them` : 'Keep this pace and the bonus is yours 🎁', key: 'ahead' });
    }
    if ((Number(m.orders) || 0) === 0) return Object.assign(o, { tone: 'start', emoji: '🚀', head: 'Fresh day, fresh ₹!', sub: T > 0 ? `Your first order is the start of <b>${rs(T)}</b> today. Let's go!` : 'Your first order is waiting — let\'s go!', key: 'start' });
    return Object.assign(o, { tone: 'start', emoji: '💥', head: `${plural(m.orders, 'order')} in — keep stacking!`, sub: T > 0 ? `<b>${rs(left)}</b> to the target${bonus > 0 ? ' and <b>' + bn + '</b> on every order' : ''}` : 'Every order adds to your commission.', key: 'n' + m.orders });
  }

  // ------------------------------------------------------------------ hero + missions
  function punchChip() {
    const p = S.punch;
    if (!p) return '';
    const t = (x) => x ? new Date(String(x).replace(' ', 'T')).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    if (!p.punch_in) return '<a class="sh-chip warn" href="attendance.html">⏰ Not punched in · Punch in →</a>';
    if (p.punch_out) return '<a class="sh-chip" href="attendance.html">✓ Day done · ' + esc(t(p.punch_out)) + '</a>';
    return '<a class="sh-chip ok" href="attendance.html">🟢 In since ' + esc(t(p.punch_in)) + '</a>';
  }
  function countUp(el, to, fmt) {
    if (reduce || !el) { if (el) el.textContent = fmt(to); return; }
    const t0 = performance.now(), from = Number(el.dataset.v) || 0; el.dataset.v = to;
    const step = (tm) => { const k = Math.min(1, (tm - t0) / 800); el.textContent = fmt(from + (to - from) * k * (2 - k)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }

  function paint() {
    const d = S.coach; if (!d || !d.me) return;
    const m = d.me, md = mood(d);
    const hero = $('shHero');
    const sound = '<button type="button" class="sh-snd" id="shSnd" title="Ting sound on / off" aria-label="Ting sound">' + (S.sound ? '🔔' : '🔕') + '</button>';
    const should = m.should_pct != null ? Math.min(100, Number(m.should_pct)) : null;
    const pct = md.T > 0 ? Math.min(100, md.sales / md.T * 100) : 0;
    hero.className = 'sh-hero tone-' + md.tone; hero.style.display = '';
    hero.innerHTML = `
      <div class="sh-top"><div class="sh-hi">Hi ${esc(md.first || 'there')} 👋</div><div class="sh-row">${punchChip()}${sound}</div></div>
      <div class="sh-emoji">${md.emoji}</div>
      <h2 class="sh-head">${esc(md.head)}</h2>
      <p class="sh-sub">${md.sub}</p>
      ${md.T > 0 ? `<div class="sh-bar"><i style="width:${pct}%"></i>${should != null && md.tone !== 'win' ? `<u style="left:${should}%" title="Where you should be by now"></u>` : ''}${md.bonus > 0 ? `<s>🎁 +${md.bonus}%</s>` : ''}</div>
      <div class="sh-bl"><span><b>${rs(md.sales)}</b> of ${rs(md.T)}</span>${should != null && md.tone !== 'win' ? `<span>pace marker ▏= where you should be now</span>` : '<span></span>'}</div>` : ''}
      <div class="sh-mini"><div><b data-cu="${Number(m.orders) || 0}">${Number(m.orders) || 0}</b>Orders</div><div><b data-cu="${Number(m.com_today) || 0}" data-rs="1">${rs(m.com_today)}</b>Commission today</div><div><b>${S.rating != null ? Number(S.rating).toFixed(1) : '—'}</b>⭐ Rating</div></div>`;
    hero.querySelectorAll('[data-cu]').forEach((el) => countUp(el, Number(el.dataset.cu), el.dataset.rs ? rs : (v) => String(Math.round(v))));
    const sb = $('shSnd'); if (sb) sb.onclick = () => { S.sound = !S.sound; store.set('sh_sound', S.sound ? '1' : '0'); sb.textContent = S.sound ? '🔔' : '🔕'; if (S.sound) chime(); };

    // missions
    const q = [];
    if (md.T > 0) {
      const done = md.sales >= md.T, near = !done && md.away > 0 && md.away <= 3;
      q.push(`<div class="sh-q ${done ? 'done' : near ? 'near' : ''}"><div class="sh-qh"><span>🎯</span>Daily target<em>${done ? 'DONE ✅' : Math.round(pct) + '%'}</em></div>
        <div class="sh-qbig">${done ? 'Target done — bonus unlocked!' : plural(md.away, 'order') + ' to go'}</div>
        <div class="sh-qbar"><i style="width:${pct}%"></i></div>
        <div class="sh-qs">${rs(md.sales)} of <b>${rs(md.T)}</b>${done ? '' : ' · ' + rs(md.left) + ' left'}</div>
        ${md.bonus > 0 ? `<div class="sh-qw">${done ? `🎁 <b>+${md.bonus}%</b> extra on every order you add today` : `🎁 Finish it → <b>+${md.bonus}% extra on EVERY order</b> today${near ? ' — so close!' : ''}`}</div>` : ''}</div>`);
    }
    const pctC = Number(m.code_pct) || 0;
    if (pctC > 0) {
      const n = Number(m.orders) || 0, need = Number(m.code_need) || 0, have = Number(m.code) || 0, left = Number(m.code_left) || 0, ok = !!m.code_ok;
      const segs = need > 0 && need <= 16 ? `<div class="sh-segs">${Array.from({ length: need }, (_, i) => `<i class="${i < have ? 'on' : ''}"></i>`).join('')}</div>` : (need > 0 ? `<div class="sh-qbar"><i style="width:${Math.min(100, have / need * 100)}%"></i></div>` : `<div class="sh-segs"><i></i><i></i><i></i><i></i></div>`);
      const big = n === 0 ? 'Put a code on most orders' : ok ? 'Full commission on ALL orders!' : (left === 1 ? 'Just 1 code away!' : `Just ${left} codes away!`);
      const note = n === 0 ? `Add a code on <b>${Math.round(pctC)}%</b> of today's orders — then <b>every</b> order pays full, even the ones without a code.`
        : ok ? `<b>${have}</b> of ${plural(n, 'order')} have a code — the code goal is done 🎉`
        : `<b>${have}</b> of <b>${need}</b> codes done (${Math.round(pctC)}% of ${plural(n, 'order')}). Add a code to any <b>${plural(left, 'order')}</b>.`;
      const warn = !ok && n > 0 && left > 0 ? `<div class="sh-qw">${Number(m.code_lost) > 0 ? `💰 About <b>${rs(m.code_lost)}</b> more commission is yours once you get there` : '💰 Then every order pays full commission'}${Number(m.nocode) > 0 ? ` · ⚠ ${plural(m.nocode, 'order')} without a code` : ''}</div>` : (ok ? '<div class="sh-qw">✅ Nothing more to do here — new orders still count with or without a code today</div>' : '');
      q.push(`<div class="sh-q ${ok ? 'done' : left > 0 && left <= 2 && n > 0 ? 'near' : ''}"><div class="sh-qh"><span>🔑</span>Code goal<em>${n === 0 ? Math.round(pctC) + '% rule' : ok ? 'DONE ✅' : have + ' / ' + need}</em></div>
        <div class="sh-qbig">${big}</div>${segs}<div class="sh-qs">${note}</div>${warn}</div>`);
    }
    $('shQuests').innerHTML = q.join('');
    $('shQuests').style.display = q.length ? '' : 'none';

    // celebrate / nudge when the moment changes (once per change)
    const code = pctC > 0 ? (m.code_ok ? 'ok' : 'l' + (m.code_left || 0)) : '';
    const key = md.key + '|' + code;
    if (key !== S.lastKey) {
      const wasFirst = S.first; S.first = false;
      const prevKey = S.lastKey; S.lastKey = key;
      moment(md, m, wasFirst, prevKey);
    }
  }

  // ------------------------------------------------------------------ ting ting + confetti
  let AC = null;
  function chime() {
    if (!S.sound || !S.interacted) return;       // browsers only allow sound after a tap on the page
    try {
      AC = AC || new (window.AudioContext || window.webkitAudioContext)();
      [[880, 0], [1320, .16]].forEach(([f, t]) => {
        const o = AC.createOscillator(), g = AC.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(AC.destination);
        const t0 = AC.currentTime + t; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.18, t0 + .02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + .5);
        o.start(t0); o.stop(t0 + .55);
      });
    } catch (e) { /* sound is a bonus */ }
  }
  function toast(emoji, head, text, good) {
    const old = document.querySelector('.sh-toast'); if (old) old.remove();
    const t = document.createElement('div'); t.className = 'sh-toast' + (good ? ' good' : '');
    t.innerHTML = `<span class="e">${emoji}</span><div><b>${esc(head)}</b>${esc(text)}</div>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('on')));
    const gone = () => { t.classList.remove('on'); setTimeout(() => t.remove(), 500); };
    t.onclick = gone; setTimeout(gone, 7000);
  }
  function confetti() {
    if (reduce) return;
    const cv = document.createElement('canvas'); cv.className = 'sh-cf'; document.body.appendChild(cv);
    const dpr = window.devicePixelRatio || 1, W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr, ctx = cv.getContext('2d');
    const COL = ['#f97316', '#22c55e', '#3b82f6', '#ec4899', '#facc15', '#a855f7'];
    const P = Array.from({ length: 110 }, () => ({ x: Math.random() * W, y: -20 * dpr - Math.random() * H * .3, vx: (Math.random() - .5) * 4 * dpr, vy: (2 + Math.random() * 4) * dpr, s: (5 + Math.random() * 6) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .3, c: COL[Math.floor(Math.random() * COL.length)] }));
    let f = 0;
    (function loop() {
      ctx.clearRect(0, 0, W, H); f++;
      P.forEach((p) => { p.x += p.vx; p.y += p.vy; p.vy += .05 * dpr; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.globalAlpha = Math.max(0, 1 - f / 170); ctx.fillRect(-p.s / 2, -p.s / 3, p.s, p.s * .66); ctx.restore(); });
      if (f < 170) requestAnimationFrame(loop); else cv.remove();
    })();
  }
  function moment(md, m, wasFirst, prevKey) {
    const day = (S.coach && S.coach.business_day) || '';
    const now = Date.now();
    const celebrated = (k) => { const kk = 'sh_c_' + day + '_' + k; if (store.get(kk)) return true; store.set(kk, '1'); return false; };
    if (md.tone === 'win' && md.key === 'win' && !celebrated('target')) { confetti(); toast('🏆', 'Target smashed!', md.bonus > 0 ? `+${md.bonus}% extra on every order from now on 🎁` : 'Amazing work today!', true); chime(); return; }
    if (m.code_ok && Number(m.orders) > 0 && !celebrated('code')) { confetti(); toast('🔑', 'Code goal done!', 'Full commission on ALL your orders today 🎉', true); chime(); return; }
    if (now - S.lastNudge < 20 * 60 * 1000 && !wasFirst) return;          // a nudge is a nudge, not a nag: at most once every 20 min
    if (md.tone === 'ting') { S.lastNudge = now; setTimeout(() => { toast('⏰', 'Ting ting!', md.head.replace(/^Ting ting!\s*/, '') + ' — you can do it!'); chime(); }, wasFirst ? 1400 : 200); return; }
    if (md.tone === 'go') { S.lastNudge = now; setTimeout(() => { toast('🎁', md.head, `Finish the target and every order today earns ${md.bonus > 0 ? '+' + md.bonus + '% extra' : 'a bonus'}!`, true); chime(); }, wasFirst ? 1400 : 200); return; }
    const cl = Number(m.code_left) || 0;
    if (!m.code_ok && cl > 0 && cl <= 2 && Number(m.orders) > 0) { S.lastNudge = now; setTimeout(() => { toast('🔑', cl === 1 ? 'Just 1 code away!' : 'Just ' + cl + ' codes away!', 'Add a code to ' + (cl === 1 ? 'any 1 order' : 'any ' + cl + ' orders') + ' → FULL commission on all orders', true); chime(); }, wasFirst ? 1400 : 200); }
  }

  // ------------------------------------------------------------------ 💲 my price chart
  const TIER = ['7%', '6.5%', '6%', '5.5%', '2.8%'], TIERC = ['#15803d', '#16a34a', '#65a30d', '#d97706', '#b45309'];
  function paintPrice() {
    const box = $('shPrice'), c = S.combo;
    if (!c || !c.rows || !c.rows.length) { box.style.display = 'none'; return; }
    const rows = c.rows, inr = (v) => '₹' + Math.round(v).toLocaleString('en-IN');
    const label = (r) => r.name.replace(/ gel/g, ' shower gel').replace(/\bor attar\b/, '/ attar').replace(/\bshower gel or\b/, 'shower gel /');
    const pick = [[1, 0, 1], [2, 0, 2], [3, 0, 0], [2, 0, 0], [1, 1, 1]].map(([g, a, p]) => rows.find((r) => r.gel === g && r.attar === a && r.perf === p)).filter(Boolean);
    const chips = pick.map((r, i) => `<div class="sh-pc ${i < 2 ? 'hot' : ''}"><small>${esc(label(r))}</small><b>${inr(r.p[0])}</b><span>= <u>7%</u> · ${inr(r.p[2])} = <u>6%</u></span></div>`).join('');
    const shown = box.dataset.all === '1' ? rows : rows.slice(0, 6);
    const body = shown.map((r, i) => `<tr class="${i && r.group !== shown[i - 1].group ? 'sep' : ''} ${r.gel === 3 && !r.attar && !r.perf ? 'fair' : ''}"><td>${esc(label(r))}</td>${r.p.map((v) => `<td>${inr(v)}</td>`).join('')}</tr>`).join('');
    box.innerHTML = `<div class="sh-ph"><h2>💲 My price chart</h2><span>Sell at or above a price → earn that %</span></div>
      <div class="sh-chips">${chips}</div>
      <div class="sh-tw"><table class="sh-tbl"><thead><tr><th>Combo</th>${TIER.map((t, i) => `<th style="background:${TIERC[i]}">${t}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table></div>
      ${rows.length > 6 ? `<button type="button" class="sh-more" id="shMore">${box.dataset.all === '1' ? 'Show fewer ▴' : 'Show all ' + rows.length + ' combos ▾'}</button>` : ''}
      <div class="sh-fn">Shower gel and attar sell at the same prices. A price below the last column earns no commission. <a href="ml_price.html">ML size price check →</a></div>`;
    box.style.display = '';
    const mb = $('shMore'); if (mb) mb.onclick = () => { box.dataset.all = box.dataset.all === '1' ? '0' : '1'; paintPrice(); };
  }

  // ------------------------------------------------------------------ allocation pop-up
  function initAlloc() {
    if (!S.canAlloc || $('shAb')) return;
    document.body.classList.add('sh-pad');
    const ab = document.createElement('div'); ab.className = 'sh-ab'; ab.id = 'shAb';
    ab.innerHTML = '<button type="button" id="shAbBtn"><span class="pl">＋</span><span>Allocate order</span><span class="ct" id="shCt"></span></button>';
    document.body.appendChild(ab);
    const sheet = document.createElement('div'); sheet.className = 'sh-sheet'; sheet.id = 'shSheet';
    sheet.innerHTML = '<div class="bd"></div><div class="pn" role="dialog" aria-modal="true" aria-label="Allocate order"><div class="hd"><b>＋ Allocate order</b><small id="shSub"></small><button type="button" id="shX">✕ Close</button></div></div>';
    document.body.appendChild(sheet);
    const mkFrame = () => {
      if (S.frame) return S.frame;
      const f = document.createElement('iframe'); f.title = 'Order Allocation'; f.src = 'order_allocation.html?embed=1'; f.setAttribute('allow', 'camera; microphone; geolocation');
      sheet.querySelector('.pn').appendChild(f); S.frame = f; return f;
    };
    const doClose = () => {
      if (!S.open) return;
      S.open = false; sheet.classList.remove('on'); document.body.classList.remove('sh-lock');
      if (S.dirty) { S.dirty = false; if (window.SalesHome.onRefresh) window.SalesHome.onRefresh(); }
    };
    const open = () => {
      if (S.open) return;
      mkFrame(); S.open = true; sheet.classList.add('on'); document.body.classList.add('sh-lock');
      try { history.pushState({ shSheet: 1 }, '', location.href); } catch (e) { /* no history */ }
    };
    const close = () => { if (!S.open) return; if (history.state && history.state.shSheet) history.back(); else doClose(); };
    $('shAbBtn').onclick = open; $('shX').onclick = close; sheet.querySelector('.bd').onclick = close;
    window.addEventListener('popstate', () => { if (S.open) doClose(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && S.open) close(); });
    S.openSheet = open; S.closeSheet = close;
    paintCount();
    // Load the allocation page quietly in the background so the pop-up opens instantly and the "N waiting" count is live.
    setTimeout(mkFrame, 1800);
    setInterval(() => { if (!document.hidden && !S.open && S.frame && S.frame.contentWindow) S.frame.contentWindow.postMessage({ hrms: 'alloc-reload' }, location.origin); }, 120000);
    window.addEventListener('message', (e) => {
      if (e.origin !== location.origin || !S.frame || e.source !== S.frame.contentWindow || !e.data || e.data.hrms !== 'alloc') return;
      if (e.data.t === 'count') { S.waiting = Number(e.data.n) || 0; paintCount(); }
      else if (e.data.t === 'allocated') { S.dirty = true; if (S.waiting > 0) { S.waiting--; paintCount(); } }
      else if (e.data.t === 'home') close();
    });
  }
  function paintCount() {
    const btn = $('shAbBtn'), ct = $('shCt'), sub = $('shSub'); if (!btn) return;
    const n = S.waiting;
    btn.classList.toggle('hasw', n > 0); btn.classList.toggle('zero', n === 0);
    ct.textContent = n == null ? '' : n > 0 ? n + ' waiting' : 'all caught up ✓';
    ct.style.display = n == null ? 'none' : '';
    if (sub) sub.textContent = n > 0 ? n + ' waiting for you' : '';
  }


  // ------------------------------------------------------------------ Control Tower mission feed (ct.my)
  // Same rules the admin sees in the Control Tower, said in a friendly voice: proof, ticket ladder, DG/LG/WH mix, community, learning idea,
  // outcome rating vs the top 3, and — only when really needed — "meet admin".
  const BUS = { dg: '#15803d', lg: '#86efac', wh: '#e2e8f0' };
  function ensureMis() {
    let box = $('shMis');
    if (!box) {
      box = document.createElement('div'); box.id = 'shMis'; box.className = 'sh-mis'; box.style.display = 'none';
      const q = $('shQuests'); if (q && q.parentNode) q.parentNode.insertBefore(box, q.nextSibling); else return null;
    }
    return box;
  }
  function paintMissions() {
    const d = S.ct, box = ensureMis(); if (!box) return;
    if (!d || !d.me) { box.style.display = 'none'; return; }
    const m = d.me, cfg = d.cfg || {}, tm = d.team || {}, tv = m.tv || {}, mix = m.mix || {}, pr = m.proof || {};
    const out = [];
    // 1) meet admin (stays until Admin / HR / a named person presses Resolved)
    (d.alerts || []).filter((a) => a.meet).forEach((a) => out.push(`<div class="sh-meet"><b>🤝 Please meet Admin</b><p>${esc(a.gu || a.title)}</p></div>`));
    if (d.nudge) out.push(`<div class="sh-ting"><span class="e">🌱</span><div><b>${esc(d.nudge.title)}</b>${esc(d.nudge.gu)}</div></div>`);
    // 2) friendly warnings ("ting ting")
    (d.alerts || []).filter((a) => !a.meet && a.kind !== 'idea_rigid').slice(0, 3).forEach((a) => out.push(`<div class="sh-ting ${a.sev === 'info' ? 'good' : ''}"><span class="e">${a.sev === 'info' ? '👍' : '⏰'}</span><div><b>${esc(a.title)}</b>${esc(a.gu || a.body || '')}</div></div>`));
    // 3) missions
    const tiles = [];
    const steps = cfg.steps || [2600, 2700];
    if (m.orders > 0 || m.ticket) {
      const tk = Number(m.ticket) || 0, ct = Number(m.clean_ticket) || 0;
      const hint = tv.state === 'early' ? 'Ticket is judged after a few orders'
        : tv.carried ? `Big orders are carrying your average — normal orders average <b>${rs(ct)}</b>. Aim for ${rs(tv.next || steps[0])} on regular orders.`
        : tv.need_next ? `Your <b>next order of ${rs(tv.need_next)}</b> lifts the average to <b>${rs(tv.next)}</b> 🎯` : (tv.state === 'raise' || tv.state === 'top' ? 'Top step reached — push it even higher 🚀' : '');
      tiles.push(`<div class="sh-q ${tv.state === 'top' || tv.state === 'raise' ? 'done' : tv.state === 'near' ? 'near' : ''}"><div class="sh-qh"><span>🎟️</span>Average ticket<em>${rs(tk)}</em></div>
        <div class="sh-qbig">${tv.next ? rs(tv.next) + ' is the next step' : 'Ladder complete!'}</div>
        <div class="sh-steps">${steps.map((x) => `<span class="${tk >= x ? 'on' : x === tv.next ? 'nx' : ''}">${rs(x)}</span>`).join('')}</div>
        <div class="sh-qs">${hint}</div></div>`);
    }
    if (mix.pieces > 0) {
      const tot = Math.max(1, mix.dg + mix.lg + mix.wh + (mix.oth || 0)), goal = cfg.mix_goal || 85, ok = mix.pct >= goal;
      tiles.push(`<div class="sh-q ${ok ? 'done' : mix.pct >= (cfg.mix_amber || 80) ? 'near' : ''}"><div class="sh-qh"><span>🟢</span>Dark green · light green · white<em>${Math.round(mix.pct)}%</em></div>
        <div class="sh-qbig">${ok ? 'Colour mix on target!' : 'Goal ' + goal + '% of pieces'}</div>
        <div class="sh-mixb"><i style="width:${mix.dg / tot * 100}%;background:${BUS.dg}"></i><i style="width:${mix.lg / tot * 100}%;background:${BUS.lg}"></i><i style="width:${mix.wh / tot * 100}%;background:${BUS.wh}"></i></div>
        <div class="sh-mixl"><span><u style="background:${BUS.dg}"></u>DG ${mix.dg}</span><span><u style="background:${BUS.lg}"></u>LG ${mix.lg}</span><span><u style="background:${BUS.wh}"></u>WH ${mix.wh}</span></div></div>`);
    }
    const noProof = (pr.orders_no_chat || 0) + (pr.pending_queries || 0);
    tiles.push(`<div class="sh-q ${noProof ? 'near' : 'done'}"><div class="sh-qh"><span>📎</span>Chat proof<em>${noProof ? noProof + ' pending' : 'DONE ✅'}</em></div>
      <div class="sh-qbig">${noProof ? 'Add your chat screenshots' : 'Every chat has its proof'}</div>
      <div class="sh-qs">${noProof ? `${pr.orders_no_chat ? '<b>' + plural(pr.orders_no_chat, 'order') + '</b> without a chat screenshot' : ''}${pr.orders_no_chat && pr.pending_queries ? ' · ' : ''}${pr.pending_queries ? '<b>' + plural(pr.pending_queries, 'query') + '</b> waiting for proof' : ''}. The AI learns from them and gives you tips.` : 'Great habit — the AI can now coach you on every conversation.'}</div>
      ${noProof ? '<button type="button" class="sh-more" id="shProofGo" style="margin-top:8px">📎 Add proof now</button>' : ''}</div>`);
    if (tm.comm_target) {
      const nx = (tm.comm_checks || []).find((c) => c.state === 'upcoming');
      tiles.push(`<div class="sh-q"><div class="sh-qh"><span>👥</span>Team community orders<em>${tm.community_orders || 0} / ${tm.comm_target}</em></div>
        <div class="sh-qbig">${nx ? 'Next check ' + esc(nx.at) + ': ' + nx.need : 'Day checkpoints done'}</div>
        <div class="sh-qbar"><i style="width:${Math.min(100, (tm.community_orders || 0) / tm.comm_target * 100)}%"></i></div>
        <div class="sh-qs">Team query orders: <b>${tm.query_orders || 0}</b>${tm.q_expected_now ? ' (pace says ~' + Math.round(tm.q_expected_now) + ' by now)' : ''}</div></div>`);
    }
    if (tiles.length) out.push(`<div class="sh-mgrid">${tiles.join('')}</div>`);
    // 4) learning idea of the day
    if (d.idea) {
      const i = d.idea;
      out.push(`<div class="sh-idea" id="shIdea"><h3>${esc(i.title)}</h3><p>${esc(i.body)}</p>${i.why ? `<small>${esc(i.why)}</small>` : ''}
        <div class="bt"><button type="button" class="a" data-idea="try">🚀 I'll try it today</button><button type="button" class="b" data-idea="open">👍 Got it</button></div></div>`);
    }
    // 5) outcome rating vs the top 3
    const oc = d.outcome;
    if (oc && oc.score != null) {
      const L = { conv: 'Conversion', ticket: 'Clean ticket', speed: 'Speed', volume: 'Volume' };
      out.push(`<div class="sh-q"><div class="sh-qh"><span>⭐</span>Outcome rating<em>vs top 3</em></div>
        <div class="sh-out"><div class="big">${Number(oc.score).toFixed(1)}<small> / 10</small></div><div class="sh-qs" style="margin:0;flex:1">Rated on results — conversion, clean ticket, speed and volume — against the best three people, not a fixed checklist.</div></div>
        ${Object.keys(L).filter((k) => oc.scores && oc.scores[k] != null).map((k) => `<div class="sh-ob"><span>${L[k]}</span><div><i style="width:${Math.max(4, Math.min(100, oc.scores[k] * 10))}%"></i></div><b>${Number(oc.scores[k]).toFixed(1)}</b></div>`).join('')}</div>`);
    }
    box.innerHTML = out.join(''); box.style.display = out.length ? '' : 'none';
    const go = $('shProofGo'); if (go) go.onclick = () => proofPopup({ list: pr.list || [], orders: pr.orders_no_chat, queries: pr.pending_queries, later_left: 0, manual: true });
    box.querySelectorAll('[data-idea]').forEach((b) => { b.onclick = async () => {
      const act = b.dataset.idea; try { await api.post('ct.idea_open', { id: d.idea.id, action: act }); } catch (e) {}
      const el = $('shIdea'); if (el) el.innerHTML = `<h3>${act === 'try' ? '🚀 Great — we will watch your next chats' : '👍 Noted'}</h3><p>${act === 'try' ? 'Try it in your next 3 chats. Your result will show here in a few days.' : 'Open it again tomorrow if you want — the next idea comes tomorrow.'}</p>`;
    }; });
  }
  function proofPopup(p) {
    if (document.querySelector('.sh-popbd')) return;
    const bd = document.createElement('div'); bd.className = 'sh-popbd';
    const rows = (p.list || []).slice(0, 5).map((o) => `<div class="row"><span>${esc(o.name || o.key)}</span><button type="button" data-k="${esc(o.key)}" data-n="${esc(o.name || '')}">📎 Add</button></div>`).join('');
    bd.innerHTML = `<div class="sh-pop" role="dialog" aria-modal="true"><h3>📎 ${p.manual ? 'Chat proof' : 'Proof ગુમ છે'}</h3>
      <p>${p.orders ? `<b>${plural(p.orders, 'order')}</b> ની chat screenshot બાકી છે` : ''}${p.orders && p.queries ? ' · ' : ''}${p.queries ? `<b>${plural(p.queries, 'query')}</b> નો proof બાકી છે` : ''}. 
      Screenshots/recordings થી AI તમને coaching આપે છે — અને ટીમને best messages મળે છે. 🙏</p>
      ${rows}
      ${p.queries ? '<button type="button" class="main" id="shPopLost">💔 Lost-chat proof add કરો</button>' : ''}
      ${p.manual || p.later_left <= 0 ? '<button type="button" class="later" id="shPopX">Close</button>' : `<button type="button" class="later" id="shPopLater">હમણાં નહીં (${p.later_left} વાર બાકી)</button>`}</div>`;
    document.body.appendChild(bd);
    const done = (later) => { bd.remove(); if (later && !p.manual) api.post('ct.popup_ack', { action: 'later' }).catch(() => {}); };
    bd.onclick = (e) => { if (e.target === bd) done(true); };
    const lb = bd.querySelector('#shPopLater'); if (lb) lb.onclick = () => done(true);
    const xb = bd.querySelector('#shPopX'); if (xb) xb.onclick = () => done(false);
    bd.querySelectorAll('.row button').forEach((b) => { b.onclick = () => { const [src, oid] = String(b.dataset.k).split('|'); bd.remove(); if (window.Convo) Convo.open({ kind: 'order', source: src, order_id: oid, order_name: b.dataset.n, onChange: () => loadMissions() }); }; });
    const pl = bd.querySelector('#shPopLost'); if (pl) pl.onclick = () => { bd.remove(); if (window.Convo) Convo.open({ kind: 'lost', onChange: () => loadMissions() }); };
  }
  async function loadMissions() {
    try { S.ct = await api.get('ct.my'); } catch (e) { return; }
    paintMissions();
    const pu = S.ct && S.ct.popup;
    if (pu && pu.kind === 'proof' && !S.open && !document.querySelector('.cvx')) { chime(); proofPopup(pu); }
  }

  // ------------------------------------------------------------------ data
  async function loadExtras() {
    api.get('attendance.today').then((d) => { S.punch = d && d.attendance ? d.attendance : {}; paint(); }).catch(() => {});
    api.get('combo_price.get').then((d) => { S.combo = d && d.chart; paintPrice(); }).catch(() => { $('shPrice').style.display = 'none'; });
    setTimeout(loadMissions, 600);
    setInterval(() => { if (!document.hidden) loadMissions(); }, 5 * 60 * 1000);
    api.get('me.flags').then((d) => { S.canAlloc = (d.permissions || []).indexOf('allocation') > -1; initAlloc(); }).catch(() => {});
  }

  window.SalesHome = {
    setCoach(d) { S.coach = d; paint(); },
    setRating(v) { S.rating = v; paint(); },
    onRefresh: null,
    refreshMissions: () => loadMissions(),
    open: () => S.openSheet && S.openSheet(),
    _s: S,
  };
  loadExtras();
})();
