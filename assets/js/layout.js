/**
 * Injects the sidebar shell into any page with a <div id="sidebar"></div>.
 * Call renderSidebar('dashboard' | 'departments' | 'employees' | 'documents'
 *                     | 'history' | 'approvals' | 'users' | 'ex_employees') after guardPage().
 */
function renderSidebar(active) {
  const user = api.currentUser() || { username: '', role: '' };
  const linkClass = (key) => (active === key ? 'active' : '');
  const isAdmin = user.role === 'Admin';

  // The role saved at login can go stale when Admin changes it on the Users
  // page. me.flags returns the live role: store it and rebuild the page so
  // the new access applies without logging out and in.
  const syncRole = (d) => {
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
    attendance: [['attendance_admin.html', 'Attendance', 'attendance_admin']],
    punch: [['attendance.html', 'Punch In / Out', 'attendance']],
    targets: [['targets.html', 'Targets', 'targets']],
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
    commission_rules: [['commission_rules.html', 'Commission Rules', 'commission_rules']],
    agreements: [['agreements.html', 'Agreements', 'agreements']],
    decline_history: [['history.html', 'Decline History', 'history']],
    approvals: [['approvals.html', 'Approvals', 'approvals']],
    users: [
      ['users.html', 'Users', 'users'],
      ['roles.html', 'Roles', 'roles'],
    ],
  };

  if (user.role !== 'Admin' && user.role !== 'Employee') {
    // Custom role: sidebar built from its granted permissions.
    document.getElementById('sidebar').outerHTML = `
    <aside class="sidebar">
      <div class="brand">HR<span>MS</span></div>
      <nav id="customNav"><div class="nav-label">Menu</div></nav>
      <div class="user-box">
        <span class="name">${user.username}</span>
        <span class="role">${user.role}</span>
        <button onclick="logout()">Log out</button>
      </div>
    </aside>
  `;
    addMobileMenu();
    api.get('me.flags').then((d) => {
      if (syncRole(d)) return;
      const perms = d.permissions || [];
      // If the current page isn't allowed for this role, go to their first
      // allowed page instead (e.g. login lands on Dashboard by default).
      const activePerm = Object.keys(PAGES_FOR_PERM).find(p => PAGES_FOR_PERM[p].some(d => d[2] === active));
      if (perms.length && activePerm && !perms.includes(activePerm)) {
        window.location.replace(PAGES_FOR_PERM[perms[0]][0][0]);
        return;
      }
      const nav = document.getElementById('customNav');
      if (!nav) return;
      perms.forEach((p) => {
        (PAGES_FOR_PERM[p] || []).forEach((def) => {
          nav.insertAdjacentHTML('beforeend', `<a href="${def[0]}" class="${active === def[2] ? 'active' : ''}">${def[1]}</a>`);
        });
      });
      if (perms.length === 0) {
        nav.insertAdjacentHTML('beforeend', '<span style="display:block; padding:8px 20px; font-size:12.5px; color:#8a93a6;">No access granted yet — ask Admin.</span>');
      }
    }).catch((err) => {
      const nav = document.getElementById('customNav');
      if (nav) nav.insertAdjacentHTML('beforeend', `<span style="display:block; padding:8px 20px; font-size:12px; color:#e08585;">Menu failed to load: ${err.message}</span>`);
    });
    return;
  }

  if (user.role === 'Employee') {
    // Pages every employee may open. Anything else is hidden immediately —
    // before its own script can show admin data — until me.flags confirms
    // the Employee role was granted that module on the Roles page.
    const EMPLOYEE_PAGES = ['attendance', 'my_salary', 'my_agreements', 'my_sales', 'orders'];
    const needsCheck = !EMPLOYEE_PAGES.includes(active);
    if (needsCheck) document.documentElement.style.visibility = 'hidden';

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
      </div>
    </aside>
  `;
    addMobileMenu();

    api.get('me.flags').then((d) => {
      if (syncRole(d)) return;
      const perms = d.permissions || [];
      const grantedActives = perms.flatMap(p => (PAGES_FOR_PERM[p] || []).map(def => def[2]));
      const allowed = ['attendance', 'my_salary', 'my_agreements'].concat(grantedActives);
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
        <a href="my_agreements.html" class="${linkClass('my_agreements')}">My Agreements</a>`;
        // Admin-side pages granted to the Employee role via Roles page.
        if (perms.length) {
          links += `
        <div class="nav-label">More</div>`;
          perms.forEach((p) => {
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
      ['attendance_admin.html', 'Attendance', 'attendance_admin'],
      ['targets.html', 'Targets', 'targets'],
      ['performance.html', 'Performance', 'performance'],
      ['assign_queries.html', 'Assign Queries', 'assign_queries'],
      ['salary.html', 'Salary', 'salary'],
      ['commission_rules.html', 'Commission Rules', 'commission_rules'],
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
      </div>
    </aside>
  `;

  addMobileMenu();
  initNavCategories(categories, active);

  if (isAdmin) {
    api.get('me.flags').then(syncRole).catch(() => {});
    api.get('approvals.count').then((d) => {
      const badge = document.getElementById('approvalBadge');
      if (badge && d.count > 0) {
        badge.textContent = d.count;
        badge.style.display = 'inline-block';
      }
    }).catch(() => {});
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
 *  - clicking a link into /uploads/ fetches the file with the login token
 *    and opens it in a new tab;
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
  document.addEventListener('click', async (e) => {
    const a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const rel = relOf(a.getAttribute('href'));
    if (!rel) return;
    e.preventDefault();

    // Open the tab now, inside the click, so popup blockers allow it.
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