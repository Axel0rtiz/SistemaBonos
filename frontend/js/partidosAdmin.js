// Proteger ruta: solo administradores
(function checkAdminAuth() {
  const token = localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
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

// Estado en memoria (cargado exclusivamente desde la Base de Datos)
let allPartidos = [];
let allTorneos = [];
let selectedTorneoId = null;
let activeJornadaFilter = 'todas';
let searchQuery = '';
let sedeFilter = 'todos';
let currentPage = 1;
const ITEMS_PER_PAGE = 6;

// Modales de Bootstrap
let partidoModalInstance = null;
let torneoModalInstance = null;
let infoModalInstance = null;

// Escapar cadenas HTML
function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));
}

// Formatear fecha y hora en español
function formatMatchDate(dateString) {
  if (!dateString) return 'Fecha por definir • Estadio Akron';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const datePart = date.toLocaleDateString('es-MX', optionsDate);
    const capitalDate = datePart.charAt(0).toUpperCase() + datePart.slice(1);

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${capitalDate} • ${hours}:${minutes} hrs • Estadio Akron`;
  } catch (e) {
    return dateString;
  }
}

// Inicializar página
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initUser();
  initModals();
  bindEvents();
  loadData();
});

// Inicializar instancias de modales
function initModals() {
  const pEl = document.querySelector('#partidoModal');
  if (pEl) partidoModalInstance = new bootstrap.Modal(pEl);

  const tEl = document.querySelector('#torneoModal');
  if (tEl) torneoModalInstance = new bootstrap.Modal(tEl);

  const iEl = document.querySelector('#infoModal');
  if (iEl) infoModalInstance = new bootstrap.Modal(iEl);
}

// Inicializar datos del usuario actual
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

// Cargar todos los datos directamente desde la Base de Datos
async function loadData() {
  try {
    // 1. Estadísticas de la BD
    const stats = await apiRequest('/api/admin/estadisticas');
    if (stats) {
      document.querySelector('#statTorneos').textContent = stats.torneos ?? 0;
      document.querySelector('#statPartidos').textContent = stats.partidos ?? 0;
      document.querySelector('#tabUsuariosCount').textContent = stats.usuarios ?? 0;
      document.querySelector('#tabPartidosCount').textContent = `${stats.partidos ?? 0} J`;
      document.querySelector('#tabFilasCount').textContent = `${stats.filas ?? 0} F`;
    }
  } catch (e) {
    console.error('Error al cargar estadísticas:', e);
  }

  try {
    // 2. Torneos desde la BD
    allTorneos = await apiRequest('/api/admin/torneos');
    renderTorneos();
    populateTorneoSelect();
  } catch (e) {
    console.error('Error al cargar torneos:', e);
  }

  try {
    // 3. Partidos desde la BD con conteos de asientos
    allPartidos = await apiRequest('/api/admin/partidos');
    buildJornadasPills();
    renderPartidos();
  } catch (e) {
    console.error('Error al cargar partidos:', e);
    const list = document.querySelector('#partidosList');
    if (list) {
      list.innerHTML = `<div class="text-center py-5 text-danger">Error al cargar partidos desde la base de datos: ${escapeHtml(e.message)}</div>`;
    }
  }
}

// Poblar selector de torneos en modal de añadir partido
function populateTorneoSelect() {
  const select = document.querySelector('#inputTorneoSelect');
  if (!select) return;

  if (allTorneos.length === 0) {
    select.innerHTML = '<option value="">No hay torneos registrados</option>';
    return;
  }

  select.innerHTML = allTorneos.map(t => `
    <option value="${t.id}" ${t.id === selectedTorneoId ? 'selected' : ''}>
      ${escapeHtml(t.nombre_torneo)}
    </option>
  `).join('');
}

// Renderizar sección de torneos desde la BD
function renderTorneos() {
  const grid = document.querySelector('#torneosGrid');
  const addBtn = document.querySelector('#cardNuevoCertamen');
  const badgeCount = document.querySelector('#badgeTorneosCount');
  if (!grid || !addBtn) return;

  if (badgeCount) {
    badgeCount.textContent = `${allTorneos.length} Registrado${allTorneos.length === 1 ? '' : 's'}`;
  }

  // Si no hay torneo seleccionado, seleccionar el primero por defecto
  if (!selectedTorneoId && allTorneos.length > 0) {
    selectedTorneoId = allTorneos[0].id;
    updateTournamentTitle(allTorneos[0].nombre_torneo);
  }

  // Limpiar tarjetas previas excepto el botón de añadir
  const cards = grid.querySelectorAll('.torneo-card:not(.torneo-card-add)');
  cards.forEach(c => c.remove());

  if (allTorneos.length === 0) {
    const emptyMsg = document.createElement('div');
    emptyMsg.className = 'text-muted py-3 small';
    emptyMsg.textContent = 'No hay torneos registrados en la base de datos.';
    grid.insertBefore(emptyMsg, addBtn);
    return;
  }

  allTorneos.forEach((torneo, index) => {
    const isSelected = torneo.id === selectedTorneoId;
    const card = document.createElement('div');
    card.className = `torneo-card ${isSelected ? 'active' : ''}`;
    card.dataset.torneoId = torneo.id;

    const code = torneo.nombre_torneo.split(/\s+/).slice(0, 2).join('-').toUpperCase();
    const countPartidos = torneo.total_partidos || 0;

    card.innerHTML = `
      <div class="torneo-card-top">
        <span class="torneo-code">${escapeHtml(code)}</span>
        <span class="torneo-badge ${isSelected ? 'badge-active' : ''}">${isSelected ? 'Activo' : 'Certamen'}</span>
      </div>
      <div class="torneo-name">${escapeHtml(torneo.nombre_torneo)}</div>
      <div class="torneo-desc">${countPartidos} partido${countPartidos === 1 ? '' : 's'} programado${countPartidos === 1 ? '' : 's'}</div>
    `;

    grid.insertBefore(card, addBtn);
  });
}

function updateTournamentTitle(name) {
  const title = document.querySelector('#currentTournamentTitle');
  const badge = document.querySelector('#badgeTorneoActivo');
  const navBadge = document.querySelector('#navbarTorneoBadge');
  if (title) title.textContent = name;
  if (badge) badge.textContent = 'Partidos Oficiales';
  if (navBadge) navBadge.textContent = name.toUpperCase();
}

// Helper para extraer de forma robusta el número de jornada (ej. "J1", 1, "Jornada 10" -> 10)
function getJornadaNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

// Construir dinámicamente las píldoras de jornada según los partidos de la BD (ordenadas ascendentemente)
function buildJornadasPills() {
  const bar = document.querySelector('#jornadasNavBar');
  if (!bar) return;

  const partidosTorneo = selectedTorneoId
    ? allPartidos.filter(p => Number(p.id_torneo) === Number(selectedTorneoId))
    : allPartidos;

  const jornadas = [...new Set(partidosTorneo.map(p => getJornadaNum(p.jornada)).filter(n => n > 0))].sort((a, b) => a - b);

  let pillsHtml = `
    <span class="jornadas-label">JORNADAS:</span>
    <button class="jornada-pill ${activeJornadaFilter === 'todas' ? 'active' : ''}" data-jornada="todas">Todas</button>
  `;

  jornadas.forEach(j => {
    const isActive = String(activeJornadaFilter) === String(j);
    pillsHtml += `
      <button class="jornada-pill ${isActive ? 'active' : ''}" data-jornada="${j}">J${j}</button>
    `;
  });

  bar.innerHTML = pillsHtml;
}

// Renderizar la lista de partidos desde la BD
function renderPartidos() {
  const container = document.querySelector('#partidosList');
  if (!container) return;

  // Filtrar según torneo seleccionado (si existe) y filtros de búsqueda
  let filtered = allPartidos.filter(p => {
    if (selectedTorneoId && p.id_torneo && p.id_torneo !== selectedTorneoId) {
      return false;
    }

    if (activeJornadaFilter !== 'todas') {
      if (getJornadaNum(p.jornada) !== getJornadaNum(activeJornadaFilter)) return false;
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchJ = `j${p.jornada}`.toLowerCase().includes(q) || `jornada ${p.jornada}`.toLowerCase().includes(q);
      const matchName = (p.nombre_partido || '').toLowerCase().includes(q);
      if (!matchJ && !matchName) return false;
    }

    return true;
  });

  // Ordenar ascendentemente por número de jornada
  filtered.sort((a, b) => getJornadaNum(a.jornada) - getJornadaNum(b.jornada));

  const totalFiltered = filtered.length;
  document.querySelector('#totalPartidosCount').textContent = totalFiltered;

  if (totalFiltered === 0) {
    container.innerHTML = `
      <div class="text-center py-5 text-muted">
        <p class="mb-2">No se encontraron partidos en la base de datos para los criterios seleccionados.</p>
        <button class="btn btn-sm btn-outline-danger" id="btnEmptyAdd">
          + Añadir el primer partido
        </button>
      </div>
    `;
    const b = document.querySelector('#btnEmptyAdd');
    if (b) b.addEventListener('click', openAddPartidoModal);

    document.querySelector('#visiblePartidosCount').textContent = '0';
    renderPagination(1);
    return;
  }

  // Paginación
  const totalPages = Math.ceil(totalFiltered / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) currentPage = 1;

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const pageItems = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  document.querySelector('#visiblePartidosCount').textContent = pageItems.length;

  container.innerHTML = pageItems.map((p, idx) => {
    const jStr = String(p.jornada || 1).padStart(2, '0');
    const disp = Number(p.disponibles) || 0;
    const apart = Number(p.apartados) || 0;
    const vend = Number(p.vendidos) || 0;
    const dateFormatted = formatMatchDate(p.fecha);
    const isFirst = idx === 0;

    return `
      <div class="partido-card ${isFirst ? 'featured-card' : ''}" data-partido-id="${p.id}">
        <!-- Lado Izquierdo: Insignia Jornada y Datos -->
        <div class="partido-left">
          <div class="jornada-badge-circle ${isFirst ? 'badge-red' : ''}">
            <small>JORNADA</small>
            <strong>${jStr}</strong>
          </div>
          <div class="partido-info">
            <div class="partido-title-row">
              <h4 class="partido-title">J${p.jornada} - ${escapeHtml(p.nombre_partido)}</h4>
              <span class="badge-tag ${isFirst ? 'badge-proximo' : 'badge-regular'}">${escapeHtml(p.nombre_torneo || 'Torneo Oficial')}</span>
              <span class="badge-status-dot status-venta-abierta">
                <span style="color: #059669; font-size: 0.85rem;">●</span> Programado
              </span>
            </div>
            <div class="partido-meta">
              <span>${escapeHtml(dateFormatted)}</span>
            </div>
          </div>
        </div>

        <!-- Centro: Métricas reales de Asientos de la BD -->
        <div class="partido-stats-group">
          <div class="metric-col metric-disp">
            <strong>${disp}</strong>
            <small>DISPONIBLES</small>
          </div>
          <div class="metric-col metric-apart">
            <strong>${apart}</strong>
            <small>APARTADOS</small>
          </div>
          <div class="metric-col metric-vend">
            <strong>${vend}</strong>
            <small>VENDIDOS</small>
          </div>
        </div>

        <!-- Derecha: Acciones directas a la BD -->
        <div class="partido-actions">
          <button class="btn-info-action ${isFirst ? 'btn-info-red' : ''}" data-action="info" data-id="${p.id}" type="button">
            <i class="bi bi-info-circle-fill"></i>
            Info
          </button>
          <button class="btn-icon-square" data-action="view-seats" data-id="${p.id}" title="Ver topología de asientos de este partido" type="button">
            <i class="bi bi-grid-3x3-gap-fill"></i>
          </button>
          <button class="btn-icon-square" data-action="edit" data-id="${p.id}" title="Editar partido" type="button">
            <i class="bi bi-pencil-fill"></i>
          </button>
          <button class="btn-icon-square text-danger" data-action="delete" data-id="${p.id}" title="Eliminar partido de la base de datos" type="button">
            <i class="bi bi-trash-fill"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  renderPagination(totalPages);
}

// Renderizar controles de paginación
function renderPagination(totalPages) {
  const container = document.querySelector('#paginationControls');
  if (!container) return;

  let pagesHtml = `
    <button class="btn-page" id="btnPrevPage" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
  `;

  for (let i = 1; i <= totalPages; i++) {
    pagesHtml += `
      <button class="btn-page ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
    `;
  }

  pagesHtml += `
    <button class="btn-page" id="btnNextPage" ${currentPage === totalPages ? 'disabled' : ''}>Siguiente</button>
  `;

  container.innerHTML = pagesHtml;

  container.querySelectorAll('[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.page);
      renderPartidos();
    });
  });

  const prev = container.querySelector('#btnPrevPage');
  if (prev) {
    prev.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderPartidos();
      }
    });
  }

  const next = container.querySelector('#btnNextPage');
  if (next) {
    next.addEventListener('click', () => {
      if (currentPage < totalPages) {
        currentPage++;
        renderPartidos();
      }
    });
  }
}

// Configuración de eventos de la página
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

  // Búsqueda en vivo
  const searchInput = document.querySelector('#searchPartidos');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      currentPage = 1;
      renderPartidos();
    });
  }

  // Píldoras de jornada
  const jornadasNavBar = document.querySelector('#jornadasNavBar');
  if (jornadasNavBar) {
    jornadasNavBar.addEventListener('click', (e) => {
      const pill = e.target.closest('.jornada-pill');
      if (!pill) return;

      jornadasNavBar.querySelectorAll('.jornada-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      activeJornadaFilter = pill.dataset.jornada;
      currentPage = 1;
      renderPartidos();
    });
  }

  // Selección de Torneos
  const torneosGrid = document.querySelector('#torneosGrid');
  if (torneosGrid) {
    torneosGrid.addEventListener('click', (e) => {
      const card = e.target.closest('.torneo-card:not(.torneo-card-add)');
      if (card) {
        const id = Number(card.dataset.torneoId);
        selectedTorneoId = id;

        torneosGrid.querySelectorAll('.torneo-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');

        const torneo = allTorneos.find(t => t.id === id);
        if (torneo) {
          updateTournamentTitle(torneo.nombre_torneo);
        }

        currentPage = 1;
        renderPartidos();
      }
    });
  }

  // Abrir Modal Añadir Torneo
  const btnAddTorneo = document.querySelector('#btnAddTorneo');
  const cardNuevoCertamen = document.querySelector('#cardNuevoCertamen');
  if (btnAddTorneo) btnAddTorneo.addEventListener('click', openAddTorneoModal);
  if (cardNuevoCertamen) cardNuevoCertamen.addEventListener('click', openAddTorneoModal);

  // Guardar Torneo en BD
  const saveTorneoBtn = document.querySelector('#saveTorneoBtn');
  if (saveTorneoBtn) saveTorneoBtn.addEventListener('click', saveTorneo);

  // Abrir Modal Añadir Partido
  const btnAddPartido = document.querySelector('#btnAddPartido');
  if (btnAddPartido) btnAddPartido.addEventListener('click', openAddPartidoModal);

  // Guardar Partido en BD
  const savePartidoBtn = document.querySelector('#savePartidoBtn');
  if (savePartidoBtn) savePartidoBtn.addEventListener('click', savePartido);

  // Delegación de eventos en la lista de partidos (Info, Edit, Ver Asientos, Eliminar)
  const partidosList = document.querySelector('#partidosList');
  if (partidosList) {
    partidosList.addEventListener('click', async (e) => {
      const infoBtn = e.target.closest('[data-action="info"]');
      if (infoBtn) {
        openInfoModal(Number(infoBtn.dataset.id));
        return;
      }

      const seatsBtn = e.target.closest('[data-action="view-seats"]');
      if (seatsBtn) {
        const id = seatsBtn.dataset.id;
        window.location.href = `index.html?partido=${id}`;
        return;
      }

      const editBtn = e.target.closest('[data-action="edit"]');
      if (editBtn) {
        openEditPartidoModal(Number(editBtn.dataset.id));
        return;
      }

      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        deletePartido(Number(deleteBtn.dataset.id));
        return;
      }
    });
  }

  // Soporte
  const soporte = document.querySelector('#soporteLink');
  if (soporte) {
    soporte.addEventListener('click', () => {
      alert('Sistema de Asignación y Control de Bonos Chivas.\nContacto: soporte@rebanotours.com\nVersión: 2.4.0-prod');
    });
  }
}

// Modal de Info de Partido con datos de la BD (Diseño de la maqueta)
function openInfoModal(id) {
  const partido = allPartidos.find(p => p.id === id);
  if (!partido) return;

  const disp = Number(partido.disponibles) || 0;
  const apart = Number(partido.apartados) || 0;
  const vend = Number(partido.vendidos) || 0;
  const total = Number(partido.total_asientos) || (disp + apart + vend) || 36;
  const ocupados = vend + apart;

  const pctOcupado = total > 0 ? Math.round((ocupados / total) * 100) : 0;
  const pctVendido = total > 0 ? Math.round((vend / total) * 100) : 0;
  const pctApartado = total > 0 ? Math.round((apart / total) * 100) : 0;
  const pctDisponible = total > 0 ? Math.max(0, 100 - pctVendido - pctApartado) : 0;

  const formattedDate = formatMatchDate(partido.fecha);

  const modalBody = document.querySelector('#infoModalBody');
  modalBody.innerHTML = `
    <div class="info-modal-wrapper px-1 py-1">
      <!-- 1. Badges superiores: Jornada y Torneo -->
      <div class="d-flex justify-content-between align-items-center mb-3">
        <span class="info-badge-jornada">JORNADA ${partido.jornada}</span>
        <span class="info-badge-torneo">
          <span class="dot-live-pink">●</span> ${escapeHtml(partido.nombre_torneo || 'Apertura 2026')}
        </span>
      </div>

      <!-- 2. Nombre del Encuentro -->
      <h2 class="info-match-title">${escapeHtml(partido.nombre_partido)}</h2>

      <!-- 3. Lista de Metadatos (Fecha BD, Sede, Capacidad) -->
      <div class="info-meta-list mb-4">
        <div class="info-meta-item">
          <span class="info-meta-icon">🗓️</span>
          <span><strong>Fecha en BD:</strong> ${escapeHtml(formattedDate)}</span>
        </div>
        <div class="info-meta-item">
          <span class="info-meta-icon">📍</span>
          <span><strong>Sede:</strong> Estadio Akron • Zapopan</span>
        </div>
        <div class="info-meta-item">
          <span class="info-meta-icon">🎟️</span>
          <span><strong>Capacidad Asignada:</strong> ${total} Asientos</span>
        </div>
      </div>

      <!-- 4. Tres Tarjetas de Estadísticas (Disponibles, Apartados, Vendidos) -->
      <div class="row g-3 mb-4 text-center">
        <div class="col-4">
          <div class="info-stat-card stat-card-disp">
            <div class="stat-number text-disp">${disp}</div>
            <div class="stat-label text-disp">DISPONIBLES</div>
          </div>
        </div>
        <div class="col-4">
          <div class="info-stat-card stat-card-apart">
            <div class="stat-number text-apart">${apart}</div>
            <div class="stat-label text-apart">APARTADOS</div>
          </div>
        </div>
        <div class="col-4">
          <div class="info-stat-card stat-card-vend">
            <div class="stat-number text-vend">${vend}</div>
            <div class="stat-label text-vend">VENDIDOS</div>
          </div>
        </div>
      </div>

      <!-- 5. Barra de Ocupación de Asientos y Leyenda -->
      <div class="info-occupancy-section">
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="info-occupancy-title">Ocupación de Asientos</span>
          <span class="info-occupancy-value">
            <strong>${pctOcupado}% Ocupado</strong> <small class="text-muted">(${ocupados}/${total})</small>
          </span>
        </div>
        <div class="info-progress-container">
          <div class="info-progress-bar">
            <div class="segment-vend" style="width: ${pctVendido}%" title="${vend} Vendidos (${pctVendido}%)"></div>
            <div class="segment-apart" style="width: ${pctApartado}%" title="${apart} Apartados (${pctApartado}%)"></div>
            <div class="segment-disp" style="width: ${pctDisponible}%" title="${disp} Disponibles (${pctDisponible}%)"></div>
          </div>
        </div>

        <div class="info-legend-row mt-3">
          <div class="legend-item"><span class="dot-legend dot-vend">●</span> ${vend} Vendidos (${pctVendido}%)</div>
          <div class="legend-item"><span class="dot-legend dot-apart">●</span> ${apart} Apartados (${pctApartado}%)</div>
          <div class="legend-item"><span class="dot-legend dot-disp">●</span> ${disp} Disponibles (${pctDisponible}%)</div>
        </div>
      </div>
    </div>
  `;

  const seatsBtn = document.querySelector('#infoModalSeatsBtn');
  if (seatsBtn) {
    seatsBtn.href = `index.html?partido=${partido.id}`;
  }

  if (infoModalInstance) infoModalInstance.show();
}

// Abrir modal de añadir partido
function openAddPartidoModal() {
  document.querySelector('#partidoForm').reset();
  document.querySelector('#editPartidoId').value = '';
  document.querySelector('#partidoModalLabel').textContent = 'Añadir Partido';
  populateTorneoSelect();
  if (partidoModalInstance) partidoModalInstance.show();
}

// Abrir modal de editar partido
function openEditPartidoModal(id) {
  const partido = allPartidos.find(p => p.id === id);
  if (!partido) return;

  document.querySelector('#editPartidoId').value = partido.id;
  document.querySelector('#inputJornada').value = partido.jornada;
  document.querySelector('#inputNombrePartido').value = partido.nombre_partido;

  // Extraer fecha y hora si existen
  try {
    const d = new Date(partido.fecha);
    if (!isNaN(d.getTime())) {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      document.querySelector('#inputFecha').value = `${year}-${month}-${day}`;
      document.querySelector('#inputHora').value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  } catch (e) {}

  populateTorneoSelect();
  if (partido.id_torneo) {
    document.querySelector('#inputTorneoSelect').value = partido.id_torneo;
  }

  document.querySelector('#partidoModalLabel').textContent = 'Editar Partido';
  if (partidoModalInstance) partidoModalInstance.show();
}

// Guardar partido (INSERT o UPDATE en MySQL)
async function savePartido() {
  const id = document.querySelector('#editPartidoId').value;
  const id_torneo = Number(document.querySelector('#inputTorneoSelect').value) || 1;
  const jornada = Number(document.querySelector('#inputJornada').value);
  const nombre_partido = document.querySelector('#inputNombrePartido').value.trim();
  const fecha = document.querySelector('#inputFecha').value;
  const hora = document.querySelector('#inputHora').value;

  if (!jornada || !nombre_partido || !fecha || !hora) {
    alert('Por favor completa todos los campos requeridos.');
    return;
  }

  const saveBtn = document.querySelector('#savePartidoBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Guardando en BD...';

  try {
    const fullFecha = `${fecha} ${hora}:00`;

    if (id) {
      // UPDATE
      await apiRequest(`/api/admin/partidos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ nombre_partido, jornada, fecha: fullFecha })
      });
    } else {
      // INSERT
      await apiRequest('/api/admin/partidos', {
        method: 'POST',
        body: JSON.stringify({ nombre_partido, jornada, fecha: fullFecha, id_torneo })
      });
    }

    if (partidoModalInstance) partidoModalInstance.hide();
    await loadData();
  } catch (error) {
    alert(`Error al guardar en la base de datos: ${error.message}`);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'Guardar Partido';
  }
}

// Eliminar partido de la base de datos
async function deletePartido(id) {
  const partido = allPartidos.find(p => p.id === id);
  if (!partido) return;

  if (!confirm(`¿Estás seguro de eliminar el partido "${partido.nombre_partido}" de la base de datos?\nSe eliminarán también sus registros de asientos asignados.`)) {
    return;
  }

  try {
    await apiRequest(`/api/admin/partidos/${id}`, { method: 'DELETE' });
    await loadData();
  } catch (error) {
    alert(`Error al eliminar: ${error.message}`);
  }
}

// Abrir modal de nuevo torneo
function openAddTorneoModal() {
  document.querySelector('#torneoForm').reset();
  if (torneoModalInstance) torneoModalInstance.show();
}

// Guardar nuevo certamen en MySQL
async function saveTorneo() {
  const nombre_torneo = document.querySelector('#inputTorneoNombre').value.trim();
  const fecha_inicio = document.querySelector('#inputTorneoInicio').value;
  const fecha_fin = document.querySelector('#inputTorneoFin').value;

  if (!nombre_torneo || !fecha_inicio || !fecha_fin) {
    alert('Por favor completa todos los datos del torneo');
    return;
  }

  const btn = document.querySelector('#saveTorneoBtn');
  btn.disabled = true;
  btn.textContent = 'Creando en BD...';

  try {
    await apiRequest('/api/admin/torneos', {
      method: 'POST',
      body: JSON.stringify({ nombre_torneo, fecha_inicio, fecha_fin })
    });

    if (torneoModalInstance) torneoModalInstance.hide();
    await loadData();
  } catch (e) {
    alert(`Error al crear torneo: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Crear Torneo';
  }
}
