/**
 * Injects the sidebar shell into any page with a <div id="sidebar"></div>.
 * Call renderSidebar('dashboard' | 'departments' | 'employees' | 'documents'
 *                     | 'history' | 'approvals' | 'users' | 'ex_employees') after guardPage().
 */
function renderSidebar(active) {
  const user = api.currentUser() || { username: '', role: '' };
  const linkClass = (key) => (active === key ? 'active' : '');
  const isAdmin = user.role === 'Admin';

  // Each permission can unlock one or more pages.
  const PAGES_FOR_PERM = {
    dashboard: [['dashboard.html', 'Dashboard', 'dashboard']],
    orders: [['orders.html', 'Shopify Orders', 'orders']],
    attendance: [['attendance_admin.html', 'Attendance', 'attendance_admin']],
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
    assign_queries: [['assign_queries.html', 'Assign Query', 'assign_query']],
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
      const perms = d.permissions || [];
      // If the current page isn't allowed for this role, go to their first
      // allowed page instead (e.g. login lands on Dashboard by default).
      const activePerm = Object.keys(PAGES_FOR_PERM).find(p => PAGES_FOR_PERM[p].some(d => d[2] === active));
      if (perms.length && activePerm && !perms.includes(activePerm)) {
        window.location.href = PAGES_FOR_PERM[perms[0]][0][0];
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
      const perms = d.permissions || [];
      const grantedActives = perms.flatMap(p => (PAGES_FOR_PERM[p] || []).map(def => def[2]));
      const allowed = ['attendance', 'my_salary', 'my_agreements'].concat(grantedActives);
      if (d.is_sales) allowed.push('my_sales', 'orders');
      if (!allowed.includes(active)) { window.location.href = 'attendance.html'; return; }
      if (!d.has_salary && active === 'my_salary') { window.location.href = 'attendance.html'; return; }

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
    }).catch(() => {});
    return;
  }

  const adminLinks = isAdmin ? `
    <div class="nav-label">Admin</div>
    <a href="approvals.html" class="${linkClass('approvals')}">Approvals <span id="approvalBadge" style="display:none; background:#e02424; color:#fff; border-radius:10px; padding:1px 7px; font-size:11px; font-weight:700; margin-left:6px;"></span></a>
    <a href="users.html" class="${linkClass('users')}">Users</a>
        <a href="roles.html" class="${linkClass('roles')}">Roles</a>
  ` : '';

  document.getElementById('sidebar').outerHTML = `
    <aside class="sidebar">
      <div class="brand">HR<span>MS</span></div>
      <nav>
        <div class="nav-label">Main</div>
        <a href="dashboard.html" class="${linkClass('dashboard')}">Dashboard</a>
        <a href="orders.html" class="${linkClass('orders')}">Shopify Orders</a>
        <a href="attendance_admin.html" class="${linkClass('attendance_admin')}">Attendance</a>
        <a href="targets.html" class="${linkClass('targets')}">Targets</a>
        <a href="performance.html" class="${linkClass('performance')}">Performance</a>
        <a href="assign_queries.html" class="${linkClass('assign_queries')}">Assign Query</a>
        <a href="salary.html" class="${linkClass('salary')}">Salary</a>
        <a href="commission_rules.html" class="${linkClass('commission_rules')}">Commission Rules</a>
        <a href="agreements.html" class="${linkClass('agreements')}">Agreements</a>
        <div class="nav-label">Masters</div>
        <a href="departments.html" class="${linkClass('departments')}">Departments</a>
        <div class="nav-label">People</div>
        <a href="employees.html" class="${linkClass('employees')}">Employees</a>
        <a href="documents.html" class="${linkClass('documents')}">Documents</a>
        <a href="whatsapp_groups.html" class="${linkClass('whatsapp_groups')}">WhatsApp Groups</a>
        <a href="excel_files.html" class="${linkClass('excel_files')}">Excel Files</a>
        <a href="ex_employees.html" class="${linkClass('ex_employees')}">Ex-Employees</a>
        <a href="history.html" class="${linkClass('history')}">Decline History</a>
        ${adminLinks}
      </nav>
      <div class="user-box">
        <span class="name">${user.username}</span>
        <span class="role">${user.role}</span>
        <button onclick="logout()">Log out</button>
      </div>
    </aside>
  `;

  addMobileMenu();

  if (isAdmin) {
    api.get('approvals.count').then((d) => {
      const badge = document.getElementById('approvalBadge');
      if (badge && d.count > 0) {
        badge.textContent = d.count;
        badge.style.display = 'inline-block';
      }
    }).catch(() => {});
  }
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