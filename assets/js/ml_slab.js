/**
 * ML price slab — the calculation shared by the Commission page, My Sales and the Commission Rules editor.
 *
 * chart = { on, cap, nocode, prepaid, cols:[7, 6.5, …, 0.1], rows:[{ ml:100, p:[1810, 1760, …] }, …] }  (from api: ml_slab.get)
 *
 *  1. Row: the order's total ML (free ML included). A size between two rows (e.g. 165 ml) uses prices in between.
 *     A size outside the chart (below the first row / above the last) → no slab (the order keeps the normal commission).
 *  2. Price: prepaid orders are looked up at their price before the prepaid discount (chart.prepaid %, the company bears it).
 *  3. %: price at or above the first column → the first column's % (the most). Exactly a column's price → that %.
 *     Between two columns: chart.mode 'step' (the chart's rule) → the LOWER column's % (₹1,690 between ₹1,700 = 6% and ₹1,670 = 4% → 4%);
 *     'between' → a % in between, in proportion. Below the last column → chart.floor % (2.8%, never less; no code → half = 1.4%).
 *  4. Daily target incomplete → at most chart.cap %.   5. No order code → chart.nocode % of it (50 = half).
 *  0. More than chart.maxdisc % off the size's chart price → no commission at all (0 / empty = no limit).
 */
(function () {
  if (window.MLSLAB) return;
  const r2 = (v) => Math.round(v * 100) / 100;

  // Prices for one size: the row itself, or in between the two nearest rows. null = outside the chart.
  function rowFor(chart, ml) {
    const rows = (chart && chart.rows) || [];
    ml = Number(ml);
    if (!rows.length || !(ml > 0)) return null;
    if (ml < rows[0].ml || ml > rows[rows.length - 1].ml) return null;
    for (let i = 0; i < rows.length; i++) {
      const a = rows[i];
      if (a.ml === ml) return { p: a.p.map(Number), how: a.ml + ' ml row' };
      const b = rows[i + 1];
      if (b && ml > a.ml && ml < b.ml) {
        const f = (ml - a.ml) / (b.ml - a.ml);
        return { p: a.p.map((v, j) => Number(v) + (Number(b.p[j]) - Number(v)) * f), how: 'between ' + a.ml + ' and ' + b.ml + ' ml rows' };
      }
    }
    return null;
  }

  // The slab % for a size and a price, before the target / code rules. null = outside the chart.
  function pctOf(chart, ml, price) {
    const row = rowFor(chart, ml);
    if (!row) return null;
    const cols = chart.cols.map(Number), p = row.p;
    price = Number(price) || 0;
    if (price >= p[0]) return { pct: cols[0], col: 0, row, why: 'chart price or more' };
    for (let j = 0; j < p.length - 1; j++) {
      if (price <= p[j] && price >= p[j + 1]) {
        if (price === p[j + 1] || p[j] === p[j + 1]) return { pct: cols[j + 1], col: j + 1, row, why: 'exactly a chart price' };
        if (chart.mode !== 'between') return { pct: cols[j + 1], col: j + 1, row, why: 'below ₹' + Math.round(p[j]).toLocaleString('en-IN') + ' → the ₹' + Math.round(p[j + 1]).toLocaleString('en-IN') + ' column (' + cols[j + 1] + '%)' };
        const f = (price - p[j + 1]) / (p[j] - p[j + 1]);
        return { pct: cols[j + 1] + (cols[j] - cols[j + 1]) * f, col: j + 1, row, between: [j, j + 1], why: 'between ₹' + Math.round(p[j + 1]).toLocaleString('en-IN') + ' (' + cols[j + 1] + '%) and ₹' + Math.round(p[j]).toLocaleString('en-IN') + ' (' + cols[j] + '%)' };
      }
    }
    const fl = Number(chart.floor) || 0;
    if (fl > 0) return { pct: fl, col: -1, row, floor: true, why: 'below ₹' + Math.round(p[p.length - 1]).toLocaleString('en-IN') + ' → lowest ' + fl + '%' };
    return { pct: 0, col: -1, row, why: 'below the last price — more than ' + (chart.names && chart.names[chart.names.length - 1] ? chart.names[chart.names.length - 1].replace(/^Up to /i, '') : 'the last column') + ' off' };
  }

  /**
   * One order's commission. o = { ml, amt, pre (prepaid), code }, hit = daily target complete (true when no target is set).
   * Returns null when the slab does not apply (switched off, no ML known, size outside the chart),
   * else { v: ₹, pct: final %, base: slab %, steps: [text], ml, look: price looked up }.
   */
  // The chart's dates (business days 'YYYY-MM-DD'): no From = from the start, no To = keeps going. No day given = applies.
  function activeOn(chart, day) {
    if (!chart || !day) return true;
    if (chart.from && day < chart.from) return false;
    if (chart.to && day > chart.to) return false;
    return true;
  }
  const datesTxt = (c) => !c || (!c.from && !c.to) ? 'all days' : (c.from ? 'from ' + c.from : 'until') + (c.to ? (c.from ? ' to ' : ' ') + c.to : ' onwards');

  function orderCom(chart, o, hit) {
    if (!chart || !Number(chart.on) || o.ml == null || !(Number(o.ml) > 0)) return null;
    if (o.day && !activeOn(chart, o.day)) return null;     // order outside the chart's dates: normal commission
    const amt = Number(o.amt) || 0;
    const look = o.pre && Number(chart.prepaid) > 0 ? amt / (1 - Number(chart.prepaid) / 100) : amt;
    const s = pctOf(chart, o.ml, look);
    if (!s) return null;
    const steps = [Number(o.ml) + ' ml · ' + s.row.how + ' · ₹' + Math.round(look).toLocaleString('en-IN') + (look !== amt ? ' (prepaid, before ' + chart.prepaid + '% off)' : '') + ' → ' + r2(s.pct) + '% (' + s.why + ')'];
    let pct = s.pct;
    // Discount = how far the price the customer actually paid is below the size's chart price (first column); free ML is already
    // in the size. The prepaid 2% is NOT added back here: 100 ml chart ₹1,810, 10% max → anything below ₹1,629 pays nothing.
    const cp = Number(s.row.p[0]), disc = cp > 0 ? Math.max(0, (cp - amt) / cp * 100) : 0, maxd = Number(chart.maxdisc) || 0;
    // The limit is for orders WITHOUT a code (maxdisc_for = 'nocode', default); 'all' limits every order. With a code, any discount is allowed.
    const maxOn = maxd > 0 && (chart.maxdisc_for === 'all' || !o.code);
    if (maxOn && disc > maxd + 1e-9) {
      steps.push('discount ' + r2(disc) + '% is more than the ' + maxd + '% max' + (chart.maxdisc_for === 'all' ? '' : ' for orders without code') + ' → no commission');
      return { v: 0, pct: 0, base: r2(s.pct), steps, ml: Number(o.ml), look, disc: r2(disc), overMax: true };
    }
    if (!hit && pct > Number(chart.cap)) { pct = Number(chart.cap); steps.push('daily target incomplete → max ' + chart.cap + '%'); }
    if (!o.code && Number(chart.nocode) !== 100) { pct = pct * Number(chart.nocode) / 100; steps.push('no code → ' + chart.nocode + '% of it'); }
    // Below the lowest slab % (the last column, 0.1%) = nothing: e.g. 0.1% without code = 0.05% → 0%.
    // (Not with a lowest % set: 2.8% without code = 1.4% is paid.)
    const minPct = Number(chart.floor) > 0 ? 0 : Number(chart.cols[chart.cols.length - 1]) || 0;
    if (pct > 0 && pct < minPct - 1e-9) { steps.push(r2(pct) + '% is below the lowest slab (' + minPct + '%) → 0%'); pct = 0; }
    return { v: amt * pct / 100, pct: r2(pct), base: r2(s.pct), steps, ml: Number(o.ml), look, disc: r2(disc), overMax: false };
  }

  // An order's ML in parts: total (free ML included), extra = the free 10 ml pieces, base = what was bought. null = no ML known.
  function parts(o) {
    if (!o || o.ml == null || o.ml === '') return null;
    const total = Number(o.ml) || 0, extra = Math.max(0, Math.min(total, Number(o.ml_extra) || 0));
    return { total, extra, base: total - extra };
  }
  // A not-switched-on chart still shows what the order WOULD earn (Orders / Order Allocation pages show the slab before it is switched on).
  const preview = (c) => c ? Object.assign({}, c, { on: 1 }) : null;
  // Prepaid = not COD / pending (same as the Commission page): paid and partially paid orders are looked up before the 2% prepaid discount.
  const isPre = (fs) => { fs = String(fs || '').toLowerCase(); return fs !== '' && fs.indexOf('cod') === -1 && fs.indexOf('pending') === -1; };

  /**
   * Extra ML by price: the size's chart price (first column) ÷ its ML = price of 1 ml; the price paid ÷ that = ML the customer paid
   * for; ML in the box − ML paid for = extra ML given (0 when the customer paid the chart price or more). Prepaid orders are taken at
   * their price before the prepaid discount (the company bears it). null = size outside the chart.
   * Example: 100 ml chart ₹1,810 → ₹18.10 / ml; ₹1,700 pays for 93.9 ml → 6.1 ml extra (₹110).
   */
  function extraByPrice(chart, ml, amt, pre) {
    ml = Number(ml); amt = Number(amt) || 0;
    const row = rowFor(chart, ml);
    if (!row || !(ml > 0)) return null;
    const cp = Number(row.p[0]), per = cp / ml;
    const look = pre && Number(chart.prepaid) > 0 ? amt / (1 - Number(chart.prepaid) / 100) : amt;
    const paid = per > 0 ? look / per : ml;
    const extra = Math.max(0, ml - paid);
    return { chart: cp, per, look, paid, extra: Math.round(extra * 10) / 10, value: Math.max(0, cp - look) };
  }

  window.MLSLAB = { rowFor, pctOf, orderCom, parts, preview, isPre, extraByPrice, activeOn, datesTxt, on: (c) => !!(c && Number(c.on)) };
})();