/**
 * Injects the sidebar shell into any page with a <div id="sidebar"></div>.
 * Call renderSidebar('dashboard' | 'departments' | 'employees' | 'documents'
 *                     | 'history' | 'approvals' | 'users' | 'ex_employees') after guardPage().
 */
function renderSidebar(active) {
  const user = api.currentUser() || { username: '', role: '' };
  const linkClass = (key) => (active === key ? 'active' : '');
  const isAdmin = user.role === 'Admin';

  const adminLinks = isAdmin ? `
    <div class="nav-label">Admin</div>
    <a href="approvals.html" class="${linkClass('approvals')}">Approvals</a>
    <a href="users.html" class="${linkClass('users')}">Users</a>
  ` : '';

  document.getElementById('sidebar').outerHTML = `
    <aside class="sidebar">
      <div class="brand">HR<span>MS</span></div>
      <nav>
        <div class="nav-label">Main</div>
        <a href="dashboard.html" class="${linkClass('dashboard')}">Dashboard</a>
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

  // Mobile menu button + backdrop (hidden on desktop via CSS).
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