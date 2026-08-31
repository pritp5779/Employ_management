/**
 * Injects the sidebar shell into any page with a <div id="sidebar"></div>.
 * Call renderSidebar('dashboard' | 'departments' | 'employees') after guardPage().
 */
function renderSidebar(active) {
  const user = api.currentUser() || { username: '', role: '' };
  const linkClass = (key) => (active === key ? 'active' : '');

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
      </nav>
      <div class="user-box">
        <span class="name">${user.username}</span>
        <span class="role">${user.role}</span>
        <button onclick="logout()">Log out</button>
      </div>
    </aside>
  `;
}
