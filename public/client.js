/* ===== Socket & UI ===== */
const socket = io();
let currentTable = null;

const vLobby  = document.getElementById('view-lobby');
const vTable  = document.getElementById('view-table');

const btnLobby = document.getElementById('btnLobby');
const btnNew   = document.getElementById('btnNew');
const btnFold  = document.getElementById('btnFold');
const btnCC    = document.getElementById('btnCheckCall');
const btnBet   = document.getElementById('btnBet');

btnLobby.onclick = showLobby;
btnNew.onclick   = () => socket.emit('new_hand');
btnFold.onclick  = () => socket.emit('action', { type: 'fold' });
btnCC.onclick    = () => socket.emit('action',  { type: 'check_call' });
btnBet.onclick   = () => socket.emit('action',  { type: 'bet', amt: 10 });

/* ===== Render lobby ===== */
function showLobby(){
  vTable.style.display = 'none';
  vLobby.style.display = 'block';
  socket.emit('get_lobby'); // попросити сервер оновити лобі
}
function renderLobby(tables = []){
  vLobby.innerHTML = `
    <h2>Лобі — столи</h2>
    <div class="lobbyList">
      ${tables.map(t => `
        <div class="row">
          <div>${t.name || (t.maxPlayers+'-max BB'+(t.bb||10))}</div>
          <div>${t.players}/${t.maxPlayers} — ${t.phase}</div>
          <button class="btn join" data-id="${t.id}">Зайти</button>
        </div>
      `).join('')}
    </div>
  `;
  vLobby.querySelectorAll('.join').forEach(b=>{
    b.onclick = () => socket.emit('join_table', { tableId: b.dataset.id });
  });
}

/* ===== Render table ===== */
function showTable(){
  vLobby.style.display = 'none';
  vTable.style.display = 'block';
  vTable.innerHTML = `
    <div class="board" id="board"></div>
    <div class="my-cards" id="hole"></div>
  `;
}
function renderCards(containerId, cards = [], hidden = false){
  const root = document.getElementById(containerId);
  if (!root) return;
  root.innerHTML = '';
  cards.forEach(c => root.appendChild(cardEl(c, hidden)));
}

/* SVG-карта 80x120 */
function cardEl(card, hidden=false){
  const el = document.createElement('div');
  el.className = 'pkr-card' + (hidden ? ' back':'');
  el.innerHTML = svgCard(card);
  return el;
}
function svgCard({r,s}){ // rank, suit
  const suitSymbol = { c:'♣', d:'♦', h:'♥', s:'♠' }[s] || '?';
  const color = (s==='d'||s==='h') ? '#cc1e2c' : '#1a1a1a';
  return `
<svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" aria-label="${r}${s}">
  <rect x="3" y="3" width="194" height="294" rx="16" ry="16" fill="#ffffff" stroke="rgba(0,0,0,.25)"/>
  <g fill="${color}" font-family="system-ui, -apple-system, Segoe UI, Roboto, Arial" font-weight="700">
    <text x="16" y="32" font-size="28">${r}</text>
    <text x="16" y="32" font-size="28" transform="rotate(180 100 150)">${r}</text>
  </g>
  <text x="35" y="32" font-size="28">${suitSymbol}</text>
  <text x="165" y="268" font-size="28" text-anchor="end" transform="rotate(180 100 150)">${suitSymbol}</text>
  <!-- велика масть -->
  <text x="100" y="172" text-anchor="middle" fill="${color}" font-size="96" opacity=".09">${suitSymbol}</text>
</svg>`;
}

/* ===== Socket events ===== */
socket.on('lobby', data => renderLobby(data.tables || []));
socket.on('table_state', state => {
  currentTable = state.tableId;
  showTable();
  renderCards('board', state.board || []);
  // мої карти сервер зазвичай надсилає окремо подією 'hole'
});
socket.on('hole', cards => renderCards('hole', cards || [], false));
socket.on('left_table', () => { currentTable = null; showLobby(); });

/* показати лобі на старті */
showLobby();

/* якщо вкладку закривають — ввічливо вийти зі столу */
window.addEventListener('beforeunload', () => {
  if (currentTable) socket.emit('leave_table', { tableId: currentTable });
});
