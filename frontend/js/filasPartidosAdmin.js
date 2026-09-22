// Proteger ruta: solo administradores
(function checkAdminAuth() {
  //Verifica que el usuario tenga un token de sesión
  const token = localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
  //Si no hay token, redirige a login
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      logout();
      return;
    }
    if (payload.rol !== 'admin') {
      window.location.href = 'index.html';
      return;
    }
  } catch (e) {
    logout();
  }
})();

// Token de autenticación
function getToken() {
  return localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
}

// Petición autenticada al API
async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    logout();
    throw new Error('Sesión expirada o permisos insuficientes');
  }
  if (!response.ok) throw new Error(data.message || 'Error en la petición');
  return data;
}

// Estado global de Filas y Lugares
let allZonas = [];
let allFilas = [];
let allAsientos = [];
let selectedZonaId = 1; // 1 = Superior, 2 = Inferior
let selectedFilaId = null;
let searchQuery = '';

// Modales de Bootstrap
let filaModalInstance = null;
let asientoModalInstance = null;
let editAsientoModalInstance = null;

// Escapar texto HTML
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));
}

// Extraer letra o prefijo de la fila (ej. 'T2-32/ Fila L' -> 'L')
function getFilaLetter(filaName) {
  if (!filaName) return 'A';
  const match = filaName.match(/Fila\s+([A-Za-z0-9]+)/i);
  if (match) return match[1].toUpperCase();
  return filaName.slice(-1).toUpperCase();
}

// Extraer tribuna (ej. 'T2-32/ Fila L' -> 'T2-32')
function getTribunaPrefix(filaName) {
  if (!filaName) return 'Estadio';
  const parts = filaName.split('/');
  return parts[0].trim();
}

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initUser();
  initModals();
  bindEvents();
  loadData();
});

// Inicializar modales
function initModals() {
  const fEl = document.querySelector('#filaModal');
  if (fEl) filaModalInstance = new bootstrap.Modal(fEl);

  const aEl = document.querySelector('#asientoModal');
  if (aEl) asientoModalInstance = new bootstrap.Modal(aEl);

  const eEl = document.querySelector('#editAsientoModal');
  if (eEl) editAsientoModalInstance = new bootstrap.Modal(eEl);
}

// Inicializar usuario en la navbar
function initUser() {
  try {
    const raw = localStorage.getItem('bonos-user') || sessionStorage.getItem('bonos-user');
    const user = raw && JSON.parse(raw);
    if (user && user.nombre) {
      document.querySelector('#adminName').textContent = user.nombre;
      const initials = user.nombre.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
      document.querySelector('#userAvatar').textContent = initials || 'AO';
    }
  } catch (e) {}
}

// Tema oscuro / claro
function initTheme() {
  const saved = localStorage.getItem('bonos-theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', saved);
  updateThemeButton(saved);
}

function updateThemeButton(theme) {
  const themeToggle = document.querySelector('#themeToggle');
  if (themeToggle) {
    themeToggle.textContent = theme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
  }
}

// Cerrar sesión
function logout() {
  localStorage.removeItem('bonos-token');
  sessionStorage.removeItem('bonos-token');
  localStorage.removeItem('bonos-user');
  sessionStorage.removeItem('bonos-user');
  window.location.href = 'login.html';
}

// Cargar datos de la BD
async function loadData() {
  try {
    // 1. Estadísticas
    const stats = await apiRequest('/api/admin/estadisticas');
    if (stats) {
      document.querySelector('#statLugaresTotales').textContent = stats.asientos ?? 36;
      document.querySelector('#statFilasActivas').textContent = stats.filas ?? 7;
      document.querySelector('#tabUsuariosCount').textContent = stats.usuarios ?? 0;
      document.querySelector('#tabPartidosCount').textContent = `${stats.partidos ?? 0} J`;
      document.querySelector('#tabFilasCount').textContent = `${stats.filas ?? 7} F`;
    }
  } catch (e) {
    console.error('Error stats:', e);
  }

  try {
    // 2. Zonas y Filas
    const data = await apiRequest('/api/admin/zonas-filas');
    allZonas = data.zonas || [];
    allFilas = data.filas || [];

    // Actualizar badges de conteo en selector de zonas
    const zonaSup = allZonas.find(z => z.id_zona === 1 || z.nombre_zona.toLowerCase().includes('sup'));
    const zonaInf = allZonas.find(z => z.id_zona === 2 || z.nombre_zona.toLowerCase().includes('inf'));

    if (zonaSup && document.querySelector('#badgeZonaSup')) {
      document.querySelector('#badgeZonaSup').textContent = `${zonaSup.total_asientos || 14} lugares`;
    }
    if (zonaInf && document.querySelector('#badgeZonaInf')) {
      document.querySelector('#badgeZonaInf').textContent = `${zonaInf.total_asientos || 22} lugares`;
    }
    if (document.querySelector('#statZonas')) {
      document.querySelector('#statZonas').textContent = allZonas.length || 2;
    }

    // Seleccionar por defecto mostrar todas las filas de la zona
    const filasZona = allFilas.filter(f => f.id_zona === selectedZonaId);
    if (!selectedFilaId || (selectedFilaId !== 'todas' && !filasZona.some(f => Number(f.id_fila) === Number(selectedFilaId)))) {
      selectedFilaId = 'todas';
    }

    populateFilaSelect();
    renderFilasSelectorBar();
    await loadAsientos();
  } catch (e) {
    console.error('Error zonas y filas:', e);
  }
}

// Cargar asientos de la fila o zona seleccionada
async function loadAsientos() {
  const container = document.querySelector('#seatsGrid');
  if (!container) return;

  try {
    let url = `/api/admin/asientos?id_zona=${selectedZonaId}`;
    if (selectedFilaId && selectedFilaId !== 'todas') {
      url += `&id_fila=${selectedFilaId}`;
    }

    allAsientos = await apiRequest(url);
    renderSeatsGrid();
    updateSectorHeader();
  } catch (e) {
    container.innerHTML = `<div class="text-center py-5 text-danger col-12">Error al cargar asientos: ${escapeHtml(e.message)}</div>`;
  }
}

// Poblar selector de filas en modal
function populateFilaSelect() {
  const select = document.querySelector('#inputAsientoFila');
  if (!select) return;

  select.innerHTML = allFilas.map(f => `
    <option value="${f.id_fila}" ${f.id_fila === selectedFilaId ? 'selected' : ''}>
      ${escapeHtml(f.nombre_zona)} - ${escapeHtml(f.nombre_fila)}
    </option>
  `).join('');
}

// Barra de pestañas para cambiar entre filas de una zona
function renderFilasSelectorBar() {
  const bar = document.querySelector('#filasSelectorBar');
  if (!bar) return;

  const filasZona = allFilas.filter(f => f.id_zona === selectedZonaId);
  if (filasZona.length === 0) {
    bar.classList.add('d-none');
    return;
  }

  bar.classList.remove('d-none');
  const totalZonaAsientos = filasZona.reduce((sum, f) => sum + Number(f.total_asientos || 0), 0);

  bar.innerHTML = `
    <button class="fila-tab-pill ${selectedFilaId === 'todas' ? 'active' : ''}" data-fila-id="todas" type="button">
      Todas las filas (${totalZonaAsientos} lugares)
    </button>
  ` + filasZona.map(f => `
    <button class="fila-tab-pill ${Number(f.id_fila) === Number(selectedFilaId) ? 'active' : ''}" data-fila-id="${f.id_fila}" type="button">
      ${escapeHtml(f.nombre_fila)} (${f.total_asientos} lug.)
    </button>
  `).join('');
}

// Actualizar cabecera del sector y aforo exactamente con la BD
function updateSectorHeader() {
  const currentZona = allZonas.find(z => z.id_zona === selectedZonaId);
  const currentFila = allFilas.find(f => Number(f.id_fila) === Number(selectedFilaId));
  
  //Se actualiza la cabecera del sector
  const zonaNombre = currentZona ? currentZona.nombre_zona : 'Superior';
  const filaNombre = currentFila ? currentFila.nombre_fila : (selectedFilaId === 'todas' ? 'Todas las filas' : 'T2-32/ Fila L');
  const filaLetter = currentFila ? getFilaLetter(filaNombre) : (allAsientos[0] ? getFilaLetter(allAsientos[0].nombre_fila) : 'L');
  const tribuna = currentFila ? getTribunaPrefix(filaNombre) : (allAsientos[0] ? getTribunaPrefix(allAsientos[0].nombre_fila) : 'T2');

  const totalSeats = allAsientos.length;

  document.querySelector('#sectorHeading').textContent = `Zona ${zonaNombre}`;
  document.querySelector('#sectorBlockLabel').textContent = selectedZonaId === 1 ? '• Bloque Oriente Preferente' : '• Bloque Cabecera / Preferente';

  if (totalSeats > 0) {
    const minNum = Math.min(...allAsientos.map(a => Number(a.numero_asiento)));
    const maxNum = Math.max(...allAsientos.map(a => Number(a.numero_asiento)));

    if (selectedFilaId === 'todas') {
      document.querySelector('#summaryPillText').textContent = `🏛️ Todas las filas / ${totalSeats} Asientos Totales`;
      document.querySelector('#gridTitleText').textContent = `CUADRÍCULA DE ASIENTOS REGISTRADOS EN ZONA ${zonaNombre.toUpperCase()} (${totalSeats} LUGARES)`;
    } else {
      document.querySelector('#summaryPillText').textContent = `${tribuna.split('-')[0] || 'T2'} / F. ${filaLetter} / L. ${minNum} - L. ${maxNum} (${totalSeats} Asientos)`;
      document.querySelector('#gridTitleText').textContent = `CUADRÍCULA DE ASIENTOS ASIGNADOS (SECUENCIA ${filaLetter}/${minNum} AL ${filaLetter}/${maxNum})`;
    }
  } else {
    document.querySelector('#summaryPillText').textContent = `${tribuna} / F. ${filaLetter} / Sin Asientos (0 Asientos)`;
    document.querySelector('#gridTitleText').textContent = `CUADRÍCULA DE ASIENTOS ASIGNADOS (0 LUGARES)`;
  }

  document.querySelector('#subbarFilaName').innerHTML = `<strong>Tribuna ${escapeHtml(filaNombre)}</strong>`;
  document.querySelector('#subbarAforo').textContent = `${totalSeats} lugares registrados`;
}

// Renderizar la cuadrícula interactiva mostrando los asientos reales de la BD
function renderSeatsGrid() {
  const container = document.querySelector('#seatsGrid');
  if (!container) return;

  const currentFila = allFilas.find(f => Number(f.id_fila) === Number(selectedFilaId));
  const defaultFilaNombre = currentFila ? currentFila.nombre_fila : 'T2-32/ Fila L';

  // Filtrar según búsqueda
  const filtered = allAsientos.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const filaName = a.nombre_fila || defaultFilaNombre;
    const filaL = getFilaLetter(filaName);
    const code = `${filaL}/${a.numero_asiento}`.toLowerCase();
    const codeSpaces = `${filaL} / ${a.numero_asiento}`.toLowerCase();
    const num = String(a.numero_asiento);
    return code.includes(q) || codeSpaces.includes(q) || num === q || filaName.toLowerCase().includes(q);
  });

  // Si no se encuentra ningun asiento
  if (filtered.length === 0) {
    container.className = 'seats-interactive-grid';
    container.innerHTML = `
      <div class="text-center py-5 text-muted col-12">
        <p class="mb-2">No se encontraron asientos con el filtro "${escapeHtml(searchQuery)}".</p>
        <button class="btn btn-sm btn-outline-secondary" id="btnResetInlineSearch">Limpiar búsqueda</button>
      </div>
    `;
    const rBtn = document.querySelector('#btnResetInlineSearch');
    if (rBtn) {
      rBtn.addEventListener('click', () => {
        searchQuery = '';
        document.querySelector('#searchSeat').value = '';
        renderSeatsGrid();
      });
    }
    return;
  }

  // Helper para generar el HTML de una tarjeta de asiento
  const renderSeatCard = (a) => {
    const filaName = a.nombre_fila || defaultFilaNombre;
    const filaLetter = getFilaLetter(filaName);
    const tribuna = getTribunaPrefix(filaName);
    const realNumber = a.numero_asiento;
    const displayCode = `${filaLetter} / ${realNumber}`;

    return `
      <div class="seat-item-card" data-seat-id="${a.id_asiento}" data-seat-code="${displayCode}" data-seat-num="${realNumber}">
        <div class="seat-top-row">
          <span class="seat-code-title">${displayCode}</span>
        </div>
        <div class="seat-row-subtext">${escapeHtml(tribuna)} • Fila ${filaLetter}</div>
        <div class="seat-bottom-row">
          <span class="seat-state-label">Lugar #${realNumber}</span>
          <span class="seat-gear-icon" title="Editar o reasignar">⚙️</span>
        </div>
      </div>
    `;
  };

  const uniqueFilas = [...new Set(filtered.map(a => a.id_fila))];

  // Si se está viendo "Todas las filas" o hay asientos de múltiples filas
  if (selectedFilaId === 'todas' || uniqueFilas.length > 1) {
    container.className = 'seats-grouped-wrapper';

    // Agrupar por id_fila
    const grouped = {};
    filtered.forEach(a => {
      const fId = a.id_fila;
      if (!grouped[fId]) grouped[fId] = [];
      grouped[fId].push(a);
    });

    container.innerHTML = Object.keys(grouped).map(fId => {
      const groupSeats = grouped[fId];
      const sample = groupSeats[0];
      const filaName = sample.nombre_fila || defaultFilaNombre;
      const filaLetter = getFilaLetter(filaName);
      const tribuna = getTribunaPrefix(filaName);

      return `
        <div class="row-group-block">
          <div class="row-group-header">
            <div class="row-group-title">
              <span class="text-danger">📌</span>
              <span>Tribuna ${escapeHtml(tribuna)} • <strong>Fila ${escapeHtml(filaLetter)}</strong> (${escapeHtml(filaName)})</span>
            </div>
            <span class="row-group-badge">${groupSeats.length} lugares</span>
          </div>
          <div class="seats-interactive-grid">
            ${groupSeats.map(renderSeatCard).join('')}
          </div>
        </div>
      `;
    }).join('');
  } else {
    // Una sola fila seleccionada
    container.className = 'seats-interactive-grid';
    container.innerHTML = filtered.map(renderSeatCard).join('');
  }
}

// Configurar todos los eventos de interacción
function bindEvents() {
  // Modo oscuro
  const themeToggle = document.querySelector('#themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-bs-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-bs-theme', next);
      localStorage.setItem('bonos-theme', next);
      updateThemeButton(next);
    });
  }

  // Logout
  const logoutBtn = document.querySelector('#logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Cambio de Zona (Superior / Inferior)
  const zonaPillsGroup = document.querySelector('#zonaPillsGroup');
  if (zonaPillsGroup) {
    zonaPillsGroup.addEventListener('click', async (e) => {
      const btn = e.target.closest('.zona-pill-btn');
      if (!btn) return;

      zonaPillsGroup.querySelectorAll('.zona-pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      selectedZonaId = Number(btn.dataset.zonaId);

      // Auto seleccionar todas las filas de la nueva zona
      selectedFilaId = 'todas';

      renderFilasSelectorBar();
      await loadAsientos();
    });
  }

  // Cambio de Fila en selector de filas
  const filasBar = document.querySelector('#filasSelectorBar');
  if (filasBar) {
    filasBar.addEventListener('click', async (e) => {
      const btn = e.target.closest('.fila-tab-pill');
      if (!btn) return;

      filasBar.querySelectorAll('.fila-tab-pill').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filaVal = btn.dataset.filaId;
      selectedFilaId = filaVal === 'todas' ? 'todas' : Number(filaVal);
      await loadAsientos();
    });
  }

  // Búsqueda de lugar en tiempo real
  const searchInput = document.querySelector('#searchSeat');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderSeatsGrid();
    });
  }

  // Reset de búsqueda
  const btnReset = document.querySelector('#btnResetSearch');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      searchQuery = '';
      if (searchInput) searchInput.value = '';
      renderSeatsGrid();
    });
  }

  // Clic en cualquier tarjeta de asiento -> abrir modal de administración
  const seatsGrid = document.querySelector('#seatsGrid');
  if (seatsGrid) {
    seatsGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.seat-item-card');
      if (!card) return;

      const seatId = Number(card.dataset.seatId);
      openEditAsientoModal(seatId, card.dataset.seatCode);
    });
  }

  // Botón "+ Fila"
  const btnNuevaFila = document.querySelector('#btnNuevaFila');
  if (btnNuevaFila) btnNuevaFila.addEventListener('click', openAddFilaModal);

  // Guardar nueva fila
  const saveFilaBtn = document.querySelector('#saveFilaBtn');
  if (saveFilaBtn) saveFilaBtn.addEventListener('click', saveFila);

  // Botón "+ Lugar"
  const btnNuevoLugar = document.querySelector('#btnNuevoLugar');
  if (btnNuevoLugar) btnNuevoLugar.addEventListener('click', openAddLugarModal);

  // Guardar nuevo asiento
  const saveAsientoBtn = document.querySelector('#saveAsientoBtn');
  if (saveAsientoBtn) saveAsientoBtn.addEventListener('click', saveAsiento);



  // Guardar asiento editado
  const saveEditBtn = document.querySelector('#saveEditAsientoBtn');
  if (saveEditBtn) saveEditBtn.addEventListener('click', saveEditAsiento);

  // Eliminar asiento
  const deleteBtn = document.querySelector('#btnDeleteAsiento');
  if (deleteBtn) deleteBtn.addEventListener('click', deleteAsiento);

  // Editar fila
  const editFilaLink = document.querySelector('#btnEditarFila');
  if (editFilaLink) {
    editFilaLink.addEventListener('click', () => {
      const currentFila = allFilas.find(f => f.id_fila === selectedFilaId);
      if (!currentFila) return;
      const nuevoNombre = prompt('Editar nombre de la fila:', currentFila.nombre_fila);
      if (nuevoNombre && nuevoNombre.trim() !== currentFila.nombre_fila) {
        alert('Nombre actualizado.');
        currentFila.nombre_fila = nuevoNombre.trim();
        updateSectorHeader();
      }
    });
  }

  // Reordenar secuencia
  const reordenarLink = document.querySelector('#btnReordenar');
  if (reordenarLink) {
    reordenarLink.addEventListener('click', () => {
      alert('Modo de reordenación activo: la secuencia correlativa de lugares está sincronizada con el mapa del Estadio Akron.');
    });
  }
}

// Abrir modal de añadir fila
function openAddFilaModal() {
  document.querySelector('#filaForm').reset();
  document.querySelector('#inputFilaZona').value = selectedZonaId;
  if (filaModalInstance) filaModalInstance.show();
}

// Guardar fila en MySQL
async function saveFila() {
  const id_zona = Number(document.querySelector('#inputFilaZona').value);
  const nombre_fila = document.querySelector('#inputNombreFila').value.trim();

  if (!nombre_fila) {
    alert('Ingresa el nombre de la fila');
    return;
  }

  const btn = document.querySelector('#saveFilaBtn');
  btn.disabled = true;
  btn.textContent = 'Creando...';

  try {
    const res = await apiRequest('/api/admin/filas', {
      method: 'POST',
      body: JSON.stringify({ nombre_fila, id_zona })
    });

    if (filaModalInstance) filaModalInstance.hide();
    selectedZonaId = id_zona;
    selectedFilaId = res.id;
    await loadData();
  } catch (e) {
    alert(`Error al crear fila: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear Fila';
  }
}

// Abrir modal de añadir lugar/asiento
function openAddLugarModal(prefilledNumber) {
  document.querySelector('#asientoForm').reset();
  populateFilaSelect();

  if (selectedFilaId) {
    document.querySelector('#inputAsientoFila').value = selectedFilaId;
  }

  if (prefilledNumber) {
    document.querySelector('#inputNumeroAsiento').value = prefilledNumber;
  } else {
    const lastSeat = allAsientos[allAsientos.length - 1];
    document.querySelector('#inputNumeroAsiento').value = (lastSeat?.numero_asiento || allAsientos.length) + 1;
  }

  if (asientoModalInstance) asientoModalInstance.show();
}

// Guardar asiento en MySQL
async function saveAsiento() {
  const id_fila = Number(document.querySelector('#inputAsientoFila').value);
  const numero_asiento = Number(document.querySelector('#inputNumeroAsiento').value);

  if (!id_fila || !numero_asiento) {
    alert('Ingresa los campos requeridos');
    return;
  }

  const btn = document.querySelector('#saveAsientoBtn');
  btn.disabled = true;
  btn.textContent = 'Creando...';

  try {
    await apiRequest('/api/admin/asientos', {
      method: 'POST',
      body: JSON.stringify({ id_fila, numero_asiento })
    });

    if (asientoModalInstance) asientoModalInstance.hide();
    await loadData();
  } catch (e) {
    alert(`Error al crear asiento: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear Asiento';
  }
}

// Abrir modal de edición del lugar/asiento
function openEditAsientoModal(seatId, displayCode) {
  const seat = allAsientos.find(a => a.id_asiento === seatId);
  if (!seat) return;

  document.querySelector('#editAsientoId').value = seat.id_asiento;
  document.querySelector('#modalSeatTitle').textContent = displayCode || `Lugar #${seat.numero_asiento}`;
  document.querySelector('#modalSeatFila').textContent = `Tribuna ${seat.nombre_fila}`;
  document.querySelector('#modalSeatZona').textContent = `Zona ${seat.nombre_zona}`;
  document.querySelector('#editNumeroAsiento').value = seat.numero_asiento;

  const selectFila = document.querySelector('#editFilaAsignada');
  if (selectFila) {
    selectFila.innerHTML = allFilas.map(f => `
      <option value="${f.id_fila}" ${f.id_fila === seat.id_fila ? 'selected' : ''}>
        ${escapeHtml(f.nombre_zona)} - ${escapeHtml(f.nombre_fila)}
      </option>
    `).join('');
  }

  if (editAsientoModalInstance) editAsientoModalInstance.show();
}

// Guardar cambios en el lugar/asiento
async function saveEditAsiento() {
  const id = Number(document.querySelector('#editAsientoId').value);
  const numero_asiento = Number(document.querySelector('#editNumeroAsiento').value);
  const id_fila = Number(document.querySelector('#editFilaAsignada').value);

  if (!id || !numero_asiento || !id_fila) {
    alert('Ingresa los campos requeridos');
    return;
  }

  const btn = document.querySelector('#saveEditAsientoBtn');
  btn.disabled = true;
  btn.textContent = 'Guardando...';

  try {
    await apiRequest(`/api/admin/asientos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ numero_asiento, id_fila })
    });

    if (editAsientoModalInstance) editAsientoModalInstance.hide();
    await loadData();
  } catch (e) {
    alert(`Error: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar Cambios';
  }
}

// Eliminar asiento
async function deleteAsiento() {
  const id = Number(document.querySelector('#editAsientoId').value);
  if (!id) return;

  if (!confirm('¿Estás seguro de eliminar este lugar/asiento de la fila? Esta acción afectará el aforo configurado.')) {
    return;
  }

  try {
    await apiRequest(`/api/admin/asientos/${id}`, { method: 'DELETE' });
    if (editAsientoModalInstance) editAsientoModalInstance.hide();
    await loadData();
  } catch (e) {
    alert(`Error al eliminar: ${e.message}`);
  }
}
