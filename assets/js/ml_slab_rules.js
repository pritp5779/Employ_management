/**
 * ML price slab — the editor card on the Commission Rules page (layout.js loads this file there, after manual_rules.js).
 *
 * One chart: rows = order size (total ML, free ML included), columns = commission % and, in each cell, the lowest price that still
 * earns that %. Switch it ON and every allocated order with a known total ML is paid by it on the Commission page, the Orders page
 * and My Sales (assets/js/ml_slab.js does the maths). Saved through ml_slab.save, read through ml_slab.get.
 */
(function () {
  if (window.__mlSlabRulesLoaded) return;
  window.__mlSlabRulesLoaded = true;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const inr = (v) => '₹' + Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const fmtN = (v) => String(Math.round(Number(v) * 100) / 100);

  const css = `
#mls{margin-top:20px; background:#fff; border:1px solid var(--line); border-radius:var(--radius, 18px); padding:18px 22px 20px;}
#mls h3{margin:0 0 4px; font-size:17px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;}
#mls .rsub{font-size:12.5px; color:var(--muted); line-height:1.5; margin:0 0 14px; max-width:860px;}
#mls .st{font-size:11px; font-weight:800; border-radius:999px; padding:3px 10px;}
#mls .st.on{background:#e7f7ee; color:#0f7a41;} #mls .st.off{background:#f1f3f6; color:#6b7280;}
#mls .tgl{display:inline-flex; align-items:center; gap:8px; cursor:pointer; user-select:none; position:relative; font-size:13px; font-weight:700;}
#mls .tgl input{position:absolute; opacity:0; width:0; height:0;}
#mls .tgl i{width:40px; height:24px; border-radius:20px; background:#cbd2dc; position:relative; transition:.15s; flex:none; display:inline-block;}
#mls .tgl i::after{content:''; position:absolute; left:3px; top:3px; width:18px; height:18px; border-radius:50%; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,.3); transition:left .15s;}
#mls .tgl input:checked + i{background:#16a34a;} #mls .tgl input:checked + i::after{left:19px;}
#mls .row3{display:flex; gap:12px; flex-wrap:wrap; margin-bottom:14px;}
#mls .fld{flex:1 1 200px; background:#fafbfc; border:1px solid #e6e9ee; border-radius:12px; padding:10px 12px;}
#mls .fld label{display:block; font-size:12px; font-weight:700; margin-bottom:6px;}
#mls .fld .in{display:flex; align-items:center; gap:6px; font-size:13px;}
#mls .fld input{width:80px; padding:6px 8px; min-height:0;}
#mls .fld small{display:block; font-size:11.5px; color:var(--muted); margin-top:5px; line-height:1.4;}
#mls .tester{border:2px solid #ddd6fe; background:#faf8ff; border-radius:14px; padding:12px 14px; margin-bottom:14px;}
#mls .tester b.t{display:block; font-size:13.5px; color:#6d28d9; margin-bottom:8px;}
#mls .tin{display:flex; gap:10px; flex-wrap:wrap; align-items:center; font-size:13px;}
#mls .tin input[type=number]{width:96px; padding:6px 8px; min-height:0;}
#mls .tin label{display:inline-flex; align-items:center; gap:5px; cursor:pointer;}
#mls .tout{margin-top:10px; font-size:13px; line-height:1.6;}
#mls .tout .big{font-size:18px; font-weight:800;}
#mls .tout ol{margin:4px 0 0; padding-left:18px; color:#4b5563;}
#mls .tools{display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin:0 0 8px;}
#mls .tools .btn{width:auto; padding:7px 14px; min-height:0; font-size:12.5px;}
#mls .tools .sp{flex:1;}
#mls .wrap{overflow:auto; max-height:62vh; border:1px solid #e6e9ee; border-radius:12px; -webkit-overflow-scrolling:touch;}
#mls table{border-collapse:separate; border-spacing:0; font-size:12.5px; min-width:100%;}
#mls th, #mls td{padding:3px; border-bottom:1px solid #f0f1f3; border-right:1px solid #f4f5f7; text-align:center; white-space:nowrap; background:#fff;}
#mls thead th{position:sticky; top:0; z-index:2; background:#f8fafc; font-size:11px; color:#475569; padding:5px 3px;}
#mls thead tr:nth-child(2) th{top:31px;}
#mls th.c0, #mls td.c0{position:sticky; left:0; z-index:1; background:#f8fafc; font-weight:700;}
#mls thead th.c0{z-index:3;}
#mls td input, #mls th input{width:70px; padding:4px 5px; min-height:0; text-align:right; font-size:12.5px; border:1px solid transparent; border-radius:6px; background:transparent;}
#mls td input:focus, #mls th input:focus{border-color:var(--accent); background:#fff; outline:none;}
#mls th input.nm{width:100px; text-align:center; font-weight:700; font-size:11px; color:#475569;}
#mls th input.pc{width:58px; text-align:center; font-weight:800; font-size:13px; color:#111827;}
#mls td.c0 input{width:58px; font-weight:700; text-align:center;}
#mls td.c1 input{color:#1d4ed8; font-weight:700;} #mls td.c3 input{background:#fff8e1;}
#mls th.lw, #mls td.lw{background:#fff1f2; color:#9f1239;} #mls thead th.lw{background:#fee2e2; color:#9f1239;}
#mls td.lw{font-size:12px; font-weight:700; padding:3px 8px;} #mls th.lw input.pc{color:#9f1239;}
#mls .x{border:1px solid var(--line); background:#fff; border-radius:999px; width:22px; height:22px; cursor:pointer; font-size:11px; color:#9ca3af; padding:0; min-height:0; line-height:1;}
#mls .x:hover{color:#b91c1c; border-color:#f1b4b4;}
#mls tr.bad td{background:#fff1f1;}
#mls .foot{display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-top:12px;}
#mls .foot .btn{width:auto; padding:9px 20px; min-height:0;}
#mls .foot .muted{font-size:12px; color:var(--muted);}
#mls .msg{margin:0 0 12px;}
#mls .paste{display:none; margin:0 0 10px;}
#mls .paste textarea{width:100%; min-height:110px; font-family:ui-monospace,monospace; font-size:12px;}
@media (max-width:640px){ #mls{padding:14px 12px;} #mls .fld{flex-basis:100%;} }
`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const mount = document.querySelector('.content') || document.querySelector('.main') || document.body;
  const root = document.createElement('div'); root.id = 'mls';
  root.innerHTML = '<div class="muted" style="font-size:13px;">Loading the ML price slab…</div>';
  mount.appendChild(root);
  if (!window.MLSLAB) { const sc = document.createElement('script'); sc.src = 'assets/js/ml_slab.js?v=261022a'; sc.onload = () => tryRender(); document.body.appendChild(sc); }

  let C = null, dirty = false;
  const $ = (id) => root.querySelector('#' + id);

  async function load() {
    try {
      const d = await api.get('ml_slab.get');
      if (d.error) throw new Error(d.error);
      C = JSON.parse(JSON.stringify(d.chart));
      tryRender();
    } catch (e) { root.innerHTML = `<div class="alert error">The ML price slab could not be loaded (${esc(e.message)}). Is the new api.php uploaded?</div>`; }
  }
  function tryRender() { if (C && window.MLSLAB) render(); }

  function render() {
    const on = !!Number(C.on);
    root.innerHTML = `
      <h3>ML price slab <span class="st ${on ? 'on' : 'off'}">${on ? 'ON' : 'OFF'}</span>
        <label class="tgl" style="margin-left:auto;"><input type="checkbox" id="mlsOn" ${on ? 'checked' : ''}><i></i><span id="mlsOnTxt">${on ? 'Switched on' : 'Switched off'}</span></label></h3>
      <p class="rsub">Each allocated order is paid by its <b>total ML</b> (free ML included) and the <b>price</b> the customer paid: find the size's row, find the price — that column's % is the commission. A price between two columns: see "Price between two columns" below. Below the last column = the lowest % (never less). Orders with no ML (MySales orders, very old orders) or a size outside the chart keep the normal commission. A panel rule, a fixed commission or a commission set by hand still wins.</p>
      <div id="mlsMsg" class="msg"></div>
      <div class="fld" style="margin-bottom:12px; border-color:#c7d2fe; background:#f5f7ff;"><label>Dates this chart applies (order business day)</label>
        <div class="in" style="flex-wrap:wrap;">From <input type="date" id="mlsFrom" style="width:150px;" value="${esc(C.from || '')}"> To <input type="date" id="mlsTo" style="width:150px;" value="${esc(C.to || '')}"> <button type="button" class="x" id="mlsToClr" title="No end date" style="width:auto; padding:0 10px; border-radius:8px; height:30px;">No end</button></div>
        <small>From empty = from the start. <b>To empty = keeps going</b> (no end). Orders outside these dates keep the normal commission. Now: <b id="mlsDates">${esc(MLSLAB.datesTxt(C))}</b></small></div>
      <div class="row3">
        <div class="fld"><label>Daily target incomplete</label><div class="in">at most <input type="number" id="mlsCap" min="0" max="100" step="0.1" value="${esc(C.cap)}"> %</div><small>Every order of a day whose target is not complete pays this % at most. No target set that day = no cap.</small></div>
        <div class="fld"><label>Order without code</label><div class="in">pays <input type="number" id="mlsNc" min="0" max="100" step="1" value="${esc(C.nocode)}"> % of it</div><small>50 = half. (While this slab is on, it replaces the order-code rules for these orders.)</small></div>
        <div class="fld" style="border-color:#fecaca; background:#fff5f5;"><label>Max discount</label><div class="in">more than <input type="number" id="mlsMax" min="0" max="100" step="0.5" value="${esc(Number(C.maxdisc) || '')}" placeholder="off"> % off → ₹0</div>
          <div class="in" style="margin-top:6px;">for <select id="mlsMaxFor" style="width:auto; padding:5px 8px; min-height:0;"><option value="nocode" ${C.maxdisc_for === 'all' ? '' : 'selected'}>orders WITHOUT code only</option><option value="all" ${C.maxdisc_for === 'all' ? 'selected' : ''}>all orders</option></select></div>
          <small>With a code, any discount is allowed (the chart % still applies). Discount = how far the price paid is below the size's chart price (first column), free ML included. Example: ₹1,810 − 10% = ₹1,629 → below ₹1,629 pays ₹0. Empty = no limit.</small></div>
        <div class="fld" style="border-color:#bbf7d0; background:#f0fdf4;"><label>Lowest commission</label><div class="in">below the last column → <input type="number" id="mlsFloor" min="0" max="100" step="0.1" value="${esc(Number(C.floor) || '')}" placeholder="0"> %</div><small>However low the price, never less than this. No code still halves it (2.8% → 1.4%). Empty = 0%.</small></div>
        <div class="fld"><label>Price between two columns</label><div class="in"><select id="mlsMode" style="width:auto; padding:5px 8px; min-height:0;"><option value="step" ${C.mode === 'between' ? '' : 'selected'}>the lower column's %</option><option value="between" ${C.mode === 'between' ? 'selected' : ''}>a % in between</option></select></div><small>Lower column: ₹1,690 (between ₹1,700 = 6% and ₹1,670 = 4%) → 4%.</small></div>
        <div class="fld"><label>Prepaid discount</label><div class="in"><input type="number" id="mlsPre" min="0" max="20" step="0.5" value="${esc(C.prepaid)}"> % borne by the company</div><small>A prepaid order is looked up at its price before this discount, so it is not pushed into a lower column.</small></div>
      </div>
      <div class="tester"><b class="t">Try it — what does one order earn?</b>
        <div class="tin">
          <label>Total ML <input type="number" id="tMl" value="100" min="1"></label>
          <label>Price ₹ <input type="number" id="tPr" value="1730" min="0"></label>
          <label><input type="checkbox" id="tPre"> Prepaid</label>
          <label><input type="checkbox" id="tCode" checked> Has code</label>
          <label><input type="checkbox" id="tHit" checked> Target complete</label>
        </div>
        <div class="tout" id="tOut"></div>
      </div>
      <div class="tools">
        <button type="button" class="btn secondary" id="mlsAddRow">+ Add size</button>
        <button type="button" class="btn secondary" id="mlsAddCol">+ Add column</button>
        <button type="button" class="btn secondary" id="mlsPasteBtn">Paste from Excel</button>
        <span class="sp"></span><span class="muted" style="font-size:12px;">${C.rows.length} sizes · ${C.cols.length} columns · tap a price to change it</span>
      </div>
      <div class="paste" id="mlsPaste"><textarea id="mlsPasteTxt" placeholder="Copy the table from Excel / Google Sheets and paste it here: one size per line — size (ml), then one price per column. Example:&#10;100	1810	1760	1700	…&#10;110	1990	1940	1870	…"></textarea>
        <div class="tools" style="margin-top:6px;"><button type="button" class="btn" id="mlsPasteOk">Replace the prices</button><button type="button" class="btn secondary" id="mlsPasteNo">Cancel</button></div></div>
      <div class="wrap"><table><thead>
        <tr><th class="c0" rowspan="2">Size<br>(ml)</th>${C.cols.map((c, j) => `<th><input class="nm" data-nm="${j}" value="${esc(C.names[j] || '')}" placeholder="name"></th>`).join('')}<th class="lw" title="Every price below the last column pays this % (never less). No code = half.">Lowest</th><th rowspan="2"></th></tr>
        <tr>${C.cols.map((c, j) => `<th><input class="pc" type="number" step="0.1" data-pc="${j}" value="${esc(c)}">%${C.cols.length > 1 ? ` <button type="button" class="x" data-dc="${j}" title="Remove this column">✕</button>` : ''}</th>`).join('')}<th class="lw"><input class="pc" type="number" step="0.1" min="0" id="mlsFloorCol" value="${esc(Number(C.floor) || 0)}">%</th></tr>
      </thead><tbody>${C.rows.map((r, i) => rowHtml(r, i)).join('')}</tbody></table></div>
      <div class="foot"><button type="button" class="btn" id="mlsSave">Save chart</button><span class="muted" id="mlsDirty">${C.updated_at ? 'Last saved ' + esc(C.updated_at) + (C.updated_by ? ' by ' + esc(C.updated_by) : '') : 'Not saved yet — this is the starting chart.'}</span></div>`;
    wire(); test();
  }
  const rowHtml = (r, i) => `<tr data-r="${i}"><td class="c0"><input type="number" data-ml="${i}" value="${esc(r.ml)}"></td>${r.p.map((v, j) => `<td class="c${j + 1}"><input type="number" data-p="${i}|${j}" value="${esc(v)}"></td>`).join('')}<td class="lw" data-lw="${i}">${lowTxt(r)}</td><td><button type="button" class="x" data-dr="${i}" title="Remove this size">✕</button></td></tr>`;

  // "Lowest" column: every price below the row's last price pays the lowest % (auto, from the last column).
  const lowTxt = (r) => 'Below ₹' + (Number(r.p[r.p.length - 1]) || 0).toLocaleString('en-IN');
  function markDirty() { dirty = true; const el = $('mlsDirty'); if (el) { el.textContent = 'Changes not saved yet'; el.style.color = '#b45309'; } }
  function flash(html, cls) { $('mlsMsg').innerHTML = `<div class="alert ${cls || 'success'}">${html}</div>`; }

  function wire() {
    $('mlsOn').onchange = (e) => { C.on = e.target.checked ? 1 : 0; $('mlsOnTxt').textContent = C.on ? 'Switched on — Save to apply' : 'Switched off — Save to apply'; markDirty(); test(); };
    $('mlsCap').oninput = (e) => { C.cap = Number(e.target.value); markDirty(); test(); };
    $('mlsNc').oninput = (e) => { C.nocode = Number(e.target.value); markDirty(); test(); };
    $('mlsPre').oninput = (e) => { C.prepaid = Number(e.target.value); markDirty(); test(); };
    $('mlsMax').oninput = (e) => { C.maxdisc = Number(e.target.value) || 0; markDirty(); test(); };
    $('mlsFloor').oninput = (e) => { C.floor = Number(e.target.value) || 0; const fc = $('mlsFloorCol'); if (fc) fc.value = C.floor; markDirty(); test(); };
    $('mlsMode').onchange = (e) => { C.mode = e.target.value === 'between' ? 'between' : 'step'; markDirty(); test(); };
    $('mlsMaxFor').onchange = (e) => { C.maxdisc_for = e.target.value === 'all' ? 'all' : 'nocode'; markDirty(); test(); };
    const dates = () => { C.from = $('mlsFrom').value || ''; C.to = $('mlsTo').value || ''; $('mlsDates').textContent = MLSLAB.datesTxt(C); markDirty(); };
    $('mlsFrom').onchange = dates; $('mlsTo').onchange = dates;
    $('mlsToClr').onclick = () => { $('mlsTo').value = ''; dates(); };
    ['tMl', 'tPr', 'tPre', 'tCode', 'tHit'].forEach((id) => { $(id).oninput = test; $(id).onchange = test; });
    root.querySelector('table').addEventListener('input', (e) => {
      const t = e.target;
      if (t.id === 'mlsFloorCol') { C.floor = Number(t.value) || 0; const f = $('mlsFloor'); if (f) f.value = C.floor || ''; }
      else if (t.dataset.p) { const [i, j] = t.dataset.p.split('|').map(Number); C.rows[i].p[j] = Number(t.value); if (j === C.rows[i].p.length - 1) { const c = root.querySelector(`td[data-lw="${i}"]`); if (c) c.textContent = lowTxt(C.rows[i]); } }
      else if (t.dataset.ml) C.rows[Number(t.dataset.ml)].ml = Number(t.value);
      else if (t.dataset.pc) C.cols[Number(t.dataset.pc)] = Number(t.value);
      else if (t.dataset.nm) C.names[Number(t.dataset.nm)] = t.value;
      else return;
      markDirty(); test();
    });
    root.querySelector('table').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.dr) { const i = Number(b.dataset.dr); if (!confirm('Remove the ' + C.rows[i].ml + ' ml row?')) return; C.rows.splice(i, 1); markDirty(); keepDirty(); }
      if (b.dataset.dc) { const j = Number(b.dataset.dc); if (!confirm('Remove the ' + C.cols[j] + '% column?')) return; C.cols.splice(j, 1); C.names.splice(j, 1); C.rows.forEach((r) => r.p.splice(j, 1)); markDirty(); keepDirty(); }
    });
    $('mlsAddRow').onclick = () => {
      const last = C.rows[C.rows.length - 1];
      C.rows.push({ ml: last ? last.ml + 10 : 100, p: last ? last.p.slice() : C.cols.map(() => 0) }); markDirty(); keepDirty();
      const w = root.querySelector('.wrap'); w.scrollTop = w.scrollHeight;
    };
    $('mlsAddCol').onclick = () => {
      const lc = C.cols[C.cols.length - 1];
      C.cols.push(Math.max(0, Math.round((lc - 0.1) * 100) / 100)); C.names.push('');
      C.rows.forEach((r) => r.p.push(Math.round(r.p[r.p.length - 1] * 0.98 / 10) * 10)); markDirty(); keepDirty();
    };
    $('mlsPasteBtn').onclick = () => { $('mlsPaste').style.display = 'block'; $('mlsPasteTxt').focus(); };
    $('mlsPasteNo').onclick = () => { $('mlsPaste').style.display = 'none'; };
    $('mlsPasteOk').onclick = pasteRows;
    $('mlsSave').onclick = save;
  }
  function keepDirty() { render(); if (dirty) markDirty(); }

  function pasteRows() {
    const lines = $('mlsPasteTxt').value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const rows = [];
    for (const l of lines) {
      const cells = l.split(/\t|,|;|\s{2,}|\s/).map((c) => c.replace(/[₹,★\s]|ml/gi, '')).filter((c) => c !== '');
      const nums = cells.map(Number);
      if (nums.length < 2 || nums.some((v) => !isFinite(v))) continue;   // header lines are skipped
      rows.push({ ml: nums[0], p: nums.slice(1) });
    }
    if (!rows.length) { alert('No rows found. Each line needs: size, then the prices.'); return; }
    const w = rows[0].p.length;
    if (rows.some((r) => r.p.length !== w)) { alert('Every line must have the same number of prices.'); return; }
    if (w !== C.cols.length && !confirm(`The pasted table has ${w} price columns, the chart has ${C.cols.length}. Continue? (Set the % of each column after pasting.)`)) return;
    while (C.cols.length < w) { C.cols.push(0); C.names.push(''); }
    if (C.cols.length > w) { C.cols.length = w; C.names.length = w; }
    C.rows = rows.sort((a, b) => a.ml - b.ml);
    markDirty(); keepDirty();
    flash(`${rows.length} sizes pasted — check them, then <b>Save chart</b>.`, 'success');
  }

  function test() {
    const out = $('tOut'); if (!out) return;
    const o = { ml: Number($('tMl').value), amt: Number($('tPr').value), pre: $('tPre').checked, code: $('tCode').checked ? 'X' : '' };
    const r = MLSLAB.orderCom(Object.assign({}, C, { on: 1 }), o, $('tHit').checked);
    if (!r) { out.innerHTML = `<span style="color:#b91c1c; font-weight:700;">${esc(o.ml)} ml is not in the chart</span> — this order keeps the normal commission.`; return; }
    out.innerHTML = `<span class="big">${fmtN(r.pct)}% = ${inr(r.v)}</span> on ${inr(o.amt)}<ol>${r.steps.map((s) => '<li>' + esc(s) + '</li>').join('')}</ol>`;
  }

  async function save() {
    const b = $('mlsSave'); b.disabled = true; b.textContent = 'Saving…';
    try {
      const d = await api.post('ml_slab.save', { chart: { on: C.on, cap: C.cap, nocode: C.nocode, prepaid: C.prepaid, maxdisc: C.maxdisc || 0, maxdisc_for: C.maxdisc_for === 'all' ? 'all' : 'nocode', floor: Number(C.floor) || 0, mode: C.mode === 'between' ? 'between' : 'step', from: C.from || '', to: C.to || '', cols: C.cols, names: C.names, rows: C.rows } });
      if (d.error) throw new Error(d.error);
      C = JSON.parse(JSON.stringify(d.chart)); dirty = false;
      render(); flash(esc(d.message || 'Saved.'), 'success');
    } catch (e) { flash(esc(e.message), 'error'); b.disabled = false; b.textContent = 'Save chart'; }
  }
  addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  load();
})();