//Proteger ruta: Si no hay token o ya expiró, redirigir al login
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

const statusOptions = { available: 'Disponible', reserved: 'Apartado', sold: 'Vendido' };
const MAX_SEATS_PER_LINE = 10;
const allowedTransitions = {
  available: ['reserved', 'sold'],
  reserved: ['available', 'sold'],
  sold: ['available', 'reserved']
};
let seats = [];
let activeGameId = null;
let selectedTournamentId = null;
const tabs = document.querySelector('#gameTabs');
const content = document.querySelector('#gameTabsContent');
const tournamentFilter = document.querySelector('#tournamentFilter');
const searchInput = document.querySelector('#searchInput');
const statusFilter = document.querySelector('#statusFilter');
const resetBtn = document.querySelector('#resetBtn');
const themeToggle = document.querySelector('#themeToggle');
const logoutBtn = document.querySelector('#logoutBtn');
const gamesTotal = document.querySelector('#gamesTotal');
const statusModalElement = document.querySelector('#statusModal');
const statusModal = new bootstrap.Modal(statusModalElement);
const statusModalLabel = document.querySelector('#statusModalLabel');
const seatStatusInput = document.querySelector('#seatStatusInput');
const saveSeatStatusBtn = document.querySelector('#saveSeatStatusBtn');
const auditPopover = document.querySelector('#seatAuditPopover');
let selectedSeatId = null;
let auditHideTimer = null;

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

let _initialLoadDone = false;

async function loadSeats() {
  try {
    seats = await apiRequest('/api/asientos');

    if (!_initialLoadDone) {
      _initialLoadDone = true;
      const latestTournamentId = getLatestTournamentId();
      selectedTournamentId = latestTournamentId;

      // El parámetro de partido solo se respeta si pertenece al torneo más reciente.
      const urlParams = new URLSearchParams(window.location.search);
      const paramPartido = Number(urlParams.get('partido'));
      const partidoExiste = paramPartido && seats.some(s =>
        s.gameId === paramPartido && Number(s.tournamentId) === Number(selectedTournamentId)
      );
      if (partidoExiste) {
        activeGameId = paramPartido;
      }
    }

    // Seleccionar el primer partido del torneo más reciente si no hay uno activo.
    if (!activeGameId) {
      activeGameId = tournamentSeats()[0]?.gameId;
    }

    renderTournamentFilter();
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

function getJornadaNum(val) {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const match = String(val).match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}

function tournaments() {
  const map = new Map();
  seats.forEach(seat => {
    if (seat.tournamentId == null || map.has(seat.tournamentId)) return;
    map.set(seat.tournamentId, seat.torneo || 'Torneo sin nombre');
  });
  return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], 'es'));
}

function getLatestTournamentId() {
  const latest = tournaments().reduce((current, [id, name]) => {
    const tournamentSeat = seats.find(seat => Number(seat.tournamentId) === Number(id));
    if (!current) return { id, start: tournamentSeat?.tournamentStart || '', name };

    const currentDate = String(current.start).slice(0, 10);
    const candidateDate = String(tournamentSeat?.tournamentStart || '').slice(0, 10);
    if (candidateDate > currentDate || (candidateDate === currentDate && Number(id) > Number(current.id))) {
      return { id, start: tournamentSeat?.tournamentStart || '', name };
    }
    return current;
  }, null);

  return latest?.id ?? null;
}

function tournamentSeats() {
  if (selectedTournamentId == null) return seats;
  return seats.filter(seat => Number(seat.tournamentId) === Number(selectedTournamentId));
}

function renderTournamentFilter() {
  if (!tournamentFilter) return;
  const availableTournaments = tournaments();
  tournamentFilter.innerHTML = availableTournaments.length
    ? availableTournaments.map(([id, name]) => `<option value="${id}" ${Number(id) === Number(selectedTournamentId) ? 'selected' : ''}>${escapeHtml(name)}</option>`).join('')
    : '<option value="">No hay torneos registrados</option>';
}

function games() {
  const map = new Map(tournamentSeats().map(seat => [seat.gameId, seat]));
  return [...map.values()].sort((a, b) => {
    const jA = getJornadaNum(a.label || a.gameId);
    const jB = getJornadaNum(b.label || b.gameId);
    return jA - jB;
  });
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

function getSeatNumber(seat) {
  const parts = seat.seat.split('/');
  const number = parts[parts.length - 1];
  return Number(number);
}

function splitSeatsIntoLines(rowSeats) {
  const lines = [];
  let currentLine = [];
  let previousNumber = null;

  rowSeats.forEach(seat => {
    const seatNumber = getSeatNumber(seat);
    const startsNewLine = currentLine.length > 0 && (
      currentLine.length >= MAX_SEATS_PER_LINE ||
      !Number.isNaN(seatNumber) && seatNumber !== previousNumber + 1
    );

    if (startsNewLine) {
      lines.push(currentLine);
      currentLine = [];
    }

    currentLine.push(seat);
    previousNumber = seatNumber;
  });

  if (currentLine.length > 0) lines.push(currentLine);
  return lines;
}

function userInitials(name) {
  return (name || 'NA').split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
}

function nextStatuses(status) {
  return allowedTransitions[status] || [];
}

function statusButtons(seat) {
  if (seat.gameDatePassed) return '<p class="audit-no-actions">El partido ya pasó; los asientos están bloqueados.</p>';
  const statuses = nextStatuses(seat.status);
  if (statuses.length === 0) return '<p class="audit-no-actions">Este asiento no admite más cambios.</p>';
  return statuses.map(status => `
    <button type="button" class="audit-quick-btn" data-quick-status="${status}" data-seat-id="${seat.id}">
      <span class="audit-status-dot ${status}"></span>${escapeHtml(statusOptions[status])}
    </button>`).join('');
}

function showAuditPopover(button) {
  const seat = seats.find(item => item.id === Number(button.dataset.seatId));
  if (!seat) return;
  clearTimeout(auditHideTimer);
  const user = seat.lastUser || 'Sin cambios';
  const changedAt = seat.lastChangedAt ? new Date(seat.lastChangedAt).toLocaleString('es-MX') : 'Aún no modificado';
  const currentLabel = statusOptions[seat.status] || seat.status;
  auditPopover.innerHTML = `
    <div class="audit-popover-header">
      <span class="audit-avatar">${escapeHtml(userInitials(user))}</span>
      <div class="audit-user-info"><strong>${escapeHtml(user)}</strong><span>Editor</span><small>${escapeHtml(changedAt)}</small></div>
      <span class="audit-current-status ${escapeHtml(seat.status)}">${escapeHtml(currentLabel)}</span>
    </div>
    <div class="audit-divider"></div>
    <div class="audit-quick-label">CAMBIO RÁPIDO DE ESTADO:</div>
    <div class="audit-quick-actions">${statusButtons(seat)}</div>`;
  auditPopover.dataset.seatId = seat.id;
  auditPopover.classList.remove('d-none');
  auditPopover.setAttribute('aria-hidden', 'false');
  const rect = button.getBoundingClientRect();
  const width = auditPopover.offsetWidth;
  const left = Math.min(Math.max(8, rect.left + rect.width / 2 - width / 2), window.innerWidth - width - 8);
  const above = rect.top - auditPopover.offsetHeight - 12;
  auditPopover.style.left = `${left}px`;
  auditPopover.style.top = `${Math.max(8, above)}px`;
}

function hideAuditPopover() {
  auditHideTimer = setTimeout(() => {
    auditPopover.classList.add('d-none');
    auditPopover.setAttribute('aria-hidden', 'true');
  }, 180);
}

function renderTabs() {
  const allGames = games();
  if (!allGames.some(game => game.gameId === activeGameId)) {
    activeGameId = allGames[0]?.gameId;
  }
  tabs.innerHTML = allGames.map(game => `
    <li class="nav-item" role="presentation">
      <button class="nav-link ${game.gameId === activeGameId ? 'active' : ''}" data-game-tab="${game.gameId}" type="button" role="tab">${escapeHtml(game.label)}</button>
    </li>
  `).join('');
  gamesTotal.textContent = allGames.length;

  const activeGame = allGames.find(g => g.gameId === activeGameId) || allGames[0];
  const livePill = document.querySelector('.live-pill');
  if (livePill && activeGame) {
    const torneoTxt = (activeGame.torneo || 'Datos en vivo').toUpperCase();
    livePill.innerHTML = `<span class="live-dot"></span>${escapeHtml(torneoTxt)}`;
  }
}

function renderSeat(seat) {
  const label = statusOptions[seat.status] || seat.status;
  const isLocked = seat.gameDatePassed === true || Number(seat.gameDatePassed) === 1;
  return `<div class="seat-item">
    <button class="seat-btn ${escapeHtml(seat.status)} ${isLocked ? 'seat-locked' : ''}" data-seat-id="${seat.id}" data-seat="${escapeHtml(seat.seat)}" data-status="${escapeHtml(seat.status)}" type="button" ${isLocked ? 'disabled title="Partido finalizado: asiento bloqueado"' : ''}>
      <span class="seat-code-main">${escapeHtml(formatSeat(seat.seat, true))}</span>
      <small><span class="seat-status-dot"></span>${escapeHtml(label)}</small>
    </button>
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
  const filteredSeats = tournamentSeats();
  content.innerHTML = games().map(game => {
    const gameSeats = filteredSeats.filter(seat => seat.gameId === game.gameId);
    const groupedSeats = groupSeatsByRow(gameSeats);
    return `<section class="tab-pane ${game.gameId === activeGameId ? 'show active' : 'd-none'}" data-game-content="${game.gameId}">
      <div class="game-card shadow-sm mb-4">
        <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
          <div>
            ${game.torneo ? `<span class="badge text-bg-danger me-2 mb-1" style="font-size:0.75rem; text-transform:uppercase; font-weight:700;">${escapeHtml(game.torneo)}</span>` : ''}
            <h2 class="h4 fw-bold mb-1">${escapeHtml(game.label)} ${escapeHtml(game.title)}</h2>
            <p class="text-muted mb-0">${formatDate(game.fecha)}</p>
          </div>
          <div class="d-flex flex-wrap gap-3 align-items-center small">${Object.entries(statusOptions).map(([status, label]) => `<span><i class="legend-dot dot-${status}"></i>${label}</span>`).join('')}</div>
        </div>
        ${statsHtml(gameSeats)}
        <div class="zones-layout">${['superior', 'inferior'].map(zone => {
          const zoneSeats = gameSeats.filter(seat => seat.zone === zone);
          return `<div class="zone-section"><div class="zone-title"><h3 class="h5 fw-bold mb-0">Zona ${zone}</h3><span class="badge text-bg-secondary">${zoneSeats.length} lugares</span></div>
            ${Object.entries(groupSeatsByRow(zoneSeats)).map(([row, rowSeats]) => `<div class="seat-row-group"><div class="seat-row-title">${escapeHtml(row)}</div>${splitSeatsIntoLines(rowSeats).map(line => `<div class="seat-grid">${line.map(renderSeat).join('')}</div>`).join('')}</div>`).join('')}</div>`;
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

async function changeStatus(id, status) {
  try {
    await apiRequest(`/api/asientos/${id}/estado`, { method: 'PATCH', body: JSON.stringify({ estado: status }) });
    await loadSeats();
    return true;
  } catch (error) {
    alert(error.message);
    return false;
  }
}

function openStatusModal(button) {
  const seat = seats.find(item => item.id === Number(button.dataset.seatId));
  if (!seat) return;
  selectedSeatId = seat.id;
  statusModalLabel.textContent = `Cambiar estado: ${formatSeat(seat.seat)}`;
  const statuses = nextStatuses(seat.status);
  seatStatusInput.innerHTML = statuses.length
    ? statuses.map(status => `<option value="${status}">${statusOptions[status]}</option>`).join('')
    : '<option value="" selected>Sin cambios permitidos</option>';
  seatStatusInput.disabled = statuses.length === 0;
  saveSeatStatusBtn.disabled = statuses.length === 0;
  seatStatusInput.value = statuses[0] || '';
  statusModal.show();
}

function bindEvents() {
  tournamentFilter.addEventListener('change', () => {
    selectedTournamentId = tournamentFilter.value ? Number(tournamentFilter.value) : null;
    activeGameId = null;
    renderTabs();
    renderContent();
    applyFilters();
  });

  tabs.addEventListener('click', event => {
    const tab = event.target.closest('[data-game-tab]');
    if (!tab) return;
    activeGameId = Number(tab.dataset.gameTab);
    renderTabs();
    renderContent();
    applyFilters();
  });
  content.addEventListener('click', event => {
    const button = event.target.closest('.seat-btn');
    if (button) openStatusModal(button);
  });
  content.addEventListener('pointerover', event => {
    const button = event.target.closest('.seat-btn');
    if (button && !button.contains(event.relatedTarget)) showAuditPopover(button);
  });
  content.addEventListener('pointerout', event => {
    const button = event.target.closest('.seat-btn');
    if (button && !button.contains(event.relatedTarget)) hideAuditPopover();
  });
  auditPopover.addEventListener('pointerenter', () => clearTimeout(auditHideTimer));
  auditPopover.addEventListener('pointerleave', hideAuditPopover);
  auditPopover.addEventListener('click', async event => {
    const quickButton = event.target.closest('[data-quick-status]');
    if (!quickButton) return;
    auditPopover.querySelectorAll('.audit-quick-btn').forEach(button => { button.disabled = true; });
    const updated = await changeStatus(quickButton.dataset.seatId, quickButton.dataset.quickStatus);
    if (updated) hideAuditPopover();
  });
  saveSeatStatusBtn.addEventListener('click', async () => {
    if (!selectedSeatId || !seatStatusInput.value) return;
    saveSeatStatusBtn.disabled = true;
    saveSeatStatusBtn.textContent = 'Guardando...';
    const updated = await changeStatus(selectedSeatId, seatStatusInput.value);
    if (updated) statusModal.hide();
    saveSeatStatusBtn.disabled = false;
    saveSeatStatusBtn.textContent = 'Guardar estado';
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
    const userAvatar = document.querySelector('#userAvatar');
    if (user && userName) {
      const displayName = user.nombre || user.username || 'Usuario';
      userName.textContent = displayName;
      if (userAvatar) userAvatar.textContent = userInitials(displayName);
      document.querySelector('#userGreeting').classList.replace('d-none', 'd-inline-flex');
    }

    const token = getToken();
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload && payload.rol === 'admin') {
        const adminBackBtn = document.querySelector('#adminBackBtn');
        if (adminBackBtn) {
          adminBackBtn.classList.remove('d-none');
          adminBackBtn.classList.add('d-inline-flex');
        }
      }
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
