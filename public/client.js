// Мінімальна логіка меню без сокетів, лише кліки
document.addEventListener('DOMContentLoaded', () => {
  const btnLobby    = document.getElementById('btnLobby');
  const btnShop     = document.getElementById('btnShop');
  const btnSupport  = document.getElementById('btnSupport');

  const secLobby    = document.getElementById('section-lobby');
  const secShop     = document.getElementById('section-shop');
  const secSupport  = document.getElementById('section-support');

  const btnRefresh  = document.getElementById('btnRefresh');
  const lobbyList   = document.getElementById('lobbyList');

  function show(section) {
    [secLobby, secShop, secSupport].forEach(s => s.style.display = 'none');
    section.style.display = 'block';
  }

  // Навігація
  btnLobby.onclick   = () => show(secLobby);
  btnShop.onclick    = () => show(secShop);
  btnSupport.onclick = () => show(secSupport);

  // Тимчасове оновлення лобі (щоб бачити, що кліки працюють)
  if (btnRefresh && lobbyList) {
    btnRefresh.onclick = () => {
      lobbyList.textContent = 'Поки що без столів (демо).';
    };
  }

  // За замовчуванням показуємо лобі
  show(secLobby);
});
