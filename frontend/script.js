const games = [
  { id: 'j1', label: 'J1', title: 'CHIVAS VS TOLUCA', date: 'Sábado 18 de Julio 2026' },
  { id: 'j2', label: 'J2', title: 'CHIVAS VS JUÁREZ', date: 'Sábado 25 de Julio 2026' },
  { id: 'j5', label: 'J5', title: 'CHIVAS VS TIJUANA', date: 'Sábado 22 de Agosto 2026' },
  { id: 'j8', label: 'J8', title: 'CHIVAS VS PUMAS', date: 'Domingo 13 de Septiembre 2026' },
  { id: 'j10', label: 'J10', title: 'CHIVAS VS QUERÉTARO', date: 'Sábado 26 de Septiembre 2026' },
  { id: 'j12', label: 'J12', title: 'CHIVAS VS TIGRES', date: 'Sábado 17 de Octubre 2026' },
  { id: 'j13', label: 'J13', title: 'CHIVAS VS NECAXA', date: 'Martes 20 de Octubre 2026' },
  { id: 'j15', label: 'J15', title: 'CHIVAS VS NECAXA', date: 'Sábado 31 de Octubre 2026' },
  { id: 'j17', label: 'J17', title: 'CHIVAS VS NECAXA', date: 'Domingo 22 de Noviembre 2026' }
];

const zonaInferior = [
  'T1-33/H/9', 'T1-33/H/10',
  'T1-27/P/6', 'T1-27/P/7', 'T1-27/P/8', 'T1-27/P/9',
  'T1-14/K/4', 'T1-14/K/5', 'T1-14/K/6',
  'T1-14/K/13', 'T1-11/K/14', 'T1-11/K/15', 'T1-11/K/16', 'T1-11/K/17',
  'T1-11/J/10', 'T1-11/J/11', 'T1-11/J/12', 'T1-11/J/13', 'T1-11/J/14',
  'T1-09/M/14', 'T1-09/M/15', 'T1-09/M/16'
];

const zonaSuperior = [
  'T2-32/L/5', 'T2-32/L/6', 'T2-32/L/7', 'T2-32/L/8', 'T2-32/L/9',
  'T2-32/L/10', 'T2-32/L/11', 'T2-32/L/12', 'T2-32/L/13', 'T2-32/L/14',
  'T2-32/L/15', 'T2-32/L/16', 'T2-32/L/17', 'T2-32/L/18'
];

const defaultStatus = {
  'T1-11/K/16': 'reserved',
  'T2-32/L/10': 'reserved',
  'T2-32/L/11': 'reserved'
};

const tabs = document.querySelector('#gameTabs');
const content = document.querySelector('#gameTabsContent');
const searchInput = document.querySelector('#searchInput');
const statusFilter = document.querySelector('#statusFilter');
const resetBtn = document.querySelector('#resetBtn');
const themeToggle = document.querySelector('#themeToggle');

function storageKey(gameId, seat) {
  return `bonos-${gameId}-${seat}`;
}

function getSeatStatus(gameId, seat) {
  return localStorage.getItem(storageKey(gameId, seat)) || defaultStatus[seat] || 'available';
}

function setSeatStatus(gameId, seat, status) {
  localStorage.setItem(storageKey(gameId, seat), status);
}

function nextStatus(status) {
  if (status === 'available') return 'reserved';
  if (status === 'reserved') return 'sold';
  return 'available';
}

function statusLabel(status) {
  return { available: 'Disponible', reserved: 'Apartado', sold: 'Vendido' }[status];
}

function renderTabs() {
  tabs.innerHTML = games.map((game, index) => `
    <li class="nav-item" role="presentation">
      <button class="nav-link ${index === 0 ? 'active' : ''}" id="${game.id}-tab" data-bs-toggle="pill" data-bs-target="#${game.id}" type="button" role="tab">
        ${game.label}
      </button>
    </li>
  `).join('');
}

function formatSeat(seat, compact = false) {
  const parts = seat.split('/');
  if (parts.length !== 3) return seat;
  return compact ? `${parts[1]} / ${parts[2]}` : `${parts[0]} / ${parts[1]} / ${parts[2]}`;
}

function groupSeatsByRow(seats) {
  return seats.reduce((groups, seat) => {
    const parts = seat.split('/');
    const key = parts.length === 3 ? `${parts[0]} / Fila ${parts[1]}` : 'Otros lugares';
    if (!groups[key]) groups[key] = [];
    groups[key].push(seat);
    return groups;
  }, {});
}

function renderSeats(gameId, seats, zone) {
  const groupedSeats = groupSeatsByRow(seats);

  return Object.entries(groupedSeats).map(([rowName, rowSeats]) => `
    <div class="seat-row-group">
      <div class="seat-row-title">${rowName}</div>
      <div class="seat-grid">
        ${rowSeats.map(seat => {
          const status = getSeatStatus(gameId, seat);
          return `<button class="seat-btn ${status}" title="${formatSeat(seat)} - ${statusLabel(status)}" data-game="${gameId}" data-seat="${seat}" data-zone="${zone}" data-status="${status}">
            <span class="seat-code-main">${formatSeat(seat, true)}</span>
            <small><span class="seat-status-dot"></span>${statusLabel(status).slice(0, 5)}.</small>
          </button>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}

function statsHtml(gameId) {
  const allSeats = [...zonaInferior, ...zonaSuperior];
  const totals = allSeats.reduce((acc, seat) => {
    acc[getSeatStatus(gameId, seat)]++;
    return acc;
  }, { available: 0, reserved: 0, sold: 0 });

  return `
    <div class="row g-3 mb-4">
      <div class="col-4"><div class="stats-box text-center"><strong>${totals.available}</strong><br><small>Disponibles</small></div></div>
      <div class="col-4"><div class="stats-box text-center"><strong>${totals.reserved}</strong><br><small>Apartados</small></div></div>
      <div class="col-4"><div class="stats-box text-center"><strong>${totals.sold}</strong><br><small>Vendidos</small></div></div>
    </div>
  `;
}

function renderContent() {
  content.innerHTML = games.map((game, index) => `
    <section class="tab-pane fade ${index === 0 ? 'show active' : ''}" id="${game.id}" role="tabpanel" aria-labelledby="${game.id}-tab">
      <div class="game-card shadow-sm mb-4">
        <div class="d-flex flex-column flex-lg-row justify-content-between gap-3 mb-3">
          <div>
            <h2 class="h4 fw-bold mb-1">${game.label} ${game.title}</h2>
            <p class="text-muted mb-0">${game.date}</p>
          </div>
          <div class="d-flex flex-wrap gap-3 align-items-center small">
            <span><i class="legend-dot dot-available"></i>Disponible</span>
            <span><i class="legend-dot dot-reserved"></i>Apartado</span>
            <span><i class="legend-dot dot-sold"></i>Vendido</span>
          </div>
        </div>
        ${statsHtml(game.id)}
        <div class="zones-layout">
          <div class="zone-section">
            <div class="zone-title"><h3 class="h5 fw-bold mb-0">Zona superior</h3><span class="badge text-bg-secondary">${zonaSuperior.length} lugares</span></div>
            ${renderSeats(game.id, zonaSuperior, 'superior')}
          </div>
          <div class="zone-section">
            <div class="zone-title"><h3 class="h5 fw-bold mb-0">Zona inferior</h3><span class="badge text-bg-secondary">${zonaInferior.length} lugares</span></div>
            ${renderSeats(game.id, zonaInferior, 'inferior')}
          </div>
        </div>
      </div>
    </section>
  `).join('');
}

function applyFilters() {
  const search = searchInput.value.trim().toLowerCase();
  const selectedStatus = statusFilter.value;

  document.querySelectorAll('.seat-btn').forEach(btn => {
    const matchesText = btn.dataset.seat.toLowerCase().includes(search);
    const matchesStatus = selectedStatus === 'all' || btn.dataset.status === selectedStatus;
    btn.classList.toggle('d-none', !(matchesText && matchesStatus));
  });
}

function bindEvents() {
  document.addEventListener('click', event => {
    const btn = event.target.closest('.seat-btn');
    if (!btn) return;

    const newStatus = nextStatus(btn.dataset.status);
    setSeatStatus(btn.dataset.game, btn.dataset.seat, newStatus);
    renderContent();
    applyFilters();
  });

  searchInput.addEventListener('input', applyFilters);
  statusFilter.addEventListener('change', applyFilters);
  resetBtn.addEventListener('click', () => {
    searchInput.value = '';
    statusFilter.value = 'all';
    applyFilters();
  });

  themeToggle.addEventListener('click', () => {
    const html = document.documentElement;
    const nextTheme = html.getAttribute('data-bs-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-bs-theme', nextTheme);
    localStorage.setItem('bonos-theme', nextTheme);
    themeToggle.textContent = nextTheme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
  });
}

function initTheme() {
  const savedTheme = localStorage.getItem('bonos-theme') || 'light';
  document.documentElement.setAttribute('data-bs-theme', savedTheme);
  themeToggle.textContent = savedTheme === 'dark' ? '☀️ Modo claro' : '🌙 Modo oscuro';
}

initTheme();
renderTabs();
renderContent();
bindEvents();
