/**
 * Manual commission rules — the "Order-rating rules", "Order-code rules" and "Fixed commission" cards
 * on the Commission Rules page.
 *
 * layout.js loads this file on commission_rules.html only, and it adds its own block at the end of the
 * page's content area, so the page itself needs no edit. (These cards used to sit on the Commission page;
 * the Commission page still READS the same rules and applies them to the numbers.)
 *
 *  - Order-rating rules : an order rated up to N stars pays X% of its commission; if it also has no code,
 *                         Y% of that.  Example: ₹1000 · 2★ → 50% = ₹500 · no code → 50% of that = ₹250.
 *  - Panel & date rules : orders of the chosen panels on the chosen days pay a fixed % of sales (wins over everything else).
 *  - Order-code rules   : when the share of an employee's orders that have a code is above / below a number,
 *                         pay full commission, a fixed % of sales, a % of the normal commission or ₹ per order.
 *  - Fixed commission   : selected people are paid a fixed % of sales (or ₹ per order) instead of the slab.
 *
 * Saved through commission_rules.star_* / mix_* / fixed_*; read through commission_rules.manual_list.
 */
(function () {
  if (window.__manualRulesLoaded) return;
  window.__manualRulesLoaded = true;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const fmtN = (v) => String(Math.round(Number(v) * 100) / 100);
  const starTxt = (v) => fmtN(v) + '★';
  const payTxt = (mode, v) => mode === 'full' ? 'full commission' : mode === 'rate' ? fmtN(v) + '% of sales' : mode === 'pct' ? fmtN(v) + '% of the normal commission' : inr(v) + ' per order';

  const css = `
#mrc{display:flex; flex-direction:column; gap:20px; margin-top:20px;}
#mrc .mcard{background:#fff; border:1px solid var(--line); border-radius:var(--radius, 18px); padding:18px 22px 20px;}
#mrc h3{margin:0 0 4px; font-size:17px;}
#mrc .rsub{font-size:12.5px; color:var(--muted); line-height:1.5; margin:0 0 14px; max-width:820px;}
#mrc .rrule{display:flex; gap:12px; align-items:center; flex-wrap:wrap; padding:12px 14px; border:1px solid #e6e9ee; border-radius:14px; background:#fafbfc; margin-bottom:8px;}
#mrc .rrule.off .rtxt{opacity:.5;}
#mrc .rrule .rtxt{flex:1 1 300px; font-size:13.5px; line-height:1.6; min-width:0;}
#mrc .rrule .ex{display:block; font-size:12px; color:var(--muted); margin-top:2px;}
#mrc .x{border:1px solid var(--line); background:#fff; border-radius:999px; width:30px; height:30px; cursor:pointer; font-size:13px; color:#6b7280; padding:0; min-height:0;}
#mrc .x:hover{color:#b91c1c; border-color:#f1b4b4;}
#mrc .radd{margin-top:6px; border:1px dashed #b9c0cc; background:#fff; border-radius:12px; padding:9px 16px; font-size:13px; font-weight:700; cursor:pointer; color:var(--ink); min-height:0;}
#mrc .radd:hover{border-color:var(--accent);}
#mrc .rtbl{width:100%; border-collapse:collapse; font-size:13.5px; margin-bottom:8px;}
#mrc .rtbl th{font-size:10.5px; text-transform:uppercase; letter-spacing:.03em; color:var(--muted); text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); font-weight:700; background:none;}
#mrc .rtbl td{padding:10px 8px; border-bottom:1px solid #f0f1f3; vertical-align:middle; white-space:normal;}
#mrc .rtbl tr:last-child td{border-bottom:none;}
#mrc .lnk{border:none; background:none; padding:0; font:inherit; font-weight:700; color:var(--blue, #2563eb); cursor:pointer; text-align:left; min-height:0;}
#mrc .lnk:hover{text-decoration:underline;}
#mrc .muted{color:var(--muted);} #mrc .small{font-size:12px;}
#mrc .tgl, .mrc-modal .tgl{display:inline-flex; align-items:center; cursor:pointer; user-select:none; position:relative;}
#mrc .tgl input, .mrc-modal .tgl input{position:absolute; opacity:0; width:0; height:0;}
#mrc .tgl i, .mrc-modal .tgl i{width:40px; height:24px; border-radius:20px; background:#cbd2dc; position:relative; transition:.15s; flex:none; display:inline-block;}
#mrc .tgl i::after, .mrc-modal .tgl i::after{content:''; position:absolute; left:3px; top:3px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition:left .15s;}
#mrc .tgl input:checked + i, .mrc-modal .tgl input:checked + i{background:#16a34a;}
#mrc .tgl input:checked + i::after, .mrc-modal .tgl input:checked + i::after{left:19px;}
#mrc .tgl input:disabled + i{opacity:.5; cursor:not-allowed;}
#mrc .flash{margin-bottom:12px;}
#mrc .chip, .mrc-modal .chip{display:inline-block; font-size:11px; font-weight:800; border-radius:999px; padding:2px 10px; margin:0 4px 2px 0;}
#mrc .c-live{background:#e7f7ee; color:#0f7a41;} #mrc .c-soon{background:#fff4db; color:#8a5a00;} #mrc .c-done{background:#f1f3f6; color:#6b7280;}
#mrc .c-tmph{background:#ede9fe; color:#5b21b6;} #mrc .c-tmf{background:#fff4db; color:#8a5a00;} #mrc .c-tm4u{background:#dbeafe; color:#1d4ed8;} #mrc .c-tmsg{background:#dcfce7; color:#15803d;} #mrc .c-tmh4{background:#ffe4e6; color:#be123c;}
.mrc-modal .pick{display:flex; gap:6px; flex-wrap:wrap;}
.mrc-modal .pick label{display:inline-flex; align-items:center; gap:6px; border:1px solid var(--line); border-radius:999px; padding:7px 14px; font-size:13px; font-weight:700; cursor:pointer; background:#fff; text-transform:none; letter-spacing:0; margin:0;}
.mrc-modal .pick label:has(input:checked){background:#14161a; color:#fff; border-color:#14161a;}
.mrc-modal .pick input{position:absolute; opacity:0; width:0; height:0;}
.mrc-modal .pv{font-size:12.5px; background:#f6f7f9; border-radius:12px; padding:9px 12px; line-height:1.6; margin-bottom:6px;}
.mrc-modal .mxpeople{max-height:170px; overflow-y:auto; border:1px solid var(--line); border-radius:12px; padding:6px 10px; margin-top:8px;}
.mrc-modal .mxpeople[hidden]{display:none;}
.mrc-modal .mxpeople label{display:flex; gap:8px; align-items:center; font-size:13px; padding:4px 0; text-transform:none; letter-spacing:0; font-weight:500; margin:0;}
.mrc-modal .mxpeople input{width:auto;}
.mrc-modal .pctrow{display:flex; align-items:center; gap:8px;}
.mrc-modal .pctrow input{width:110px; text-align:center; font-size:18px; font-weight:800;}
.mrc-modal .pctrow span{font-size:18px; font-weight:800;}
@media (max-width:820px){
  #mrc .mcard{padding:14px;}
  #mrc .rtbl thead{display:none;}
  #mrc .rtbl, #mrc .rtbl tbody{display:block;}
  #mrc .rtbl tr{display:block; padding:8px 0; border-bottom:1px solid #f0f1f3;}
  #mrc .rtbl td{display:flex; justify-content:space-between; align-items:center; border:none; padding:4px 6px;}
  #mrc .rtbl td::before{content:attr(data-label); color:var(--muted); font-size:11px; font-weight:700;}
}`;

  const mount = document.querySelector('.content') || document.querySelector('.main') || document.body;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const root = document.createElement('div');
  root.id = 'mrc';
  root.innerHTML = '<div class="mcard"><div class="muted">Loading manual commission rules…</div></div>';
  mount.appendChild(root);

  const PANELS = [['tmph', 'TM Perfume House'], ['tmf', 'TM Fragrance'], ['tm4u', 'TM4U'], ['tmsg', 'TM Shower Gel'], ['tmh4', 'TM House 4th']];
  const panelName = (k) => (PANELS.find((x) => x[0] === k) || [k, k])[1];
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dShow = (iso) => { const p = String(iso).split('-'); return p.length === 3 ? p[2] + ' ' + MON[Number(p[1]) - 1] + ' ' + p[0] : iso; };
  const starOpts = (() => { const a = []; for (let v = 0.5; v <= 5; v += 0.5) a.push(`<option value="${v}">${starTxt(v)}</option>`); return a.join(''); })();
  const whoBlock = (p) => `<div class="field"><label for="${p}Who">Applies to</label><select id="${p}Who"><option value="all">Everyone</option><option value="sel">Selected people</option></select><div id="${p}People" class="mxpeople" hidden></div></div>`;

  const wrap = document.createElement('div');
  wrap.innerHTML = `
  <div class="modal-overlay mrc-modal" id="pnModal"><div class="modal" style="max-width:520px;">
    <h3 id="pnTitle">Add a panel &amp; date rule</h3>
    <div id="pnAlert"></div>
    <div class="field"><label for="pnName">Rule name <span style="text-transform:none; font-weight:400;">(optional)</span></label><input id="pnName" maxlength="120" placeholder="e.g. Diwali sale"></div>
    <div class="field"><label>Panel — tick one or more</label><div class="pick" id="pnPanels">${PANELS.map((x) => `<label><input type="checkbox" value="${x[0]}"> ${x[1]}</label>`).join('')}</div></div>
    <div class="field-grid">
      <div class="field"><label for="pnFrom">From date</label><input id="pnFrom" type="date"></div>
      <div class="field"><label for="pnTo">To date</label><input id="pnTo" type="date"></div>
    </div>
    <div class="field"><label for="pnPct">Fixed commission (% of sales)</label><div class="pctrow"><input id="pnPct" type="number" min="0" max="100" step="0.01" inputmode="decimal"><span>%</span></div></div>
    ${whoBlock('pn')}
    <div class="pv" id="pnPrev"></div>
    <div class="actions"><button type="button" class="btn secondary" id="pnCancel">Cancel</button><button type="button" class="btn" id="pnSave">Save</button></div>
  </div></div>
  <div class="modal-overlay mrc-modal" id="stModal"><div class="modal" style="max-width:500px;">
    <h3 id="stTitle">Add an order-rating rule</h3>
    <div id="stAlert"></div>
    <div class="field"><label for="stName">Rule name <span style="text-transform:none; font-weight:400;">(optional)</span></label><input id="stName" maxlength="120" placeholder="e.g. Poor rating"></div>
    <div class="field-grid">
      <div class="field"><label for="stStar">When the order is rated up to</label><select id="stStar">${starOpts}</select></div>
      <div class="field"><label for="stPay">Then pay (% of its commission)</label><div class="pctrow"><input id="stPay" type="number" min="0" max="500" step="0.01" inputmode="decimal"><span>%</span></div></div>
    </div>
    <div class="field"><label for="stNc">If the order also has <b>no code</b>, pay (% of that)</label><div class="pctrow"><input id="stNc" type="number" min="0" max="500" step="0.01" inputmode="decimal" value="100"><span>%</span></div>
      <div class="small muted" style="margin-top:6px;">100 = no extra cut for a missing code. 50 = half of what is left.</div></div>
    ${whoBlock('st')}
    <div class="pv" id="stPrev"></div>
    <div class="actions"><button type="button" class="btn secondary" id="stCancel">Cancel</button><button type="button" class="btn" id="stSave">Save</button></div>
  </div></div>
  <div class="modal-overlay mrc-modal" id="mxModal"><div class="modal" style="max-width:500px;">
    <h3 id="mxTitle">Add a commission rule</h3>
    <div class="field"><label for="mxName">Rule name <span style="text-transform:none; font-weight:400;">(optional)</span></label><input id="mxName" maxlength="120" placeholder="e.g. Good code habit"></div>
    <div class="field-grid">
      <div class="field"><label for="mxOp">When orders with a code are</label><select id="mxOp"><option value="gte">at least</option><option value="lte">at most</option></select></div>
      <div class="field"><label for="mxThr">% of the employee's orders</label><input id="mxThr" type="number" min="0" max="100" step="0.01" inputmode="decimal"></div>
    </div>
    <div class="field-grid">
      <div class="field"><label for="mxMode">Then pay</label><select id="mxMode"><option value="full">Full commission (no cut)</option><option value="rate">Fixed commission % of sales</option><option value="pct">% of the normal commission</option><option value="flat">₹ per order</option></select></div>
      <div class="field" id="mxValWrap"><label for="mxVal" id="mxValLbl">Commission %</label><input id="mxVal" type="number" min="0" step="0.01" inputmode="decimal"></div>
    </div>
    ${whoBlock('mx')}
    <div id="mxAlert"></div>
    <div class="actions"><button type="button" class="btn secondary" id="mxCancel">Cancel</button><button type="button" class="btn" id="mxSave">Save</button></div>
  </div></div>
  <div class="modal-overlay mrc-modal" id="fxModal"><div class="modal" style="max-width:470px;">
    <h3 id="fxTitle">Fixed commission for a person</h3>
    <div class="field"><label for="fxEmp">Employee</label><select id="fxEmp"></select></div>
    <div class="field-grid">
      <div class="field"><label for="fxMode">Fixed commission as</label><select id="fxMode"><option value="rate">% of sales</option><option value="flat">₹ per order</option></select></div>
      <div class="field"><label for="fxPer" id="fxPerLbl">Fixed commission (%)</label><input id="fxPer" type="number" min="0" step="0.01" inputmode="decimal"></div>
    </div>
    <div class="field-grid">
      <div class="field"><label for="fxType">Minimum is counted in</label><select id="fxType"><option value="count">Number of orders</option><option value="amount">Achieved amount (₹)</option></select></div>
      <div class="field"><label for="fxMin" id="fxMinLbl">Minimum orders to unlock — optional</label><input id="fxMin" type="number" min="0" step="1" inputmode="numeric" placeholder="blank = no minimum"></div>
    </div>
    <div id="fxAlert"></div>
    <div class="actions"><button type="button" class="btn secondary" id="fxCancel">Cancel</button><button type="button" class="btn" id="fxSave">Save</button></div>
  </div></div>`;
  while (wrap.firstChild) document.body.appendChild(wrap.firstChild);
  const $ = (id) => document.getElementById(id);

  let D = { panel: [], star: [], mix: [], fixed: [], employees: [] };
  const empName = (id) => { const e = D.employees.find((x) => x.employee_id === id); return e ? e.full_name : 'Employee ' + id; };

  function flash(msg) {
    let b = root.querySelector('.flash');
    if (!b) { b = document.createElement('div'); b.className = 'flash'; root.prepend(b); }
    b.innerHTML = msg ? `<div class="alert error">${esc(msg)}</div>` : '';
  }
  async function load() {
    try {
      const d = await api.get('commission_rules.manual_list');
      D = {
        employees: (d.employees || []).map((e) => ({ employee_id: Number(e.employee_id), full_name: e.full_name })),
        panel: (d.panel || []).map((r) => ({ id: Number(r.rule_id), label: r.label || '', panels: r.panels || [], from: r.date_from, to: r.date_to, pct: Number(r.pct), who: (r.who || []).map(Number), on: !!Number(r.enabled) })),
        star: (d.star || []).map((r) => ({ id: Number(r.rule_id), label: r.label || '', star: Number(r.max_star), pay: Number(r.pay_pct), nc: Number(r.nocode_pct), who: (r.who || []).map(Number), on: !!Number(r.enabled) })),
        mix: (d.mix || []).map((r) => ({ id: Number(r.rule_id), label: r.label || '', op: r.op === 'lte' ? 'lte' : 'gte', thr: Number(r.thr), mode: ['full', 'rate', 'pct', 'flat'].indexOf(r.pay_mode) > -1 ? r.pay_mode : 'full', v: Number(r.pay_value || 0), who: (r.who || []).map(Number), on: !!Number(r.enabled) })),
        fixed: (d.fixed || []).map((p) => ({ id: Number(p.plan_id), emp: Number(p.employee_id), per: Number(p.per), mode: p.pay_mode === 'rate' ? 'rate' : 'flat', minType: p.min_type === 'amount' ? 'amount' : 'count', min: Number(p.min), on: !!Number(p.enabled) })),
      };
      render();
    } catch (err) {
      root.innerHTML = `<div class="mcard"><div class="alert error" style="margin:0;">${esc(err.message || 'The manual commission rules could not be read.')} — upload the latest api.php, then reload this page.</div></div>`;
    }
  }
  async function act(fn) {
    try { flash(''); await fn(); } catch (err) { flash(err.message); }
    await load();
  }

  // ---------- rendering ----------
  const whoTxt = (r) => r.who.length ? r.who.length + ' selected ' + (r.who.length === 1 ? 'person' : 'people') : 'everyone';
  const starText = (r) => `Order rated <b>up to ${starTxt(r.star)}</b> → pays <b>${fmtN(r.pay)}%</b> of its commission` + (Number(r.nc) !== 100 ? `, and if it has <b>no code</b> → <b>${fmtN(r.nc)}%</b> of that (${fmtN(r.pay * r.nc / 100)}% of the full commission)` : '');
  const starEx = (r) => `Example: ${inr(1000)} commission → ${inr(1000 * r.pay / 100)}` + (Number(r.nc) !== 100 ? ` · no code → ${inr(1000 * r.pay / 100 * r.nc / 100)}` : '');

  function render() {
    const sorted = D.star.slice().sort((a, b) => a.star - b.star || a.id - b.id);
    root.querySelectorAll(':scope > .mcard').forEach((n) => n.remove());
    const today = ymd(new Date());
    const pst = (r) => r.to < today ? ['c-done', 'ended'] : r.from > today ? ['c-soon', 'starts ' + dShow(r.from)] : ['c-live', '● running now'];
    root.insertAdjacentHTML('beforeend', `
    <div class="mcard" id="panelCard">
      <h3>Panel &amp; date fixed commission</h3>
      <p class="rsub">For the panels and the date range you choose, every order pays a <b>fixed % of its sales</b> — instead of the slab, the order-code rules and the rating rules. Orders on other panels or outside the dates pay normally. (An order whose share was changed by hand on the Commission page keeps that share.)</p>
      ${D.panel.map((r) => { const st = pst(r); return `<div class="rrule ${r.on ? '' : 'off'}">
        <label class="tgl" title="Switch this rule on or off"><input type="checkbox" data-pn-on="${r.id}" ${r.on ? 'checked' : ''}><i></i></label>
        <div class="rtxt">${r.label ? `<b>${esc(r.label)}</b> ` : ''}<span class="chip ${st[0]}">${esc(st[1])}</span><br>${r.panels.map((k) => `<span class="chip c-${esc(k)}">${esc(panelName(k))}</span>`).join('')} · <b>${esc(dShow(r.from))} → ${esc(dShow(r.to))}</b> → fixed <b>${fmtN(r.pct)}%</b> of sales · <span class="muted">${whoTxt(r)}</span><span class="ex">Example: ${inr(3000)} order → ${inr(3000 * r.pct / 100)}</span></div>
        <button type="button" class="x" data-pn-edit="${r.id}" title="Change this rule" aria-label="Change this rule">✎</button>
        <button type="button" class="x" data-pn-del="${r.id}" title="Delete this rule" aria-label="Delete this rule">✕</button></div>`; }).join('') || '<div class="muted small" style="margin-bottom:8px;">No rule yet — add the first one.</div>'}
      <button type="button" class="radd" id="pnAdd">+ Add a panel &amp; date rule</button>
    </div>
    <div class="mcard" id="starCard">
      <h3>Order-rating rules</h3>
      <p class="rsub">Cut the commission of an order by its <b>star rating</b> (the rating given on the Orders / Performance page). An order that matches several rules uses the <b>lowest star</b> rule it fits. Orders without a rating, or rated above every rule, pay normally.</p>
      ${sorted.map((r) => `<div class="rrule ${r.on ? '' : 'off'}">
        <label class="tgl" title="Switch this rule on or off"><input type="checkbox" data-st-on="${r.id}" ${r.on ? 'checked' : ''}><i></i></label>
        <div class="rtxt">${r.label ? `<b>${esc(r.label)}</b><br>` : ''}${starText(r)} <span class="muted">· ${whoTxt(r)}</span><span class="ex">${starEx(r)}</span></div>
        <button type="button" class="x" data-st-edit="${r.id}" title="Change this rule" aria-label="Change this rule">✎</button>
        <button type="button" class="x" data-st-del="${r.id}" title="Delete this rule" aria-label="Delete this rule">✕</button></div>`).join('') || '<div class="muted small" style="margin-bottom:8px;">No rule yet — add the first one.</div>'}
      <button type="button" class="radd" id="stAdd">+ Add a rating rule</button>
    </div>
    <div class="mcard" id="mixCard">
      <h3>Order-code rules</h3>
      <p class="rsub">When the share of an employee's orders that have a code is above or below a number you choose, pay them the way you choose — full commission, a fixed % of sales, a % of the normal commission, or ₹ per order.</p>
      ${D.mix.map((r) => `<div class="rrule ${r.on ? '' : 'off'}">
        <label class="tgl" title="Switch this rule on or off"><input type="checkbox" data-mix-on="${r.id}" ${r.on ? 'checked' : ''}><i></i></label>
        <div class="rtxt">${r.label ? `<b>${esc(r.label)}</b><br>` : ''}If orders with a code are <b>${r.op === 'lte' ? 'at most' : 'at least'} ${fmtN(r.thr)}%</b> of an employee's orders → pay <b>${esc(payTxt(r.mode, r.v))}</b> <span class="muted">· ${whoTxt(r)}</span></div>
        <button type="button" class="x" data-mix-edit="${r.id}" title="Change this rule" aria-label="Change this rule">✎</button>
        <button type="button" class="x" data-mix-del="${r.id}" title="Delete this rule" aria-label="Delete this rule">✕</button></div>`).join('') || '<div class="muted small" style="margin-bottom:8px;">No rule yet — add the first one.</div>'}
      <button type="button" class="radd" id="mixAdd">+ Add a rule</button>
    </div>
    <div class="mcard" id="fixCard">
      <h3>Fixed commission — selected people</h3>
      <p class="rsub">For the people listed, commission is a <b>fixed % of sales</b> (or ₹ per order) instead of the slab. A minimum is <b>optional</b>: if you set one, the fixed commission only pays once the person has reached it (counted from the 1st of the month until today); if you leave it blank, it always pays while the switch is on.</p>
      ${D.fixed.length ? `<table class="rtbl"><thead><tr><th>Employee</th><th>Fixed commission</th><th>Minimum</th><th>Switch</th><th></th></tr></thead><tbody>
      ${D.fixed.map((p) => `<tr><td data-label="Employee"><button type="button" class="lnk" data-fx-edit="${p.id}" title="Change">${esc(empName(p.emp))} ✎</button></td>
        <td data-label="Fixed commission"><b>${esc(payTxt(p.mode, p.per))}</b></td>
        <td data-label="Minimum">${!(p.min > 0) ? 'No minimum' : p.minType === 'amount' ? inr(p.min) + ' achieved' : fmtN(p.min) + ' orders'}</td>
        <td data-label="Switch"><label class="tgl" title="Switch the fixed commission on or off"><input type="checkbox" data-fx-on="${p.id}" ${p.on ? 'checked' : ''}><i></i></label></td>
        <td><button type="button" class="x" data-fx-del="${p.id}" title="Remove" aria-label="Remove">✕</button></td></tr>`).join('')}
      </tbody></table>` : '<div class="muted small" style="margin-bottom:8px;">No one is on a fixed commission yet.</div>'}
      <button type="button" class="radd" id="fxAdd">+ Add person</button>
    </div>`);
  }

  // ---------- clicks on the cards ----------
  const mixBody = (r, over) => Object.assign({ rule_id: r.id, label: r.label, op: r.op, thr: r.thr, pay_mode: r.mode, pay_value: r.v, who: r.who, enabled: r.on ? 1 : 0 }, over || {});
  const panelBody = (r, over) => Object.assign({ rule_id: r.id, label: r.label, panels: r.panels, date_from: r.from, date_to: r.to, pct: r.pct, who: r.who, enabled: r.on ? 1 : 0 }, over || {});
  const starBody = (r, over) => Object.assign({ rule_id: r.id, label: r.label, max_star: r.star, pay_pct: r.pay, nocode_pct: r.nc, who: r.who, enabled: r.on ? 1 : 0 }, over || {});
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.dataset.pnOn) { const r = D.panel.find((x) => x.id == t.dataset.pnOn); act(() => api.post('commission_rules.panel_save', panelBody(r, { enabled: t.checked ? 1 : 0 }))); }
    else if (t.dataset.stOn) { const r = D.star.find((x) => x.id == t.dataset.stOn); act(() => api.post('commission_rules.star_save', starBody(r, { enabled: t.checked ? 1 : 0 }))); }
    else if (t.dataset.mixOn) { const r = D.mix.find((x) => x.id == t.dataset.mixOn); act(() => api.post('commission_rules.mix_save', mixBody(r, { enabled: t.checked ? 1 : 0 }))); }
    else if (t.dataset.fxOn) { const p = D.fixed.find((x) => x.id == t.dataset.fxOn); act(() => api.post('commission_rules.fixed_toggle', { plan_id: p.id, enabled: t.checked ? 1 : 0 })); }
  });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'pnAdd') openPn(null);
    else if (t.dataset.pnEdit) openPn(Number(t.dataset.pnEdit));
    else if (t.dataset.pnDel) { if (confirm('Delete this rule?')) act(() => api.post('commission_rules.panel_delete', { rule_id: Number(t.dataset.pnDel) })); }
    else if (t.id === 'stAdd') openSt(null);
    else if (t.dataset.stEdit) openSt(Number(t.dataset.stEdit));
    else if (t.dataset.stDel) { if (confirm('Delete this rule?')) act(() => api.post('commission_rules.star_delete', { rule_id: Number(t.dataset.stDel) })); }
    else if (t.id === 'mixAdd') openMx(null);
    else if (t.dataset.mixEdit) openMx(Number(t.dataset.mixEdit));
    else if (t.dataset.mixDel) { if (confirm('Delete this rule?')) act(() => api.post('commission_rules.mix_delete', { rule_id: Number(t.dataset.mixDel) })); }
    else if (t.id === 'fxAdd') openFx(null);
    else if (t.dataset.fxEdit) openFx(Number(t.dataset.fxEdit));
    else if (t.dataset.fxDel) { if (confirm('Remove this person from fixed commission?')) act(() => api.post('commission_rules.fixed_delete', { plan_id: Number(t.dataset.fxDel) })); }
  });

  const peopleHtml = (sel) => D.employees.map((e) => `<label><input type="checkbox" value="${e.employee_id}" ${sel && sel.indexOf(e.employee_id) !== -1 ? 'checked' : ''}> ${esc(e.full_name)}</label>`).join('');
  const picked = (p) => [...$(p + 'People').querySelectorAll('input:checked')].map((i) => Number(i.value));
  const closeOnBackdrop = (id) => $(id).addEventListener('click', (e) => { if (e.target === $(id)) $(id).classList.remove('open'); });
  ['pnModal', 'stModal', 'mxModal', 'fxModal'].forEach(closeOnBackdrop);

  // ---------- add / change a panel & date rule ----------
  let pnEdit = null;
  const pnPicked = () => [...$('pnPanels').querySelectorAll('input:checked')].map((i) => i.value);
  function pnSync() {
    $('pnPeople').hidden = $('pnWho').value !== 'sel';
    const ps = pnPicked(), f = $('pnFrom').value, t = $('pnTo').value, pct = $('pnPct').value;
    if (!ps.length || !f || !t || pct === '') { $('pnPrev').textContent = 'Choose the panel, the dates and the % to see a preview.'; return; }
    if (f > t) { $('pnPrev').textContent = 'The From date must be on or before the To date.'; return; }
    const days = Math.round((new Date(t + 'T00:00:00') - new Date(f + 'T00:00:00')) / 86400000) + 1;
    $('pnPrev').innerHTML = `From <b>${esc(dShow(f))}</b> to <b>${esc(dShow(t))}</b> (${days} day${days === 1 ? '' : 's'}), every <b>${ps.map((k) => esc(panelName(k))).join(' + ')}</b> order pays <b>${fmtN(pct)}%</b> of its amount.<br>Example: ${inr(3000)} order → <b>${inr(3000 * Number(pct) / 100)}</b>`;
  }
  function openPn(id) {
    pnEdit = id ? D.panel.find((r) => r.id === id) : null;
    $('pnTitle').textContent = pnEdit ? 'Change this panel & date rule' : 'Add a panel & date rule';
    $('pnName').value = pnEdit ? pnEdit.label : '';
    $('pnPanels').querySelectorAll('input').forEach((i) => { i.checked = !!pnEdit && pnEdit.panels.indexOf(i.value) !== -1; });
    $('pnFrom').value = pnEdit ? pnEdit.from : ''; $('pnTo').value = pnEdit ? pnEdit.to : ''; $('pnPct').value = pnEdit ? pnEdit.pct : '';
    $('pnWho').value = pnEdit && pnEdit.who.length ? 'sel' : 'all';
    $('pnPeople').innerHTML = peopleHtml(pnEdit ? pnEdit.who : []);
    $('pnAlert').innerHTML = ''; pnSync(); $('pnModal').classList.add('open');
  }
  ['pnFrom', 'pnTo', 'pnPct', 'pnWho'].forEach((i) => $(i).addEventListener('input', () => { $('pnAlert').innerHTML = ''; pnSync(); }));
  $('pnPanels').addEventListener('change', () => { $('pnAlert').innerHTML = ''; pnSync(); });
  $('pnCancel').onclick = () => $('pnModal').classList.remove('open');
  $('pnSave').onclick = () => {
    const ps = pnPicked(), f = $('pnFrom').value, t = $('pnTo').value, pct = $('pnPct').value, who = $('pnWho').value === 'sel' ? picked('pn') : [];
    const bad = (m) => { $('pnAlert').innerHTML = `<div class="alert error">${m}</div>`; };
    if (!ps.length) return bad('Tick at least one panel.');
    if (!f || !t) return bad('Choose the From and To dates.');
    if (f > t) return bad('The From date must be on or before the To date.');
    if (pct === '' || Number(pct) < 0 || Number(pct) > 100) return bad('Enter the fixed commission % (0 to 100).');
    if ($('pnWho').value === 'sel' && !who.length) return bad('Tick at least one person, or choose Everyone.');
    $('pnModal').classList.remove('open');
    act(() => api.post('commission_rules.panel_save', { rule_id: pnEdit ? pnEdit.id : 0, label: $('pnName').value.trim(), panels: ps, date_from: f, date_to: t, pct: Number(pct), who, enabled: pnEdit ? (pnEdit.on ? 1 : 0) : 1 }));
  };

  // ---------- add / change an order-rating rule ----------
  let stEdit = null;
  function stSync() {
    $('stPeople').hidden = $('stWho').value !== 'sel';
    const star = $('stStar').value, pay = $('stPay').value, nc = $('stNc').value;
    if (pay === '') { $('stPrev').textContent = 'Fill in the % to see an example.'; return; }
    const p = Number(pay), n = nc === '' ? 100 : Number(nc), base = 1000, a = base * p / 100, b = a * n / 100;
    $('stPrev').innerHTML = `Example: an order whose commission is <b>${inr(base)}</b> and is rated <b>${starTxt(star)}</b> or less<br>→ pays <b>${inr(a)}</b>` + (n !== 100 ? `<br>→ with <b>no code</b> it pays <b>${inr(b)}</b>` : '');
  }
  function openSt(id) {
    stEdit = id ? D.star.find((r) => r.id === id) : null;
    $('stTitle').textContent = stEdit ? 'Change this rating rule' : 'Add an order-rating rule';
    $('stName').value = stEdit ? stEdit.label : ''; $('stStar').value = stEdit ? String(stEdit.star) : '1';
    $('stPay').value = stEdit ? stEdit.pay : ''; $('stNc').value = stEdit ? stEdit.nc : 100;
    $('stWho').value = stEdit && stEdit.who.length ? 'sel' : 'all';
    $('stPeople').innerHTML = peopleHtml(stEdit ? stEdit.who : []);
    $('stAlert').innerHTML = ''; stSync(); $('stModal').classList.add('open');
  }
  ['stStar', 'stPay', 'stNc', 'stWho'].forEach((i) => $(i).addEventListener('input', () => { $('stAlert').innerHTML = ''; stSync(); }));
  $('stCancel').onclick = () => $('stModal').classList.remove('open');
  $('stSave').onclick = () => {
    const pay = $('stPay').value, nc = $('stNc').value, who = $('stWho').value === 'sel' ? picked('st') : [];
    if (pay === '' || Number(pay) < 0 || Number(pay) > 500) { $('stAlert').innerHTML = '<div class="alert error">Enter what the order pays (0 to 500 %). Use 0 for no commission.</div>'; return; }
    if (nc === '' || Number(nc) < 0 || Number(nc) > 500) { $('stAlert').innerHTML = '<div class="alert error">Enter the no-code % (0 to 500). Use 100 for no extra cut.</div>'; return; }
    if ($('stWho').value === 'sel' && !who.length) { $('stAlert').innerHTML = '<div class="alert error">Tick at least one person, or choose Everyone.</div>'; return; }
    $('stModal').classList.remove('open');
    act(() => api.post('commission_rules.star_save', { rule_id: stEdit ? stEdit.id : 0, label: $('stName').value.trim(), max_star: Number($('stStar').value), pay_pct: Number(pay), nocode_pct: Number(nc), who, enabled: stEdit ? (stEdit.on ? 1 : 0) : 1 }));
  };

  // ---------- add / change an order-code rule ----------
  let mxEdit = null;
  function mxSync() {
    const mode = $('mxMode').value;
    $('mxValWrap').style.display = mode === 'full' ? 'none' : '';
    $('mxValLbl').textContent = mode === 'rate' ? 'Commission (% of sales)' : mode === 'pct' ? 'Share of the normal commission (%)' : 'Amount per order (₹)';
    $('mxPeople').hidden = $('mxWho').value !== 'sel';
  }
  function openMx(id) {
    mxEdit = id ? D.mix.find((r) => r.id === id) : null;
    $('mxTitle').textContent = mxEdit ? 'Change this rule' : 'Add a commission rule';
    $('mxName').value = mxEdit ? mxEdit.label : ''; $('mxOp').value = mxEdit ? mxEdit.op : 'gte';
    $('mxThr').value = mxEdit ? mxEdit.thr : ''; $('mxMode').value = mxEdit ? mxEdit.mode : 'full'; $('mxVal').value = mxEdit && mxEdit.mode !== 'full' ? mxEdit.v : '';
    $('mxWho').value = mxEdit && mxEdit.who.length ? 'sel' : 'all';
    $('mxPeople').innerHTML = peopleHtml(mxEdit ? mxEdit.who : []);
    $('mxAlert').innerHTML = ''; mxSync(); $('mxModal').classList.add('open');
  }
  ['mxOp', 'mxThr', 'mxVal', 'mxMode', 'mxWho'].forEach((i) => $(i).addEventListener('input', () => { $('mxAlert').innerHTML = ''; mxSync(); }));
  $('mxCancel').onclick = () => $('mxModal').classList.remove('open');
  $('mxSave').onclick = () => {
    const mode = $('mxMode').value, thr = $('mxThr').value, val = $('mxVal').value, who = $('mxWho').value === 'sel' ? picked('mx') : [];
    if (thr === '' || Number(thr) < 0 || Number(thr) > 100) { $('mxAlert').innerHTML = '<div class="alert error">Enter the % of orders with a code (0 to 100).</div>'; return; }
    if (mode !== 'full' && (val === '' || Number(val) < 0)) { $('mxAlert').innerHTML = '<div class="alert error">Enter how much the rule pays.</div>'; return; }
    if ($('mxWho').value === 'sel' && !who.length) { $('mxAlert').innerHTML = '<div class="alert error">Tick at least one person, or choose Everyone.</div>'; return; }
    $('mxModal').classList.remove('open');
    act(() => api.post('commission_rules.mix_save', { rule_id: mxEdit ? mxEdit.id : 0, label: $('mxName').value.trim(), op: $('mxOp').value, thr: Number(thr), pay_mode: mode, pay_value: mode === 'full' ? 0 : Number(val), who, enabled: mxEdit ? (mxEdit.on ? 1 : 0) : 1 }));
  };

  // ---------- add / change a fixed commission ----------
  let fxEdit = null;
  function fxSync() {
    const mode = $('fxMode').value, type = $('fxType').value;
    $('fxPerLbl').textContent = mode === 'rate' ? 'Fixed commission (% of sales)' : 'Fixed commission (₹ per order)';
    $('fxMinLbl').textContent = (type === 'amount' ? 'Minimum achieved amount to unlock (₹)' : 'Minimum orders to unlock') + ' — optional';
  }
  function openFx(pid) {
    fxEdit = pid ? D.fixed.find((p) => p.id === pid) : null;
    $('fxTitle').textContent = fxEdit ? 'Change fixed commission' : 'Add a person on fixed commission';
    $('fxEmp').innerHTML = D.employees.map((e) => `<option value="${e.employee_id}">${esc(e.full_name)}</option>`).join('');
    $('fxEmp').value = fxEdit ? fxEdit.emp : (D.employees[0] ? D.employees[0].employee_id : '');
    $('fxMode').value = fxEdit ? fxEdit.mode : 'rate';
    $('fxPer').value = fxEdit ? fxEdit.per : ''; $('fxType').value = fxEdit ? fxEdit.minType : 'count'; $('fxMin').value = fxEdit && fxEdit.min > 0 ? fxEdit.min : '';
    $('fxEmp').disabled = !!fxEdit; $('fxAlert').innerHTML = '';
    fxSync(); $('fxModal').classList.add('open');
  }
  ['fxMode', 'fxType', 'fxPer', 'fxMin'].forEach((i) => $(i).addEventListener('input', () => { $('fxAlert').innerHTML = ''; fxSync(); }));
  $('fxCancel').onclick = () => $('fxModal').classList.remove('open');
  $('fxSave').onclick = () => {
    const mode = $('fxMode').value, per = $('fxPer').value, min = $('fxMin').value;
    if (per === '' || Number(per) < 0 || (mode === 'rate' && Number(per) > 100)) { $('fxAlert').innerHTML = `<div class="alert error">${mode === 'rate' ? 'Enter the fixed commission % (0 to 100).' : 'Enter the ₹ per order.'}</div>`; return; }
    if (min !== '' && Number(min) < 0) { $('fxAlert').innerHTML = '<div class="alert error">The minimum cannot be negative — or leave it blank for no minimum.</div>'; return; }
    const emp = Number($('fxEmp').value);
    if (!emp) { $('fxAlert').innerHTML = '<div class="alert error">Choose the employee.</div>'; return; }
    const old = D.fixed.find((p) => p.emp === emp);       // one plan per person: saving again updates it
    const on = old ? old.on : true;
    $('fxModal').classList.remove('open');
    act(() => api.post('commission_rules.fixed_save', { employee_id: emp, pay_mode: mode, per: Number(per), min_type: $('fxType').value, min: min === '' ? 0 : Number(min), enabled: on ? 1 : 0 }));
  };

  load();
})();