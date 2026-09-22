// --- Proteger ruta: Si no hay token o ya expiró, redirigir al login ---
(function checkAuth() {
  const token = localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && Date.now() >= payload.exp * 1000) logout();
  } catch (error) {
    logout();
  }
})();

const statusOptions = { available: 'Disponible', reserved: 'Apartado', sold: 'Vendido', blocked: 'Bloqueado' };
let seats = [];
let activeGameId = null;
const tabs = document.querySelector('#gameTabs');
const content = document.querySelector('#gameTabsContent');
const searchInput = document.querySelector('#searchInput');
const statusFilter = document.querySelector('#statusFilter');
const resetBtn = document.querySelector('#resetBtn');
const themeToggle = document.querySelector('#themeToggle');
const logoutBtn = document.querySelector('#logoutBtn');
const gamesTotal = document.querySelector('#gamesTotal');

function getToken() {
  return localStorage.getItem('bonos-token') || sessionStorage.getItem('bonos-token');
}

async function apiRequest(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}`, ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 || response.status === 403) {
    logout();
    throw new Error('Sesión expirada');
  }
  if (!response.ok) throw new Error(data.message || 'Error de comunicación con el servidor');
  return data;
}

async function loadSeats() {
  try {
    seats = await apiRequest('/api/asientos');
    activeGameId = activeGameId || seats[0]?.gameId;
    renderTabs();
    renderContent();
    applyFilters();
  } catch (error) {
    content.innerHTML = `<div class="alert alert-danger">${escapeHtml(error.message)}</div>`;
  }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function games() {
  return [...new Map(seats.map(seat => [seat.gameId, seat])).values()];
}

function formatDate(value) {
  const date = typeof value === 'string' && value.includes('T') ? new Date(value) : new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'full' }).format(date);
}

function formatSeat(seat, compact = false) {
  const parts = seat.split('/');
  if (parts.length !== 3) return seat;
  return compact ? `${parts[1]} / ${parts[2]}` : `${parts[0]} / ${parts[1]} / ${parts[2]}`;
}

function groupSeatsByRow(gameSeats) {
  return gameSeats.reduce((groups, seat) => {
    const parts = seat.seat.split('/');
    const key = parts.length === 3 ? `${parts[0]} / Fila ${parts[1]}` : 'Otros lugares';
    (groups[key] ||= []).push(seat);
    return groups;
  }, {});
}

function auditTitle(seat) {
  if (!seat.lastUser || !seat.lastChangedAt) return 'Sin cambios registrados';
  return `Último cambio: ${seat.lastUser}, ${new Date(seat.lastChangedAt).toLocaleString('es-MX')}`;
}

function renderTabs() {
  tabs.innerHTML = games().map(game => `
    <li class="nav-item" role="presentation">
      <button class="nav-link ${game.gameId === activeGameId ? 'active' : ''}" data-game-tab="${game.gameId}" type="button" role="tab">${escapeHtml(game.label)}</button>
    </li>
  `).join('');
  gamesTotal.textContent = games().length;
}

function renderSeat(seat) {
  const label = statusOptions[seat.status] || seat.status;
  return `<div class="seat-item" title="${escapeHtml(auditTitle(seat))}">
    <button class="seat-btn ${escapeHtml(seat.status)}" data-seat="${escapeHtml(seat.seat)}" data-status="${escapeHtml(seat.status)}" type="button">
      <span class="seat-code-main">${escapeHtml(formatSeat(seat.seat, true))}</span>
      <small><span class="seat-status-dot"></span>${escapeHtml(label)}</small>
    </button>
    <select class="seat-status-select form-select form-select-sm" data-seat-id="${seat.id}" aria-label="Estado de ${escapeHtml(seat.seat)}">
      ${Object.entries(statusOptions).map(([value, text]) => `<option value="${value}" ${value === seat.status ? 'selected' : ''}>${text}</option>`).join('')}
    </select>
  </div>`;
}

function statsHtml(gameSeats) {
  const totals = gameSeats.reduce((acc, seat) => {
    acc[seat.status] = (acc[seat.status] || 0) + 1;
    return acc;
  }, {});
  return `<div class="row g-3 mb-4">${Object.entries(statusOptions).map(([status, label]) =>
    `<div class="col-6 col-lg-3"><div class="stats-box text-center"><strong>${totals[status] || 0}</strong><br><small>${label}s</small></div></div>`
  ).join('')}</div>`;
}

function renderContent() {
  content.innerHTML = games().map(game => {
    const gameSeats = seats.filter(seat => seat.gameId === game.gameId);
    const groupedSeats = groupSeatsByRow(gameSeats);
    return `<section class="tab-pane ${game.gameId === activeGameId ? 'show active' : 'd-none'}" data-game-content="${game.gameId}">
      <div class="game-card shadow-sm mb-4">
        <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
          <div><h2 class="h4 fw-bold mb-1">${escapeHtml(game.label)} ${escapeHtml(game.title)}</h2><p class="text-muted mb-0">${formatDate(game.fecha)}</p></div>
          <div class="d-flex flex-wrap gap-3 align-items-center small">${Object.entries(statusOptions).map(([status, label]) => `<span><i class="legend-dot dot-${status}"></i>${label}</span>`).join('')}</div>
        </div>
        ${statsHtml(gameSeats)}
        <div class="zones-layout">${['superior', 'inferior'].map(zone => {
          const zoneSeats = gameSeats.filter(seat => seat.zone === zone);
          return `<div class="zone-section"><div class="zone-title"><h3 class="h5 fw-bold mb-0">Zona ${zone}</h3><span class="badge text-bg-secondary">${zoneSeats.length} lugares</span></div>
            ${Object.entries(groupSeatsByRow(zoneSeats)).map(([row, rowSeats]) => `<div class="seat-row-group"><div class="seat-row-title">${escapeHtml(row)}</div><div class="seat-grid">${rowSeats.map(renderSeat).join('')}</div></div>`).join('')}</div>`;
        }).join('')}</div>
      </div>
    </section>`;
  }).join('');
}

function applyFilters() {
  const search = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;
  document.querySelectorAll('.seat-item').forEach(item => {
    const button = item.querySelector('.seat-btn');
    item.classList.toggle('d-none', !(button.dataset.seat.toLowerCase().includes(search) && (selectedStatus === 'all' || button.dataset.status === selectedStatus)));
  });
}

async function changeStatus(id, status, select) {
  select.disabled = true;
  try {
    await apiRequest(`/api/asientos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: status }) });
    await loadSeats();
  } catch (error) {
    alert(error.message);
    select.value = seats.find(seat => seat.id === Number(id))?.status || 'available';
  } finally {
    select.disabled = false;
  }
}

function bindEvents() {
  tabs.addEventListener('click', event => {
    const tab = event.target.closest('[data-game-tab]');
    if (!tab) return;
    activeGameId = Number(tab.dataset.gameTab);
    renderTabs();
    renderContent();
    applyFilters();
  });
  content.addEventListener('change', event => {
    const select = event.target.closest('.seat-status-select');
    if (select) changeStatus(select.dataset.seatId, select.value, select);
  });
  searchInput.addEventListener('input', applyFilters);
  statusFilter.addEventListener('change', applyFilters);
  resetBtn.addEventListener('click', () => { searchInput.value = ''; statusFilter.value = 'all'; applyFilters(); });
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-bs-theme', nextTheme);
    localStorage.setItem('bonos-theme', nextTheme);
    themeToggle.textContent = nextTheme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
  });
  logoutBtn?.addEventListener('click', logout);
}

function logout() {
  localStorage.removeItem('bonos-token');
  sessionStorage.removeItem('bonos-token');
  localStorage.removeItem('bonos-user');
  sessionStorage.removeItem('bonos-user');
  window.location.href = 'login.html';
}

function initUser() {
  try {
    const rawUser = localStorage.getItem('bonos-user') || sessionStorage.getItem('bonos-user');
    const user = rawUser && JSON.parse(rawUser);
    const userName = document.querySelector('#userName');
    if (user && userName) {
      userName.textContent = user.nombre || user.username || 'Usuario';
      document.querySelector('#userGreeting').classList.replace('d-none', 'd-inline-flex');
    }
  } catch (error) { console.warn('No se pudo cargar información del usuario:', error); }
}

function initTheme() {
  const savedTheme = localStorage.getItem('bonos-theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
}

initTheme();
initUser();
bindEvents();
loadSeats();
