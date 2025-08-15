/* ===== Socket & UI refs ===== */
const socket = io();
let currentTable = null;
let myName = 'Player ' + Math.floor(Math.random() * 10000);

const vLobby   = document.getElementById('view-lobby');
const vTable   = document.getElementById('view-table');
const lobbyList = document.getElementById('lobbyList');
const boardEl  = document.getElementById('board');
const holeEl   = document.getElementById('hole');

/* Кнопки */
document.getElementById('btnLobby').onclick   = showLobby;
document.getElementById('btnNew').onclick     = () => socket.emit('new_hand');
document.getElementById('btnFold').onclick    = () => socket.emit('action', { type: 'fold' });
document.getElementById('btnCC').onclick      = () => socket.emit('action', { type: 'check_call' });
document.getElementById('btnBet').onclick     = () => socket.emit('action', { type: 'bet', amt: 10 });
document.getElementById('btnHole').onclick    = () => socket.emit('get_hole');

/* ===== Відмальовка повних карт (SVG) ===== */
const SUIT_SYM = { c: '♣', d: '♦', h: '♥', s: '♠' };
const SUIT_COL = s => (s === 'd' || s === 'h') ? '#cc1e2c' : '#1a1a1a';

/** svgCard({r:'A', s:'s'}) -> string */
function svgCard({ r, s }) {
  const col = SUIT_COL(s);
  const sym = SUIT_SYM[s] || '?';
  // SVG під контейнер 80x120 (див. CSS .pkr-card svg{width:100%;height:100%})
  return `
<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" aria-label="${r}${s}">
  <rect x="3" y="3" width="194" height="294" rx="16" ry="16"
        fill="#ffffff" stroke="rgba(0,0,0,.25)" />
  <!-- кут (ліворуч-верх) -->
  <g fill="${col}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-weight="700">
    <text x="16" y="32" font-size="28">${r}</text>
    <text x="16" y="58" font-size="24">${sym}</text>
  </g>
  <!-- кут (праворуч-низ, повертаємо) -->
  <g transform="rotate(180 170 270)" fill="${col}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-weight="700">
    <text x="16" y="32" font-size="28">${r}</text>
    <text x="16" y="58" font-size="24">${sym}</text>
  </g>
  <!-- велика масть по центру -->
  <text x="100" y="172" text-anchor="middle" fill="${col}"
        font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial"
        font-size="96" opacity=".09">${sym}</text>
</svg>`;
}

function createCardEl(card, hidden = false) {
  const wrap = document.createElement('div');
  wrap.className = 'pkr-card';
  if (hidden) wrap.classList.add('back');
  wrap.innerHTML = hidden ? '' : svgCard(card);
  return wrap;
}

function renderCards(containerId, cards, { hidden = false } = {}) {
  const root = document.getElementById(containerId);
  if (!root) return;
  root.innerHTML = '';
  (cards || []).forEach(c => root.appendChild(createCardEl(c, hidden)));
}

/* ===== Лобі / Стіл ===== */
function showLobby() {
  vTable.style.display = 'none';
  vLobby.style.display = 'block';
  socket.emit('get_lobby');
}

/* побудова списку столів у лобі */
function renderLobby(list = []) {
  lobbyList.innerHTML = '';
  list.forEach(t => {
    const item = document.createElement('div');
    item.className = 'row';
    item.innerHTML = `
      <div>3-max BB10 — ${t.players}/3 — ${t.stage || 'waiting'}</div>
      <button class="btn">Зайти</button>`;
    item.querySelector('button').onclick = () => {
      socket.emit('join_table', { tableId: t.id, name: myName });
    };
    lobbyList.appendChild(item);
  });
}

/* перемикач у вигляд столу */
function showTable() {
  vLobby.style.display = 'none';
  vTable.style.display = 'block';
}

/* приймаємо стан столу від сервера */
function applyTableState(state = {}) {
  // Борд
  renderCards('board', state.board || [], { hidden: false });
  // Мої карти якщо прислали в стані
  if (state.hole && state.hole.length) {
    renderCards('hole', state.hole, { hidden: false });
  }
}

/* окреме повідомлення з моїми картами */
socket.on('hole', cards => {
  renderCards('hole', cards, { hidden: false });
});

/* коли прийшов стан столу */
socket.on('table_state', state => {
  currentTable = state.tableId;
  showTable();
  applyTableState(state);
});

/* оновлення лобі */
socket.on('lobby', data => {
  renderLobby(data.tables || []);
});

/* якщо сервер каже, що ти вийшов зі столу */
socket.on('left_table', () => {
  currentTable = null;
  showLobby();
});

/* на старті показуємо лобі */
showLobby();

/* на всяк випадок: якщо вкладку закривають — просимо залишити стіл */
window.addEventListener('beforeunload', () => {
  if (currentTable) socket.emit('leave_table', { tableId: currentTable });
});
