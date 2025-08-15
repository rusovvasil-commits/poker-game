// ====== socket events ======
socket.on('connect', () => {
  showLobby();
});

socket.on('lobby', (payload) => {
  // payload: [{id,name,players,max,stage,type}, ...]
  renderLobby(payload || []);
});

socket.on('table_state', (state) => {
  // очікуємо: { pot, board:[{r,s}], myCards:[{r,s}], seats:[...], stage, ... }
  currentTable = state?.id || currentTable;
  updateTable(state || {});
});

socket.on('joined', (state) => {
  // при успішному вході на стіл сервер присилає стан
  currentTable = state?.id || currentTable;
  updateTable(state || {});
});

socket.on('left', () => {
  showLobby();
});

socket.on('message', (m) => {
  // для отладочних повідомлень
  console.log('[server]', m);
});

// ====== запит лобі одразу ======
socket.emit('get_lobby');

// ====== helpers для кнопок з html ======
// якщо хочеш, можна використовувати в index.html <button onclick="leaveTable()">...
window.leaveTable = function leaveTable() {
  if (currentTable) socket.emit('leave_table', { tableId: currentTable });
  showLobby();
};
// ===== END =====
