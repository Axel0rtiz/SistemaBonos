//Proteger ruta: solo admin puede acceder
(function checkAdminAuth() {
  //Verifica que el usuario tenga un token de sesión
  const token = localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
  //Si no hay token, redirigir a login
  if (!token) { window.location.href = 'login.html'; return; }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    //Si la sesión expira, redirigir a login
    if (payload.exp && Date.now() >= payload.exp * 1000) { logout(); return; }
    //Si el rol no es admin, redirigir a index
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

//Obtener token de sesión
function getToken() {
  return localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
}

//Petición autenticada al API
async function apiRequest(url, options = {}) {
  //Se hace una petición al API
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  //Si la respuesta no es exitosa, se lanza un error
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
    const tabFilas = document.querySelector('#tabFilasCount');
    if (tabFilas) tabFilas.textContent = `${stats.filas ?? 0} F`;
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

  //Filtra los usuarios según la búsqueda y el rol
  const filtered = allUsers.filter(user => {
    const matchesSearch = !search ||
      user.nombre.toLowerCase().includes(search) ||
      user.correo.toLowerCase().includes(search);
    const matchesRol = !rolFilter || user.rol === rolFilter;
    return matchesSearch && matchesRol;
  });

  const showingText = document.querySelector('#showingUsersText');
  if (showingText) showingText.textContent = `Mostrando ${filtered.length} de ${allUsers.length} usuarios`;

  if (filtered.length === 0) {
    usersTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No se encontraron usuarios</td></tr>';
    return;
  }

  //Renderiza la tabla de usuarios
  usersTableBody.innerHTML = filtered.map((user, idx) => {
    const handle = `@${user.correo.split('@')[0]}`;
    const isSuperAdmin = user.rol === 'admin';
    const roleClass = isSuperAdmin ? 'role-super-admin' : 'role-editor-bonos';
    const roleLabel = isSuperAdmin ? 'Super Admin' : 'Editor / Bonos';
    const colorClass = `avatar-color-${(idx % 4) + 1}`;

    return `
      <tr>
        <td>
          <div class="user-cell">
            <span class="user-cell-avatar ${colorClass}">${escapeHtml(initials(user.nombre))}</span>
            <div class="user-cell-info">
              <strong>${escapeHtml(user.nombre)}</strong>
              <small>${escapeHtml(user.correo)}</small>
            </div>
          </div>
        </td>
        <td>
          <span class="user-login-badge">${escapeHtml(handle)}</span>
        </td>
        <td>
          <span class="user-role-badge ${roleClass}">${roleLabel}</span>
        </td>
        <td class="text-end">
          <div class="table-actions-group">
            <button class="action-icon-btn" title="Editar" data-edit="${user.id}">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="action-icon-btn text-danger" title="Eliminar" data-delete="${user.id}">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

//Abrir modal para agregar usuario
function openAddModal() {
  document.querySelector('#userModalLabel').textContent = 'Añadir Personal';
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
  document.querySelector('#userModalLabel').textContent = 'Editar Personal';
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
    //Si se proporciona contraseña, se agrega al body
    if (password) body.password = password;

    //Se guarda el usuario
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
    saveUserBtn.textContent = 'Guardar Personal';
  }
}

//Eliminar usuario
async function deleteUser(userId) {
  const user = allUsers.find(u => u.id === userId);
  if (!user) return;

  //Se confirma la eliminación del usuario
  if (!confirm(`¿Estás seguro de eliminar a "${user.nombre}"? Esta acción no se puede deshacer.`)) return;

  try {
    //Se elimina el usuario
    await apiRequest(`/api/admin/usuarios/${userId}`, { method: 'DELETE' });
    //Se recargan los usuarios
    await loadUsers();
    await loadStats();
  } catch (error) {
    alert(error.message);
  }
}

//Tabs
function switchTab(tabName) {
  //Si el tab es partidos, redirige a la página de partidos
  if (tabName === 'partidos') {
    window.location.href = 'partidosAdmin.html';
    return;
  }
  //Si el tab es filas, redirige a la página de filas
  if (tabName === 'filas') {
    window.location.href = 'filasPartidosAdmin.html';
    return;
  }
  //Se cambia al tab seleccionado
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
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

  //Toggle password visibility
  const togglePasswordBtn = document.querySelector('#togglePasswordBtn');
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const inputPass = document.querySelector('#inputPassword');
      const isPassword = inputPass.getAttribute('type') === 'password';
      inputPass.setAttribute('type', isPassword ? 'text' : 'password');
    });
  }

  //Editar y eliminar en la tabla
  usersTableBody.addEventListener('click', event => {
    const editBtn = event.target.closest('[data-edit]');
    if (editBtn) { openEditModal(Number(editBtn.dataset.edit)); return; }

    const deleteBtn = event.target.closest('[data-delete]');
    if (deleteBtn) { deleteUser(Number(deleteBtn.dataset.delete)); return; }
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
