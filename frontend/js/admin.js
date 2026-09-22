//Proteger ruta: solo admin puede acceder
(function checkAdminAuth() {
  const token = localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
  if (!token) { window.location.href = 'login.html'; return; }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) { logout(); return; }
    if (payload.rol !== 'admin') { window.location.href = 'index.html'; return; }
  } catch (e) { logout(); }
})();

//DOM
const themeToggle = document.querySelector('#themeToggle');
const logoutBtn = document.querySelector('#logoutBtn');
const adminName = document.querySelector('#adminName');
const userAvatar = document.querySelector('#userAvatar');
const usersTableBody = document.querySelector('#usersTableBody');
const searchUsers = document.querySelector('#searchUsers');
const filterRol = document.querySelector('#filterRol');
const btnAddUser = document.querySelector('#btnAddUser');
const saveUserBtn = document.querySelector('#saveUserBtn');
const userModalElement = document.querySelector('#userModal');
const userModal = new bootstrap.Modal(userModalElement);

let allUsers = [];

//Token
function getToken() {
  return localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
}

//Petición autenticada al API
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    logout();
    throw new Error('Sesión expirada o acceso denegado');
  }
  if (!response.ok) throw new Error(data.message || 'Error del servidor');
  return data;
}

//Escapar HTML para prevenir XSS
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

//Obtener iniciales del nombre
function initials(name) {
  return (name || 'NA').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

//Cargar estadísticas del sistema
async function loadStats() {
  try {
    const stats = await apiRequest('/api/admin/estadisticas');
    document.querySelector('#statUsuarios').textContent = stats.usuarios;
    document.querySelector('#statPartidos').textContent = stats.partidos;
    document.querySelector('#statFilas').textContent = stats.filas;
    document.querySelector('#tabUsuariosCount').textContent = stats.usuarios;
    document.querySelector('#tabPartidosCount').textContent = stats.partidos + ' J';
  } catch (error) {
    console.error('Error al cargar estadísticas:', error);
  }
}

//Cargar lista de usuarios
async function loadUsers() {
  try {
    allUsers = await apiRequest('/api/admin/usuarios');
    document.querySelector('#badgeActivos').textContent = `${allUsers.length} registrados`;
    renderUsers();
  } catch (error) {
    usersTableBody.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-danger">${escapeHtml(error.message)}</td></tr>`;
  }
}

//Renderizar tabla de usuarios con filtros aplicados
function renderUsers() {
  const search = searchUsers.value.trim().toLowerCase();
  const rolFilter = filterRol.value;

  const filtered = allUsers.filter(user => {
    const matchesSearch = !search ||
      user.nombre.toLowerCase().includes(search) ||
      user.correo.toLowerCase().includes(search);
    const matchesRol = !rolFilter || user.rol === rolFilter;
    return matchesSearch && matchesRol;
  });

  if (filtered.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4">No se encontraron usuarios</td></tr>';
    return;
  }

  usersTableBody.innerHTML = filtered.map(user => `
    <tr>
      <td>
        <div class="user-cell">
          <span class="user-cell-avatar">${escapeHtml(initials(user.nombre))}</span>
          <div class="user-cell-info">
            <strong>${escapeHtml(user.nombre)}</strong>
            <small>${escapeHtml(user.correo)}</small>
          </div>
        </div>
      </td>
      <td>${escapeHtml(user.correo)}</td>
      <td><span class="role-badge role-${escapeHtml(user.rol)}">${user.rol === 'admin' ? 'Super Admin' : 'Editor / Bonos'}</span></td>
      <td>
        <div class="action-btns">
          <button class="action-btn" title="Editar" data-edit="${user.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293z"/></svg>
          </button>
          <button class="action-btn delete" title="Eliminar" data-delete="${user.id}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H5.5l1-1h3l1 1H14a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4z"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

//Abrir modal para agregar usuario
function openAddModal() {
  document.querySelector('#userModalLabel').textContent = 'Añadir Usuario';
  document.querySelector('#editUserId').value = '';
  document.querySelector('#inputNombre').value = '';
  document.querySelector('#inputCorreo').value = '';
  document.querySelector('#inputPassword').value = '';
  document.querySelector('#inputRol').value = 'editor';
  document.querySelector('#passwordHelp').textContent = 'Mínimo 6 caracteres';
  document.querySelector('#inputPassword').required = true;
  userModal.show();
}

//Abrir modal para editar usuario
function openEditModal(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;
  document.querySelector('#userModalLabel').textContent = 'Editar Usuario';
  document.querySelector('#editUserId').value = user.id;
  document.querySelector('#inputNombre').value = user.nombre;
  document.querySelector('#inputCorreo').value = user.correo;
  document.querySelector('#inputPassword').value = '';
  document.querySelector('#inputRol').value = user.rol;
  document.querySelector('#passwordHelp').textContent = 'Dejar vacío para mantener la contraseña actual';
  document.querySelector('#inputPassword').required = false;
  userModal.show();
}

//Guardar usuario (crear o actualizar)
async function saveUser() {
  const editId = document.querySelector('#editUserId').value;
  const nombre = document.querySelector('#inputNombre').value.trim();
  const correo = document.querySelector('#inputCorreo').value.trim();
  const password = document.querySelector('#inputPassword').value;
  const rol = document.querySelector('#inputRol').value;

  if (!nombre || !correo) {
    alert('Nombre y correo son requeridos');
    return;
  }

  if (!editId && password.length < 6) {
    alert('La contraseña debe tener al menos 6 caracteres');
    return;
  }

  saveUserBtn.disabled = true;
  saveUserBtn.textContent = 'Guardando...';

  try {
    const body = { nombre, correo, rol };
    if (password) body.password = password;

    if (editId) {
      await apiRequest(`/api/admin/usuarios/${editId}`, { method: 'PATCH', body: JSON.stringify(body) });
    } else {
      await apiRequest('/api/admin/usuarios', { method: 'POST', body: JSON.stringify(body) });
    }

    userModal.hide();
    await loadUsers();
    await loadStats();
  } catch (error) {
    alert(error.message);
  } finally {
    saveUserBtn.disabled = false;
    saveUserBtn.textContent = 'Guardar';
  }
}

//Eliminar usuario
async function deleteUser(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  if (!confirm(`¿Estás seguro de eliminar a "${user.nombre}"? Esta acción no se puede deshacer.`)) return;

  try {
    await apiRequest(`/api/admin/usuarios/${userId}`, { method: 'DELETE' });
    await loadUsers();
    await loadStats();
  } catch (error) {
    alert(error.message);
  }
}

//Tabs
function switchTab(tabName) {
  if (tabName === 'partidos') {
    window.location.href = 'partidosAdmin.html';
    return;
  }
  if (tabName === 'filas') {
    window.location.href = 'filasPartidosAdmin.html';
    return;
  }
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
  document.querySelector('#panelUsuarios').classList.toggle('d-none', tabName !== 'usuarios');
  document.querySelector('#panelPartidos').classList.toggle('d-none', tabName !== 'partidos');
  document.querySelector('#panelFilas').classList.toggle('d-none', tabName !== 'filas');
}

//Eventos
function bindEvents() {
  //Tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  //Buscar y filtrar
  searchUsers.addEventListener('input', renderUsers);
  filterRol.addEventListener('change', renderUsers);

  //Agregar usuario
  btnAddUser.addEventListener('click', openAddModal);
  saveUserBtn.addEventListener('click', saveUser);

  //Editar y eliminar en la tabla
  usersTableBody.addEventListener('click', event => {
    const editBtn = event.target.closest('[data-edit]');
    if (editBtn) openEditModal(Number(editBtn.dataset.edit));

    const deleteBtn = event.target.closest('[data-delete]');
    if (deleteBtn) deleteUser(Number(deleteBtn.dataset.delete));
  });

  //Tema claro/oscuro
  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', next);
    localStorage.setItem('bonos-theme', next);
    themeToggle.textContent = next === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
  });

  //Cerrar sesión
  logoutBtn.addEventListener('click', logout);
}

//Cerrar sesión
function logout() {
  localStorage.removeItem('bonos-token');
  sessionStorage.removeItem('bonos-token');
  localStorage.removeItem('bonos-user');
  sessionStorage.removeItem('bonos-user');
  window.location.href = 'login.html';
}

//Inicializar datos del usuario en la navbar
function initUser() {
  try {
    const raw = localStorage.getItem('bonos-user') || sessionStorage.getItem('bonos-user');
    const user = raw && JSON.parse(raw);
    if (user) {
      adminName.textContent = user.nombre || 'Admin';
      userAvatar.textContent = initials(user.nombre);
    }
  } catch (e) {}
}

//Inicializar tema
function initTheme() {
  const saved = localStorage.getItem('bonos-theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', saved);
  themeToggle.textContent = saved === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
}

//Inicialización
initTheme();
initUser();
bindEvents();
loadStats();
loadUsers();
