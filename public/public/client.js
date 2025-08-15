// public/client.js
// простий клієнт для відображення лобі та підключення до столу

// Допоміжний селектор
const $ = (sel) => document.querySelector(sel);

// Елементи UI (мають бути в index.html)
const lobbyListEl = $('#lobbyList');        // контейнер зі списком столів
const refreshBtn  = $('#btnRefresh');       // кнопка "Оновити" (якщо є)
const balanceEl   = document.getElementById('balance'); // текст балансу (необов'язково)

let myName = 'Player ' + Math.floor(Math.random() * 10000);
let currentTable = null;

// Підключення до Socket.IO сервера
const socket = io();

// Коли сокет підключився — нічого додатково не треба. Сервер сам шле 'lobby'
socket.on('connect', () => {
  // можна щось логнути
  // console.log('connected', socket.id);
});

// Отримали актуальний список столів
socket.on('lobby', (data) => {
  renderLobby(data?.tables || []);
});

// На випадок, якщо сервер шле стан столу (ми поки просто логнемо)
socket.on('table_state', (state) => {
  // console.log('table_state', state);
});

// Якщо сервер шле мої hole-карти (поки просто логнемо)
socket.on('hole_cards', (payload) => {
  // console.log('hole_cards', payload.cards);
});

// Рендер списку столів
function renderLobby(tables) {
  if (!lobbyListEl) return;
  if (!tables.length) {
    lobbyListEl.innerHTML = `<div class="row"><div>Наразі немає столів</div></div>`;
    return;
  }
  lobbyListEl.innerHTML = tables.map(t => {
    const busy = `${t.busy}/${t.seats}`;
    const stage = t.stage || 'waiting';
    return `
      <div class="row" style="justify-content:space-between;align-items:center;margin:6px 0;">
        <div>
          <div style="font-weight:600">${t.name}</div>
          <div style="opacity:.7;font-size:14px">ID: ${t.id} • ${busy} • ${stage}</div>
        </div>
        <button class="btn" onclick="joinTable('${t.id}')">Зайти</button>
      </div>
    `;
  }).join('');
}

// Публічна функція для кнопки "Зайти"
window.joinTable = function(tableId) {
  currentTable = tableId;
  socket.emit('join_table', { tableId, name: myName });
  // Для демо одразу запросимо свої карти, якщо роздача вже йде
  socket.emit('get_hole', { tableId });
  alert('Зайшов за стіл ' + tableId);
};

// Кнопка "Оновити" (необов'язкова, сервер і так шле лобі)
if (refreshBtn) {
  refreshBtn.addEventListener('click', () => {
    // трюк: попросимо сервер створити "порожній" івент лоббі,
    // але наш сервер уже розсилає його автоматично.
    // Тут просто перезавантажимо сторінку:
    location.reload();
  });
}

// (необов'язково) імітуємо баланс у шапці
if (balanceEl) {
  balanceEl.textContent = 'Баланс: 0 фішок';
}
