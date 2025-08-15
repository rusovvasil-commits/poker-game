// --- socket & state ---
const socket = io();
let myName = 'Player ' + Math.floor(Math.random() * 10000);
let currentTable = null;

// --- DOM refs ---
const vLobby  = document.getElementById('view-lobby');
const vTable  = document.getElementById('view-table');
const lobbyEl = document.getElementById('lobbyList');
const boardEl = document.getElementById('board');
const holeEl  = document.getElementById('hole');

// --- buttons (як в index.html) ---
document.getElementById('btnLobby').onclick = () => {
  socket.emit('leave_table', { tableId: currentTable });
  currentTable = null;
  showLobby();
  socket.emit('get_tables');
};
document.getElementById('btnNew').onclick   = () => socket.emit('new_hand');
document.getElementById('btnFold').onclick  = () => socket.emit('action', { type: 'fold' });
document.getElementById('btnCC').onclick    = () => socket.emit('action', { type: 'check_call' });
document.getElementById('btnBet').onclick   = () => socket.emit('action', { type: 'bet', size: 10 });
document.getElementById('btnHole').onclick  = () => socket.emit('get_hole');

// --- helpers view ---
function showLobby(){ vLobby.style.display='block'; vTable.style.display='none'; }
function showTable(){ vLobby.style.display='none';  vTable.style.display='block'; }

// ================= SVG картка =================
function svgCard({ r, s }) {
  // s: 'c','d','h','s'  (♣ ♦ ♥ ♠)
  const suitSymbol = { c:'♣', d:'♦', h:'♥', s:'♠' }[s];
  const color = (s === 'd' || s === 'h') ? '#cc1e2c' : '#1a1a1a';
  // Розмір під контейнер 80x120 (див. CSS .pkr-card)
  return `
  <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" aria-label="${r}${s}">
    <rect x="3" y="3" width="194" height="294" rx="16" ry="16"
          fill="#ffffff" stroke="rgba(0,0,0,.25)" />
    <!-- кути -->
    <g fill="${color}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-weight="700">
      <text x="16" y="32" font-size="28">${r}</text>
      <text x="32" y="32" font-size="28">${suitSymbol}</text>
      <g transform="rotate(180 100 150)">
        <text x="16" y="32" font-size="28">${r}</text>
        <text x="32" y="32" font-size="28">${suitSymbol}</text>
      </g>
    </g>
    <!-- велика масть по центру -->
    <text x="100" y="172" text-anchor="middle" fill="${color}"
      font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
      font-size="96" opacity=".9">${suitSymbol}</text>
  </svg>`;
}

function createCardEl(card, hidden=false) {
  const wrap = document.createElement('div');
  wrap.className = 'pkr-card';
  if (hidden) wrap.classList.add('back');
  wrap.innerHTML = hidden ? '' : svgCard(card);
  return wrap;
}

function renderCards(containerId, cards, { hidden=false } = {}) {
  const root = document.getElementById(containerId);
  if (!root) return;
  root.innerHTML = '';
  (cards || []).forEach(c => root.appendChild(createCardEl(c, hidden)));
}

// =============== ЛОБІ ===============
function renderLobby(tables = []) {
  lobbyEl.innerHTML = '';
  if (!tables.length) {
    lobbyEl.innerHTML = '<div class="lobby__row">Столів поки немає…</div>';
    return;
  }
  tables.forEach(t => {
    const row = document.createElement('div');
    row.className = 'lobby__row';
    row.innerHTML = `
      <div>${t.name} — ${t.players}/${t.max} — ${t.stage || 'waiting'}</div>
      <button class="btn">Зайти</button>
    `;
    row.querySelector('button').onclick = () => {
      socket.emit('join_table', { tableId: t.id, name: myName });
    };
    lobbyEl.appendChild(row);
  });
}

// =============== SOCKET EVENTS ===============
socket.on('connect', () => {
  // запитуємо лобі при підключенні
  socket.emit('get_tables');
  showLobby();
});

// сервер надсилає список столів
socket.on('tables', (tables) => renderLobby(tables));

// сервер підтвердив вхід за стіл
socket.on('table_joined', (payload) => {
  currentTable = payload.tableId;
  showTable();
  // одразу оновимо борд/карти, якщо сервер надіслав стан
  if (payload.board)  renderCards('board', payload.board);
  if (payload.hole)   renderCards('hole',  payload.hole);
});

// оновлення борду (community)
socket.on('board', (cards) => renderCards('board', cards));

// оновлення моєї руки
socket.on('hole', (cards) => renderCards('hole', cards));

// коли хтось лівнув / стіл змінився — оновити лобі
socket.on('tables_update', (tables) => renderLobby(tables));

// опціонально: повідомлення/помилки
socket.on('message', (m) => console.log('[msg]', m));
socket.on('error',   (e) => console.warn('[err]', e));
