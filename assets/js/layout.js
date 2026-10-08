/**
 * Injects the sidebar shell into any page with a <div id="sidebar"></div>.
 * Call renderSidebar('dashboard' | 'departments' | 'employees' | 'documents'
 *                     | 'history' | 'approvals' | 'users' | 'ex_employees') after guardPage().
 */
const LAYOUT_BUILD = '261008.2';   // shown under your name in the sidebar

// Opening splash (TM·PH comet chain + name). Loaded on every page; assets/js/splash.js decides whether to
// play (new tab / app launch, or back after 10+ min away). Add ?splash=1 to any page address to force it.
(function () {
  try {
    if (window.__hrmsSplashInit) return;
    var cs = document.currentScript;
    var src = (cs && cs.src) ? cs.src.replace(/layout\.js.*$/, 'splash.js?v=4') : 'assets/js/splash.js?v=4';
    var s = document.createElement('script');
    s.src = src;
    (document.head || document.documentElement).appendChild(s);
  } catch (e) { /* splash is cosmetic */ }
})();

// Site icon: the TMPH logo as the browser-tab icon and the home-screen icon, on every page that loads this file.
(function () {
  try {
    document.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]').forEach((l) => l.remove());
    const add = (rel, href, attrs) => {
      const l = document.createElement('link');
      l.rel = rel; l.href = href;
      if (attrs) Object.keys(attrs).forEach((k) => l.setAttribute(k, attrs[k]));
      document.head.appendChild(l);
    };
    add('icon', 'icons/favicon-32.png', { type: 'image/png', sizes: '32x32' });
    add('icon', 'icons/favicon-16.png', { type: 'image/png', sizes: '16x16' });
    add('shortcut icon', 'icons/favicon.ico');
    add('apple-touch-icon', 'icons/apple-touch-icon.png');
  } catch (e) { /* icons are cosmetic */ }
})();


/**
 * Punch-in reminder pop-up (employee logins, every page).
 *
 * About once a minute the page asks the server whether a "you haven't
 * punched in" reminder is due (at the office N minutes without punching in,
 * or N minutes after the day started). When it is, a pop-up appears on top
 * of whatever page is open, with a Punch In button. If the employee allowed
 * notifications, the phone also shows one while the app is in the
 * background. When the HRMS is closed, the server pushes the same reminder
 * to the phone (see sw.js) — that only needs the one-time "Allow
 * notifications" tap. Nothing is sent by WhatsApp / SMS; no keys involved.
 */
async function hrmsPushSubscribe(interactive) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window) || !window.isSecureContext) return false;
  const reg = await navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' });
  await navigator.serviceWorker.ready;
  if (Notification.permission !== 'granted') {
    if (!interactive) return false;
    if ((await Notification.requestPermission()) !== 'granted') return false;
  }
  const k = await api.get('push.key');
  const toKey = (b64) => { const pad = '='.repeat((4 - b64.length % 4) % 4); const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')); const out = new Uint8Array(raw.length); for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i); return out; };
  let sub = await reg.pushManager.getSubscription();
  if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(k.key) });
  const j = sub.toJSON();
  await api.post('push.subscribe', { endpoint: j.endpoint, keys: j.keys, device: navigator.userAgent.slice(0, 160) });
  try { localStorage.setItem('hrms_push_day', new Date().toDateString()); } catch (e) {}
  return true;
}

function startPunchReminder() {
  if (window.__punchReminderOn) return;
  window.__punchReminderOn = true;
  const onPunchPage = /(^|\/)attendance\.html$/.test(location.pathname);
  let box = null;
  // Phone already allowed notifications → keep its subscription fresh (once a day, silently).
  try {
    if ('Notification' in window && Notification.permission === 'granted' && localStorage.getItem('hrms_push_day') !== new Date().toDateString()) hrmsPushSubscribe(false).catch(() => {});
  } catch (e) {}
  function show(d) {
    if (!box) {
      box = document.createElement('div');
      box.id = 'punchReminder';
      box.style.cssText = 'position:fixed; inset:0; background:rgba(17,24,39,.55); z-index:9999; display:flex; align-items:center; justify-content:center; padding:20px;';
      document.body.appendChild(box);
    }
    const since = d.since ? new Date(String(d.since).replace(' ', 'T')).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
    const canAsk = ('Notification' in window) && Notification.permission === 'default';
    box.innerHTML = `<div style="background:#fff; border-radius:16px; max-width:420px; width:100%; padding:22px 20px; box-shadow:0 24px 60px rgba(0,0,0,.35); font-family:inherit;">
        <div style="font-size:34px; line-height:1; margin-bottom:8px;">${d.seq >= d.max ? '🚨' : '⏰'}</div>
        <div style="font-size:17px; font-weight:700; color:#111827; margin-bottom:6px;">${d.title || "You haven't punched in yet"}</div>
        <div style="font-size:13.5px; color:#374151; line-height:1.5;">${d.message || ''}</div>
        <div style="font-size:11.5px; color:#6b7280; margin-top:8px;">Reminder ${d.seq} of ${d.max}${since ? ' · since ' + since : ''}</div>
        <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
          ${onPunchPage ? '<button type="button" class="btn" id="prPunch" style="flex:1; min-height:44px;">OK, punching in</button>' : '<a class="btn" href="attendance.html" style="flex:1; min-height:44px; display:inline-flex; align-items:center; justify-content:center; text-decoration:none;">Punch In</a>'}
          <button type="button" class="btn secondary" id="prLater" style="flex:1; min-height:44px;">Later</button>
        </div>
        ${canAsk ? '<button type="button" id="prAllow" style="margin-top:12px; background:none; border:none; color:#2563eb; font-size:12.5px; cursor:pointer; padding:0; min-height:0; text-decoration:underline;">🔔 Also remind me on this phone when HRMS is closed</button>' : ''}
      </div>`;
    box.style.display = 'flex';
    const close = () => { box.style.display = 'none'; };
    const later = document.getElementById('prLater'); if (later) later.onclick = close;
    const punch = document.getElementById('prPunch'); if (punch) punch.onclick = close;
    const allow = document.getElementById('prAllow'); if (allow) allow.onclick = () => { allow.disabled = true; hrmsPushSubscribe(true).then(() => { allow.remove(); }).catch(() => { allow.remove(); }); };
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
    // Phone notification too, when allowed and the app is not in front.
    try {
      if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
        const n = new Notification(d.title || "You haven't punched in yet", { body: d.message || '', tag: 'hrms-punch', renotify: true });
        n.onclick = () => { window.focus(); if (!onPunchPage) location.href = 'attendance.html'; };
      }
    } catch (e) {}
  }
  async function poll() {
    try {
      const d = await api.get('me.reminder_status');
      if (d && d.show) show(d);
      else if (d && d.punched_in && box) box.style.display = 'none';
    } catch (e) {}
  }
  poll();
  setInterval(poll, 60000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); });
}

// A penalty (or its removal / waiver) the employee has not seen yet: shown as a pop-up on whatever page they have open.
// The same text also goes to their phone as a notification. "OK" marks them seen.
function startPenaltyNotice() {
  if (window.__penaltyNoticeOn) return;
  window.__penaltyNoticeOn = true;
  let box = null;
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function show(list) {
    if (!box) {
      box = document.createElement('div');
      box.id = 'penaltyNotice';
      box.style.cssText = 'position:fixed; inset:0; background:rgba(17,24,39,.55); z-index:9998; display:flex; align-items:center; justify-content:center; padding:20px;';
      document.body.appendChild(box);
    }
    const items = list.map((n) => `<div style="padding:10px 12px; border-radius:10px; margin-top:8px; border-left:4px solid ${n.kind === 'applied' ? '#dc2626' : '#16a34a'}; background:${n.kind === 'applied' ? '#fef2f2' : '#f0fdf4'};">
        <div style="font-size:13px; font-weight:700; color:#111827;">${esc(n.title)}</div>
        <div style="font-size:13px; color:#374151; line-height:1.45; margin-top:2px;">${esc(n.body)}</div></div>`).join('');
    box.innerHTML = `<div style="background:#fff; border-radius:16px; max-width:420px; width:100%; max-height:85vh; overflow:auto; padding:20px; box-shadow:0 24px 60px rgba(0,0,0,.35); font-family:inherit;">
        <div style="font-size:17px; font-weight:700; color:#111827;">Penalty update</div>
        ${items}
        <div style="display:flex; gap:10px; margin-top:16px; flex-wrap:wrap;">
          <a class="btn secondary" href="my_penalties.html" style="flex:1; min-height:44px; display:inline-flex; align-items:center; justify-content:center; text-decoration:none;">See details</a>
          <button type="button" class="btn" id="pnOk" style="flex:1; min-height:44px;">OK</button>
        </div></div>`;
    box.style.display = 'flex';
    document.getElementById('pnOk').onclick = async () => {
      box.style.display = 'none';
      try { await api.post('my_penalties.read', {}); } catch (e) {}
    };
    try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {}
  }
  async function poll() {
    if (box && box.style.display !== 'none') return;
    try {
      const t = new Date();
      const d = await api.get('my_penalties.list', { month: t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') });
      if (d && d.unread && d.unread.length) show(d.unread.slice().reverse());
    } catch (e) {}
  }
  poll();
  setInterval(poll, 90000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') poll(); });
}

function renderSidebarCore(active) {
  const user = api.currentUser() || { username: '', role: '' };
  const linkClass = (key) => (active === key ? 'active' : '');
  const isAdmin = user.role === 'Admin';

  // The role saved at login can go stale when Admin changes it on the Users
  // page. me.flags returns the live role: store it and rebuild the page so
  // the new access applies without logging out and in.
  const syncRole = (d) => {
    const tag = document.getElementById('buildTag');
    if (tag && d && d.build) tag.textContent = 'layout ' + LAYOUT_BUILD + ' · api ' + d.build;
    // The server knows which layout.js has every current page in its menu.
    // An older one still loaded here means a stale upload or cache — say so
    // instead of silently missing links.
    if (tag && d && d.layout_min && LAYOUT_BUILD < d.layout_min) {
      tag.insertAdjacentHTML('afterend', `<span style="display:block; margin-top:6px; font-size:11px; color:#fca5a5; line-height:1.4;">Old menu file loaded (layout ${LAYOUT_BUILD}, server needs ${d.layout_min}). Upload the latest assets/js/layout.js and reload.</span>`);
    }
    if (d && d.role && d.role !== user.role) {
      api.setUser(Object.assign({}, user, { role: d.role }));
      window.location.reload();
      return true;
    }
    return false;
  };

  // Each permission can unlock one or more pages.
  const PAGES_FOR_PERM = {
    dashboard: [['dashboard.html', 'Dashboard', 'dashboard']],
    orders: [['orders.html', 'Shopify Orders', 'orders']],
    allocation: [['order_allocation.html', 'Order Allocation', 'order_allocation']],
    order_codes: [['order_codes.html', 'Order Codes', 'order_codes']],
    retail: [['retail_shops.html', 'Retail Shops', 'retail_shops']],
    attendance: [['attendance_admin.html', 'Attendance', 'attendance_admin']],
    leave_requests: [['leave_requests.html', 'Leave Requests', 'leave_requests']],
    offices: [['offices.html', 'Office Locations', 'offices']],
    punch: [['attendance.html', 'Punch In / Out', 'attendance']],
    targets: [['targets.html', 'Targets', 'targets']],
    order_targets: [['order_targets.html', 'Order Targets', 'order_targets']],
    performance: [['performance.html', 'Performance', 'performance']],
    departments: [['departments.html', 'Departments', 'departments']],
    employees: [
      ['employees.html', 'Employees', 'employees'],
      ['ex_employees.html', 'Ex-Employees', 'ex_employees'],
    ],
    documents: [['documents.html', 'Documents', 'documents']],
    whatsapp_groups: [['whatsapp_groups.html', 'WhatsApp Groups', 'whatsapp']],
    excel_files: [['excel_files.html', 'Excel Files', 'excel']],
    assign_queries: [['assign_queries.html', 'Assign Queries', 'assign_queries']],
    salary: [['salary.html', 'Salary', 'salary']],
    commission: [['commission.html', 'Commission', 'commission']],
    commission_rules: [['commission_rules.html', 'Commission Rules', 'commission_rules']],
    penalties: [['penalties.html', 'Penalties', 'penalties']],
    agreements: [['agreements.html', 'Agreements', 'agreements']],
    decline_history: [['history.html', 'Decline History', 'history']],
    approvals: [['approvals.html', 'Approvals', 'approvals']],
    users: [
      ['users.html', 'Users', 'users'],
      ['roles.html', 'Roles', 'roles'],
    ],
  };

  if (user.role !== 'Admin' && user.role !== 'Employee') {
    // Custom role: sidebar built from its granted permissions. The page
    // stays hidden until me.flags confirms this role may open it, so a
    // refused page never flashes its "no permission" errors.
    document.documentElement.style.visibility = 'hidden';
    // Safety net: a slow or stuck server reply must never leave the page
    // invisible — after 6 s the page shows regardless.
    setTimeout(() => { document.documentElement.style.visibility = ''; }, 6000);
    document.getElementById('sidebar').outerHTML = `
    <aside class="sidebar">
      <div class="brand">HR<span>MS</span></div>
      <nav id="customNav"><div class="nav-label">Menu</div></nav>
      <div class="user-box">
        <span class="name">${user.username}</span>
        <span class="role">${user.role}</span>
        <button onclick="logout()">Log out</button>
        <span class="build" id="buildTag" style="display:block; margin-top:6px; font-size:10px; color:#64748b; cursor:pointer;" title="layout.js build · api.php build — click for an access check" onclick="window.open(api.buildUrl('diag.access', { token: api.token() }), '_blank')">layout ${LAYOUT_BUILD}</span>
      </div>
    </aside>
  `;
    addMobileMenu();
    api.get('me.flags').then((d) => {
      if (syncRole(d)) return;
      const perms = d.permissions || [];
      // If the current page isn't allowed for this role, say so in the menu
      // instead of silently jumping away (the page's own data calls are
      // refused by the server anyway, with the same explanation).
      const activePerm = Object.keys(PAGES_FOR_PERM).find(p => PAGES_FOR_PERM[p].some(d => d[2] === active));
      const nav = document.getElementById('customNav');
      if (!nav) return;
      if (activePerm && !perms.includes(activePerm)) {
        // Not allowed here (e.g. login sent them to the Dashboard): go to
        // the first page this role IS allowed, instead of showing an error.
        const home = perms.map(p => (PAGES_FOR_PERM[p] || [])[0]).find(Boolean);
        if (home) { window.location.replace(home[0]); return; }
        const label = (PAGES_FOR_PERM[activePerm].find(d => d[2] === active) || PAGES_FOR_PERM[activePerm][0])[1];
        nav.insertAdjacentHTML('beforeend', `<span style="display:block; padding:8px 20px; font-size:12px; color:#fca5a5; line-height:1.5;">Your role "${user.role}" doesn't include <b>${label}</b>. Ask an Admin to tick it on the Roles page.</span>`);
      }
      document.documentElement.style.visibility = '';
      perms.forEach((p) => {
        (PAGES_FOR_PERM[p] || []).forEach((def) => {
          nav.insertAdjacentHTML('beforeend', `<a href="${def[0]}" class="${active === def[2] ? 'active' : ''}">${def[1]}</a>`);
        });
      });
      if (perms.length === 0) {
        nav.insertAdjacentHTML('beforeend', '<span style="display:block; padding:8px 20px; font-size:12.5px; color:#8a93a6;">No access granted yet — ask Admin.</span>');
      }
    }).catch((err) => {
      document.documentElement.style.visibility = '';
      const nav = document.getElementById('customNav');
      if (nav) nav.insertAdjacentHTML('beforeend', `<span style="display:block; padding:8px 20px; font-size:12px; color:#e08585;">Menu failed to load: ${err.message}</span>`);
    });
    return;
  }

  if (user.role === 'Employee') {
    // Pages every employee may open. Anything else is hidden immediately —
    // before its own script can show admin data — until me.flags confirms
    // the Employee role was granted that module on the Roles page.
    const EMPLOYEE_PAGES = ['attendance', 'leave', 'my_salary', 'my_penalties', 'my_agreements', 'my_sales', 'orders'];
    const needsCheck = !EMPLOYEE_PAGES.includes(active);
    if (needsCheck) { document.documentElement.style.visibility = 'hidden'; setTimeout(() => { document.documentElement.style.visibility = ''; }, 6000); }

    document.getElementById('sidebar').outerHTML = `
    <aside class="sidebar">
      <div class="brand">HR<span>MS</span></div>
      <nav>
        <div class="nav-label">My Space</div>
        <a href="attendance.html" class="${linkClass('attendance')}">Attendance</a>
        <span id="empSalesNav"></span>
      </nav>
      <div class="user-box">
        <span class="name">${user.username}</span>
        <span class="role">${user.role}</span>
        <button onclick="logout()">Log out</button>
        <span class="build" id="buildTag" style="display:block; margin-top:6px; font-size:10px; color:#64748b; cursor:pointer;" title="layout.js build · api.php build — click for an access check" onclick="window.open(api.buildUrl('diag.access', { token: api.token() }), '_blank')">layout ${LAYOUT_BUILD}</span>
      </div>
    </aside>
  `;
    addMobileMenu();

    startPunchReminder();
    startPenaltyNotice();
    api.get('me.flags').then((d) => {
      if (syncRole(d)) return;
      const perms = d.permissions || [];
      const grantedActives = perms.flatMap(p => (PAGES_FOR_PERM[p] || []).map(def => def[2]));
      const allowed = ['attendance', 'leave', 'my_salary', 'my_penalties', 'my_agreements'].concat(grantedActives);
      if (d.is_sales) allowed.push('my_sales', 'orders');
      // replace(): the refused page never enters the history, so the back
      // button goes to the previous employee page, not back to this one.
      if (!allowed.includes(active)) { window.location.replace('attendance.html'); return; }
      if (!d.has_salary && active === 'my_salary') { window.location.replace('attendance.html'); return; }
      if (needsCheck) document.documentElement.style.visibility = '';

      const holder = document.getElementById('empSalesNav');
      if (holder) {
        let links = '';
        if (d.is_sales) {
          links += `
        <a href="my_sales.html" class="${linkClass('my_sales')}">My Sales</a>
        <a href="orders.html" class="${linkClass('orders')}">My Orders</a>`;
        }
        if (d.has_salary) {
          links += `
        <a href="my_salary.html" class="${linkClass('my_salary')}">My Salary</a>`;
        }
        links += `
        <a href="leave.html" class="${linkClass('leave')}">My Leave</a>
        <a href="my_penalties.html" class="${linkClass('my_penalties')}">My Penalties</a>
        <a href="my_agreements.html" class="${linkClass('my_agreements')}">My Agreements</a>`;
        // Admin-side pages granted to the Employee role via Roles page.
        // 'punch' is skipped: every employee already has "Attendance" above,
        // which is the same Punch In / Out page — listing it again showed two
        // highlighted links for one page.
        const morePerms = perms.filter(p => p !== 'punch');
        if (morePerms.length) {
          links += `
        <div class="nav-label">More</div>`;
          morePerms.forEach((p) => {
            (PAGES_FOR_PERM[p] || []).forEach((def) => {
              links += `
        <a href="${def[0]}" class="${active === def[2] ? 'active' : ''}">${def[1]}</a>`;
            });
          });
        }
        holder.outerHTML = links;
      }
    }).catch(() => { if (needsCheck) window.location.replace('attendance.html'); });
    return;
  }

  const adminLinks = isAdmin ? [
    ['approvals.html', 'Approvals <span id="approvalBadge" style="display:none; background:#e02424; color:#fff; border-radius:10px; padding:1px 7px; font-size:11px; font-weight:700; margin-left:6px;"></span>', 'approvals'],
    ['users.html', 'Users', 'users'],
    ['roles.html', 'Roles', 'roles'],
  ] : [];

  // Sidebar links grouped into collapsible categories. "Main" holds the
  // day-to-day pages and opens by default; the rest start collapsed unless
  // they contain the current page, so navigating straight to e.g.
  // Departments always lands with "Masters" already open.
  const categories = [
    { key: 'main', label: 'Main', defaultOpen: true, links: [
      ['dashboard.html', 'Dashboard', 'dashboard'],
      ['orders.html', 'Shopify Orders', 'orders'],
      ['order_allocation.html', 'Order Allocation', 'order_allocation'],
      ['order_codes.html', 'Order Codes', 'order_codes'],
      ['retail_shops.html', 'Retail Shops', 'retail_shops'],
      ['attendance_admin.html', 'Attendance', 'attendance_admin'],
      ['leave_requests.html', 'Leave Requests <span id="leaveBadge" style="display:none; background:#e02424; color:#fff; border-radius:10px; padding:1px 7px; font-size:11px; font-weight:700; margin-left:6px;"></span>', 'leave_requests'],
      ['offices.html', 'Office Locations', 'offices'],
      ['targets.html', 'Targets', 'targets'],
      ['order_targets.html', 'Order Targets', 'order_targets'],
      ['performance.html', 'Performance', 'performance'],
      ['assign_queries.html', 'Assign Queries', 'assign_queries'],
      ['salary.html', 'Salary', 'salary'],
      ['commission.html', 'Commission', 'commission'],
      ['commission_rules.html', 'Commission Rules', 'commission_rules'],
      ['penalties.html', 'Penalties', 'penalties'],
      ['agreements.html', 'Agreements', 'agreements'],
    ]},
    { key: 'masters', label: 'Masters', defaultOpen: false, links: [
      ['departments.html', 'Departments', 'departments'],
    ]},
    { key: 'people', label: 'People', defaultOpen: false, links: [
      ['employees.html', 'Employees', 'employees'],
      ['documents.html', 'Documents', 'documents'],
      ['whatsapp_groups.html', 'WhatsApp Groups', 'whatsapp_groups'],
      ['excel_files.html', 'Excel Files', 'excel_files'],
      ['ex_employees.html', 'Ex-Employees', 'ex_employees'],
      ['history.html', 'Decline History', 'history'],
    ]},
    { key: 'admin', label: 'Admin', defaultOpen: false, links: adminLinks },
  ].filter(cat => cat.links.length);

  const navHtml = categories.map(cat => {
    const linksHtml = cat.links.map(([href, label, key]) =>
      `<a href="${href}" class="${linkClass(key)}">${label}</a>`
    ).join('');
    return `
        <div class="nav-cat" data-cat="${cat.key}">
          <button type="button" class="nav-label nav-cat-toggle" data-cat-toggle="${cat.key}" style="display:flex; align-items:center; justify-content:space-between; width:100%; background:none; border:none; cursor:pointer; font:inherit; text-align:left;">
            <span>${cat.label}</span>
            <span class="nav-cat-chevron" data-chevron="${cat.key}" style="display:inline-block; transition:transform 0.15s;">&#9662;</span>
          </button>
          <div class="nav-cat-body" data-cat-body="${cat.key}">${linksHtml}</div>
        </div>`;
  }).join('');

  document.getElementById('sidebar').outerHTML = `
    <aside class="sidebar">
      <div class="brand">HR<span>MS</span></div>
      <nav>${navHtml}</nav>
      <div class="user-box">
        <span class="name">${user.username}</span>
        <span class="role">${user.role}</span>
        <button onclick="logout()">Log out</button>
        <span class="build" id="buildTag" style="display:block; margin-top:6px; font-size:10px; color:#64748b; cursor:pointer;" title="layout.js build · api.php build — click for an access check" onclick="window.open(api.buildUrl('diag.access', { token: api.token() }), '_blank')">layout ${LAYOUT_BUILD}</span>
      </div>
    </aside>
  `;

  addMobileMenu();
  initNavCategories(categories, active);

  if (isAdmin) {
    api.get('me.flags').then(syncRole).catch(() => {});
    api.get('leave_admin.count').then((d) => {
      const badge = document.getElementById('leaveBadge');
      if (badge && d.count > 0) { badge.textContent = d.count; badge.style.display = 'inline-block'; }
    }).catch(() => {});
    api.get('approvals.count').then((d) => {
      const badge = document.getElementById('approvalBadge');
      if (badge && d.count > 0) {
        badge.textContent = d.count;
        badge.style.display = 'inline-block';
      }
    }).catch(() => {});
  }
}

/* ===== Icon rail (look & feel only) =====
   renderSidebarCore() above builds the menu exactly as before (permissions,
   Employee / custom-role variants, groups). renderSidebar() below runs it and
   then dresses the result: logo on top, an icon + label for every link,
   avatar and log-out at the bottom, and a wide/narrow toggle. Links that
   arrive later (custom roles and employees get theirs after me.flags) are
   dressed by a MutationObserver. */
const RAIL_ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
  bag: '<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7a3 3 0 016 0"/>',
  split: '<circle cx="6" cy="6" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="12" cy="19" r="2.5"/><path d="M6 8.5c0 4 6 3 6 8M18 8.5c0 4-6 3-6 8"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8L3 12z"/><circle cx="7.5" cy="8.5" r="1.3"/>',
  shop: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9a2.7 2.7 0 005.3 0 2.7 2.7 0 005.4 0A2.7 2.7 0 0020 9"/><path d="M5 12v8h14v-8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 005 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/><path d="M2 3h3l2.4 12h11l2-8H6"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
  query: '<circle cx="12" cy="8" r="3.5"/><path d="M5 21c0-4 3-6.5 7-6.5s7 2.5 7 6.5"/><path d="M19 3v4M17 5h4"/>',
  wallet: '<path d="M3 7a2 2 0 012-2h13v4"/><path d="M3 7v11a2 2 0 002 2h15V9H5a2 2 0 01-2-2z"/><circle cx="16.5" cy="14.5" r="1.2"/>',
  percent: '<path d="M19 5L5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  alert: '<path d="M12 3l10 18H2L12 3z"/><path d="M12 10v5M12 18h0"/>',
  file: '<path d="M7 3h7l5 5v13H7V3z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
  building: '<path d="M4 21V5l8-2v18M12 8h8v13M4 21h16"/><path d="M8 9h0M8 13h0M8 17h0M16 12h0M16 16h0"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.8-6 6.5-6s6.5 2.4 6.5 6"/><path d="M16 4.5a3.5 3.5 0 010 7M18 14c2.2.6 3.5 2.4 3.5 6"/>',
  folder: '<path d="M3 6a2 2 0 012-2h4l2 2h8a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4V5z"/>',
  sheet: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M4 15h16M10 3v18"/>',
  userx: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.6 2.8-6 6.5-6s6.5 2.4 6.5 6"/><path d="M17 9l4 4M21 9l-4 4"/>',
  history: '<path d="M3 12a9 9 0 109-9 9 9 0 00-7 3.4L3 9"/><path d="M3 4v5h5M12 8v4l3 2"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M9 14.5l2 2 4-4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.2 3.6-7 8-7s8 2.8 8 7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>',
  dot: '<circle cx="12" cy="12" r="3"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  out: '<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
};
const RAIL_ICON_FOR = {
  dashboard: 'home', orders: 'bag', order_allocation: 'split', order_codes: 'tag', retail_shops: 'shop',
  attendance_admin: 'clock', attendance: 'clock', offices: 'pin', targets: 'target', order_targets: 'cart',
  performance: 'chart', assign_queries: 'query', salary: 'wallet', my_salary: 'wallet', commission: 'percent',
  commission_rules: 'sliders', penalties: 'alert', my_penalties: 'alert', agreements: 'file', my_agreements: 'file',
  departments: 'building', employees: 'users', documents: 'folder', whatsapp_groups: 'chat', excel_files: 'sheet',
  ex_employees: 'userx', history: 'history', approvals: 'check', users: 'user', roles: 'lock', my_sales: 'cart', leave: 'calendar', leave_requests: 'calendar',
};
function railSvg(name) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (RAIL_ICONS[name] || RAIL_ICONS.dot) + '</svg>';
}

function setupRail() {
  const side = document.querySelector('aside.sidebar');
  if (!side || side.dataset.rail) return;
  side.dataset.rail = '1';
  const user = api.currentUser() || { username: '', role: '' };
  const mq = window.matchMedia('(max-width: 820px)');
  const KEY = 'hrms_rail_wide';
  let wide = false;
  try { wide = localStorage.getItem(KEY) === '1'; } catch (e) {}

  // Brand: logo tile (falls back to "HR" if the icon file is missing) + name when wide.
  const brand = side.querySelector('.brand');
  if (brand) {
    brand.innerHTML = '<img src="icons/apple-touch-icon.png" alt="" onerror="this.outerHTML=\'<span class=&quot;logo-fb&quot;>HR</span>\'">'
      + '<span class="brand-txt">HR<span>MS</span></span>';
  }

  // User box: avatar + (wide) name/role + log-out icon. The original buttons stay in the DOM, hidden.
  const box = side.querySelector('.user-box');
  if (box) {
    const nm = String(user.username || '?').trim();
    const ini = nm.split(/[\s._-]+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';
    box.insertAdjacentHTML('afterbegin', '<span class="avatar" title="' + nm.replace(/"/g, '') + ' · ' + String(user.role || '') + '">' + ini + '</span>');
    const nameEl = box.querySelector('.name'), roleEl = box.querySelector('.role');
    const who = document.createElement('span');
    who.className = 'who';
    if (nameEl) who.appendChild(nameEl);
    if (roleEl) who.appendChild(roleEl);
    box.querySelector('.avatar').after(who);
    const out = document.createElement('button');
    out.type = 'button'; out.className = 'rail-out'; out.title = 'Log out'; out.setAttribute('aria-label', 'Log out');
    out.innerHTML = railSvg('out');
    out.addEventListener('click', () => { if (typeof logout === 'function') logout(); });
    box.appendChild(out);
  }

  // Wide / narrow toggle (desktop).
  const tools = document.createElement('div');
  tools.className = 'rail-tools';
  tools.innerHTML = '<button type="button" id="railToggle" title="Show / hide page names" aria-label="Show or hide page names">' + railSvg('chev') + '</button>';
  const nav = side.querySelector('nav');
  if (nav) nav.after(tools);
  tools.querySelector('button').addEventListener('click', () => {
    wide = !wide;
    try { localStorage.setItem(KEY, wide ? '1' : '0'); } catch (e) {}
    apply();
  });

  function apply() {
    const phone = mq.matches;
    side.classList.toggle('wide', phone || wide);
    document.body.classList.toggle('rail-wide', !phone && wide);
    tools.style.display = phone ? 'none' : '';
  }
  apply();
  if (mq.addEventListener) mq.addEventListener('change', apply); else if (mq.addListener) mq.addListener(apply);

  // Dress every link: icon + label + tooltip. Idempotent, so it can re-run.
  function dress() {
    side.querySelectorAll('nav a').forEach((a) => {
      if (a.querySelector(':scope > .ico')) return;
      const file = (a.getAttribute('href') || '').split('?')[0].replace(/\.html$/, '');
      const key = file === 'history' ? 'history' : file;
      const label = a.textContent.replace(/\s+/g, ' ').trim();
      const lbl = document.createElement('span');
      lbl.className = 'lbl';
      while (a.firstChild) lbl.appendChild(a.firstChild);
      const ico = document.createElement('span');
      ico.className = 'ico';
      ico.innerHTML = railSvg(RAIL_ICON_FOR[key] || 'dot');
      a.appendChild(ico);
      a.appendChild(lbl);
      const bd = lbl.querySelector('#approvalBadge, #leaveBadge');
      if (bd) a.appendChild(bd);   // keep the count visible on the narrow rail
      a.setAttribute('data-tip', label);
      a.setAttribute('aria-label', label);
    });
    // Phone: tapping a link closes the drawer.
  }
  dress();

  // Keep the menu where it was: remember how far it is scrolled and restore that
  // on the next page, so opening a page never throws the rail back to the top.
  // If the current page's icon would still be out of sight, bring it into view.
  const SKEY = 'hrms_rail_scroll';
  let userScrolled = false;
  function restoreScroll() {
    if (!nav) return;
    let y = 0;
    try { y = parseInt(localStorage.getItem(SKEY) || '0', 10) || 0; } catch (e) {}
    nav.scrollTop = y;
    const act = nav.querySelector('a.active');
    if (act) {
      const n = nav.getBoundingClientRect(), r = act.getBoundingClientRect();
      if (r.top < n.top || r.bottom > n.bottom) act.scrollIntoView({ block: 'center' });
    }
  }
  if (nav) {
    restoreScroll();
    requestAnimationFrame(restoreScroll);
    nav.addEventListener('scroll', () => {
      userScrolled = true;
      try { localStorage.setItem(SKEY, String(Math.round(nav.scrollTop))); } catch (e) {}
    }, { passive: true });
    window.addEventListener('pagehide', () => {
      try { localStorage.setItem(SKEY, String(Math.round(nav.scrollTop))); } catch (e) {}
    });
  }
  // Tooltip: one floating label, placed from the hovered icon's real position,
  // so it always sits beside that icon however far the menu is scrolled.
  // The tooltip's own styles live here too (and the old CSS-only tooltip is switched off),
  // so this file alone is enough to fix a tooltip that drifts away from its icon.
  if (!document.getElementById('railTipCss')) {
    const st = document.createElement('style'); st.id = 'railTipCss';
    st.textContent = '.sidebar a[data-tip]:hover::after{display:none !important;content:none !important}'
      + '.rail-tip{position:fixed;z-index:2000;background:var(--ink,#111827);color:#fff;font-size:12px;font-weight:600;white-space:nowrap;padding:6px 11px;border-radius:10px;pointer-events:none;transform:translateY(-50%);opacity:0;transition:opacity .12s}'
      + '.rail-tip.show{opacity:1}@media (max-width:820px){.rail-tip{display:none !important}}';
    document.head.appendChild(st);
  }
  let tip = document.getElementById('railTip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'railTip'; tip.className = 'rail-tip'; document.body.appendChild(tip); }
  const hideTip = () => tip.classList.remove('show');
  side.addEventListener('mouseover', (e) => {
    const a = e.target.closest && e.target.closest('nav a[data-tip]');
    if (!a || mq.matches || side.classList.contains('wide')) { hideTip(); return; }
    const r = a.getBoundingClientRect(), sr = side.getBoundingClientRect();
    tip.textContent = a.getAttribute('data-tip');
    tip.style.left = Math.round(sr.right + 8) + 'px';
    tip.style.top = Math.round(r.top + r.height / 2) + 'px';
    tip.classList.add('show');
  });
  side.addEventListener('mouseleave', hideTip);
  if (nav) nav.addEventListener('scroll', hideTip, { passive: true });
  window.addEventListener('blur', hideTip);

  // Links added later (custom roles / employees) or a width change: re-apply, unless the person has scrolled meanwhile.
  new MutationObserver(() => { dress(); if (!userScrolled) restoreScroll(); }).observe(side, { childList: true, subtree: true });
}

function renderSidebar(active) {
  renderSidebarCore(active);
  try { setupRail(); } catch (e) { /* styling only — never block the menu */ }
  // The "Order code rules" section lives in its own file and adds itself to the Commission Rules page.
  if (active === 'commission_rules' && !document.getElementById('codeRulesJs')) {
    const sc = document.createElement('script');
    sc.id = 'codeRulesJs'; sc.src = 'assets/js/code_rules.js';
    document.body.appendChild(sc);
  }
}

function initNavCategories(categories, active) {
  const STORAGE_KEY = 'hrms_nav_open';
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e) { stored = {}; }

  const activeCat = categories.find(cat => cat.links.some(link => link[2] === active));

  categories.forEach(cat => {
    const isOpen = activeCat && cat.key === activeCat.key
      ? true
      : (stored[cat.key] !== undefined ? stored[cat.key] : cat.defaultOpen);
    applyNavCatState(cat.key, isOpen);
  });

  document.querySelectorAll('[data-cat-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.catToggle;
      const body = document.querySelector(`[data-cat-body="${key}"]`);
      const nowOpen = body.style.display === 'none';
      applyNavCatState(key, nowOpen);
      stored[key] = nowOpen;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    });
  });
}

function applyNavCatState(key, isOpen) {
  const body = document.querySelector(`[data-cat-body="${key}"]`);
  const chevron = document.querySelector(`[data-chevron="${key}"]`);
  if (body) body.style.display = isOpen ? 'block' : 'none';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(-90deg)';
}

function addMobileMenu() {
  if (!document.getElementById('menuToggle')) {
    document.body.insertAdjacentHTML('beforeend', `
      <button id="menuToggle" aria-label="Open menu">&#9776;</button>
      <div id="sidebarBackdrop"></div>
    `);
    document.getElementById('menuToggle').addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
    document.getElementById('sidebarBackdrop').addEventListener('click', () => {
      document.body.classList.remove('sidebar-open');
    });
  }
}
/**
 * Generic responsive tables.
 *
 * Stamps every <td> with a data-label taken from its column's <th>, so CSS
 * can render each row as a labelled card on narrow screens without every
 * page needing its own hand-built card markup. Rows are usually injected by
 * each page's own JS long after load, so a MutationObserver re-stamps
 * whenever a tbody changes.
 *
 * Tables that already ship a purpose-built mobile card view (Orders,
 * Attendance, Targets, Employees, Performance) hide their <table> entirely
 * at the same breakpoint, so this never competes with them.
 */
(function responsiveTables() {
  function stamp(table) {
    const heads = [...table.querySelectorAll('thead th')].map(th => th.textContent.trim());
    if (!heads.length) return;
    table.querySelectorAll('tbody tr').forEach(tr => {
      // Skip grouping/spanning rows (day headers, "no results" messages):
      // their single cell spans the table and has no one column to name.
      const cells = tr.children;
      if (cells.length !== heads.length) return;
      [...cells].forEach((td, i) => {
        if (heads[i]) td.setAttribute('data-label', heads[i]);
      });
    });
  }

  function stampAll() {
    document.querySelectorAll('table').forEach(stamp);
  }

  function watch() {
    stampAll();
    const obs = new MutationObserver((records) => {
      const touched = new Set();
      records.forEach(r => {
        const t = r.target.closest && r.target.closest('table');
        if (t) touched.add(t);
      });
      touched.forEach(stamp);
    });
    document.querySelectorAll('tbody').forEach(tb => {
      obs.observe(tb, { childList: true, subtree: true });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watch);
  } else {
    watch();
  }
})();

/**
 * Uploaded files open through api.php (files.view), app-wide.
 *
 * Direct links like …/empmanagment/uploads/doc_158_….png return 404 on this
 * hosting, and files uploaded before the domain move sit in the old domain's
 * folder. Every page builds those direct links (Approvals "View", employee
 * documents, photos…), so rather than edit each page this intercepts them:
 *  - clicking a link into /uploads/ fetches the file with the login token.
 *    Photos open in a viewer on the same page (never a new tab: inside the
 *    installed phone app a new tab is outside the app, and Back there closes
 *    the whole app). Other files open in a new tab in the browser, and are
 *    saved to the phone when the page runs as the installed app;
 *  - <img> tags pointing into /uploads/ are loaded the same way.
 */
(function uploadsViaApi() {
  if (typeof api === 'undefined' || typeof API_BASE_URL === 'undefined') return;

  const relOf = (url) => {
    const i = String(url || '').indexOf('/uploads/');
    return i === -1 ? null : decodeURIComponent(String(url).slice(i + 1).split('?')[0].split('#')[0]);
  };
  const fetchBlob = async (rel) => {
    const res = await fetch(api.buildUrl('files.view', { path: rel }), {
      headers: api.token() ? { Authorization: 'Bearer ' + api.token() } : {},
    });
    if (!res.ok) {
      let msg = `Could not open the file (HTTP ${res.status}).`;
      try { const j = await res.json(); if (j.error) msg = j.error; } catch (e) {}
      throw new Error(msg);
    }
    return res.blob();
  };

  // ---- links ----
  const IMG_RE = /\.(jpe?g|png|gif|webp|bmp|avif|heic|heif)$/i;
  const installedApp = () => {
    try { return ['standalone', 'fullscreen', 'minimal-ui'].some((m) => window.matchMedia('(display-mode: ' + m + ')').matches) || navigator.standalone === true; }
    catch (e) { return false; }
  };
  const baseName = (rel) => decodeURIComponent(String(rel).split('/').pop() || 'file');
  const saveBlob = (blob, name) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  };

  // Photo viewer: a full-screen layer on the same page. Close button, a tap outside the photo, or the
  // phone's Back button closes it (layout.js's Back handling treats it like any other pop-up).
  let viewer = null;
  function closeViewer() {
    if (!viewer) return;
    const v = viewer; viewer = null;
    if (v.url) URL.revokeObjectURL(v.url);
    v.el.remove();
  }
  function openViewer(rel) {
    closeViewer();
    const el = document.createElement('div');
    el.className = 'modal-overlay open';
    el.id = 'hrmsViewer';
    el.style.cssText = 'background:rgba(0,0,0,.94); padding:0; z-index:3000; flex-direction:column; align-items:stretch; justify-content:flex-start;';
    const btn = 'border:0; border-radius:8px; padding:0 16px; min-height:40px; font:600 14px system-ui; cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; background:#fff; color:#111;';
    el.innerHTML = `<div style="display:flex; gap:10px; align-items:center; justify-content:space-between; padding:10px 12px;">
        <span style="color:#fff; font:600 14px system-ui; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"></span>
        <span style="display:flex; gap:8px; flex:none;"><a data-v="dl" style="${btn} display:none;">Download</a><button type="button" data-v="x" style="${btn}">Close</button></span>
      </div>
      <div data-v="body" style="flex:1; min-height:0; overflow:auto; display:flex; align-items:center; justify-content:center; padding:0 8px 12px; color:#fff; font:14px system-ui; text-align:center;">Opening photo…</div>`;
    el.firstElementChild.firstElementChild.textContent = baseName(rel);
    const body = el.querySelector('[data-v="body"]');
    el.querySelector('[data-v="x"]').addEventListener('click', closeViewer);
    el.addEventListener('click', (e) => { if (e.target === el || e.target === body) closeViewer(); });
    document.body.appendChild(el);
    const v = viewer = { el, url: null };
    return {
      show(blob) {
        if (viewer !== v) return;                       // closed while it was loading
        v.url = URL.createObjectURL(blob);
        const img = document.createElement('img');
        const fit = 'max-width:100%; max-height:100%; object-fit:contain; border-radius:6px; cursor:zoom-in;';
        img.style.cssText = fit; img.alt = baseName(rel); img.src = v.url;
        let zoom = false;
        img.addEventListener('click', () => {               // tap = full size (scroll to look around), tap again = fit
          zoom = !zoom;
          img.style.cssText = zoom ? 'max-width:none; max-height:none; border-radius:6px; cursor:zoom-out; margin:auto;' : fit;
        });
        body.textContent = ''; body.appendChild(img);
        const dl = el.querySelector('[data-v="dl"]');
        dl.href = v.url; dl.download = baseName(rel); dl.style.display = 'inline-flex';
      },
      fail(msg) { if (viewer === v) body.textContent = msg; },
    };
  }

  document.addEventListener('click', async (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const rel = relOf(a.getAttribute('href'));
    if (!rel) return;
    e.preventDefault();

    // Photos: shown on this page.
    if (IMG_RE.test(rel)) {
      const view = openViewer(rel);
      try { view.show(await fetchBlob(rel)); } catch (err) { view.fail(err.message); }
      return;
    }
    // Other files in the installed app: save to the phone — a new tab would be outside the app.
    if (installedApp()) {
      try { saveBlob(await fetchBlob(rel), baseName(rel)); } catch (err) { alert(err.message); }
      return;
    }

    // Browser: open the tab now, inside the click, so popup blockers allow it.
    const win = window.open('', '_blank');
    if (win) win.document.write('<p style="font:14px system-ui; padding:24px; color:#555;">Opening file…</p>');
    try {
      const url = URL.createObjectURL(await fetchBlob(rel));
      if (win) win.location.href = url; else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (err) {
      if (win) {
        win.document.body.innerHTML = '';
        const p = win.document.createElement('p');
        p.style.cssText = 'font:14px system-ui; padding:24px; color:#b42318;';
        p.textContent = err.message;
        win.document.body.appendChild(p);
      } else {
        alert(err.message);
      }
    }
  }, true);

  // ---- images ----
  const cache = new Map(); // rel -> Promise<objectURL>
  const fixImg = (img) => {
    if (img.dataset.upFixed) return;
    const rel = relOf(img.getAttribute('src'));
    if (!rel) return;
    img.dataset.upFixed = '1';
    if (!cache.has(rel)) cache.set(rel, fetchBlob(rel).then(b => URL.createObjectURL(b)));
    cache.get(rel).then(u => { img.src = u; }).catch(() => { img.style.visibility = 'hidden'; });
  };
  const scan = (root) => {
    if (root.tagName === 'IMG') fixImg(root);
    root.querySelectorAll && root.querySelectorAll('img[src*="/uploads/"]').forEach(fixImg);
  };
  const start = () => {
    scan(document);
    new MutationObserver(recs => recs.forEach(r => {
      r.addedNodes.forEach(n => n.nodeType === 1 && scan(n));
      if (r.type === 'attributes' && r.target.tagName === 'IMG') { delete r.target.dataset.upFixed; fixImg(r.target); }
    })).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src'] });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();

/**
 * Back button (installed app / phone).
 *
 * A pop-up (month view, photo, checklist, ...), a day popover or the phone
 * menu is only a layer on the SAME page, so the browser has no history entry
 * for it. Pressing Back then leaves the page — and from the app's first page
 * that closes the whole app. Here every layer that opens adds one history
 * entry, and Back closes the top-most layer instead. Closing a layer with its
 * own Close / Cancel button (or by tapping outside it) removes its entry again,
 * so the history never fills up with leftovers.
 */
(function () {
  const LAYERS = '.modal-overlay, .daypop';
  const MENU = 'menu';                       // the phone menu (body.sidebar-open)
  const MARK = { hrmsLayer: 1 };
  const stack = [];                          // open layers, oldest first — each owns one history entry
  let ignore = 0;                            // history moves made by this code itself (not a Back press)
  let pendingNav = null, navTimer = null;

  const isOn = (l) => (l === MENU ? document.body.classList.contains('sidebar-open') : !!(l.isConnected && getComputedStyle(l).display !== 'none'));
  function liveLayers() {
    const on = [];
    document.querySelectorAll(LAYERS).forEach((el) => { if (isOn(el)) on.push(el); });
    if (isOn(MENU)) on.push(MENU);
    return on;
  }
  function push() { try { history.pushState(MARK, ''); } catch (e) {} }

  // Brings the history in line with the layers that are open right now.
  function sync() {
    const on = liveLayers();
    const closed = stack.filter((l) => !on.includes(l));
    const opened = on.filter((l) => !stack.includes(l));
    // One layer handing over to another in the same moment keeps its entry.
    while (closed.length && opened.length) stack[stack.indexOf(closed.shift())] = opened.shift();
    if (closed.length) {
      closed.forEach((l) => stack.splice(stack.indexOf(l), 1));
      ignore++;
      try { history.go(-closed.length); } catch (e) { ignore--; }
    }
    opened.forEach((l) => { stack.push(l); push(); });
  }

  // Closes a layer the way the page itself would: its outside-tap handler, then its Close / Cancel button.
  function close(l) {
    if (l === MENU) { document.body.classList.remove('sidebar-open'); return; }
    if (l.classList.contains('modal-overlay')) l.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    if (!isOn(l)) return;
    const b = [...l.querySelectorAll('button, a.btn')].find((x) => /^(close|cancel|done|not now|no|×|✕|✖|x)$/i.test((x.textContent || '').trim()) || (x.dataset && x.dataset.dp === 'x'));
    if (b) b.click();
    if (!isOn(l)) return;
    if (l.classList.contains('modal-overlay')) l.classList.remove('open'); else l.remove();
  }

  function go() {
    clearTimeout(navTimer);
    const h = pendingNav; pendingNav = null;
    if (h) location.href = h;
  }

  window.addEventListener('popstate', () => {
    if (ignore > 0) { ignore--; if (!ignore && pendingNav) go(); return; }
    const top = stack.pop();
    if (top === undefined) return;           // nothing of ours is open: an ordinary Back between pages
    close(top);
    if (isOn(top)) { stack.push(top); push(); }   // it would not close — keep its entry
    sync();                                  // layers that closed along with it
  });

  // Opening a page from the phone menu: drop the menu's entry first, so the new page sits right after this one.
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('.sidebar a[href], #sidebar a[href]');
    if (!a || !stack.includes(MENU) || e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || (a.target && a.target !== '_self')) return;
    const h = a.href || '';
    if (!/^https?:/i.test(h) || (a.hash && a.pathname === location.pathname && a.search === location.search)) return;
    e.preventDefault();
    pendingNav = h;
    document.body.classList.remove('sidebar-open');
    sync();
    clearTimeout(navTimer); navTimer = setTimeout(go, 500);   // safety: never get stuck on this page
  }, true);

  const relevant = (r) => {
    const t = r.target;
    if (t === document.body) return true;    // sidebar-open
    if (r.type === 'attributes') return !!(t.closest && t.closest(LAYERS));
    for (const n of [...r.addedNodes, ...r.removedNodes]) if (n.nodeType === 1 && (n.matches(LAYERS) || n.querySelector(LAYERS))) return true;
    return false;
  };
  const start = () => {
    // Landed on an entry this code added earlier (page reloaded, or came back from another page): step off it.
    if (history.state && history.state.hrmsLayer && !stack.length) { ignore++; try { history.back(); } catch (e) { ignore--; } }
    new MutationObserver((recs) => { if (recs.some(relevant)) sync(); })
      .observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
    sync();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();