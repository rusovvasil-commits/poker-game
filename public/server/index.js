// server/index.js
// Простий poker-сервер на Socket.IO для демо "Poker Fishka"

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

/* ====== базова ініціалізація ====== */
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// healthcheck
app.get('/', (_, res) => res.send('Poker Fishka server is running'));

/* ====== модель даних у пам’яті ====== */
const TABLE_SEATS = 3;
const SMALL_BLIND = 5;
const BIG_BLIND = 10;

const tables = new Map(); // tableId -> table
let nextTableId = 1000;

function createTable(name = '3-max BB10') {
  const id = String(nextTableId++);
  const table = {
    id,
    name,
    seats: TABLE_SEATS,
    players: [], // {id, socketId, name, stack, seat}
    board: [],   // ['As','Kd','Tc',...]
    pot: 0,
    dealer: 0,   // індекс у players
    turn: 0,     // індекс у players (чий хід)
    deck: [],
    bets: {},    // socketId -> поточна ставка
    stage: 'waiting', // waiting | preflop | flop | turn | river | showdown
  };
  tables.set(id, table);
  return table;
}

// створимо кілька столів на старті
for (let i = 0; i < 5; i++) createTable('3-max BB10');

/* ====== колода / карти ====== */
const SUITS = ['s', 'h', 'd', 'c'];
const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];

function makeDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push(r + s);
  return deck;
}
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function deal(table) {
  table.deck = shuffle(makeDeck());
  table.board = [];
  table.pot = 0;
  table.bets = {};
  table.stage = 'preflop';

  // роздамо по 2 карти кожному
  for (const p of table.players) {
    p.hole = [table.deck.pop(), table.deck.pop()];
    table.bets[p.socketId] = 0;
  }
  // блайнди (спрощено)
  if (table.players.length >= 2) {
    const sb = table.players[(table.dealer + 1) % table.players.length];
    const bb = table.players[(table.dealer + 2) % table.players.length];
    takeBet(table, sb, SMALL_BLIND);
    takeBet(table, bb, BIG_BLIND);
    table.turn = (table.dealer + 3) % table.players.length;
  } else {
    table.turn = table.dealer;
  }
}

function takeBet(table, player, amount) {
  const a = Math.min(amount, player.stack);
  player.stack -= a;
  table.pot += a;
  table.bets[player.socketId] = (table.bets[player.socketId] || 0) + a;
}

function advanceStage(table) {
  if (table.stage === 'preflop') {
    // flop (3 карти)
    table.board = [table.deck.pop(), table.deck.pop(), table.deck.pop()];
    table.stage = 'flop';
  } else if (table.stage === 'flop') {
    table.board.push(table.deck.pop());
    table.stage = 'turn';
  } else if (table.stage === 'turn') {
    table.board.push(table.deck.pop());
    table.stage = 'river';
  } else if (table.stage === 'river') {
    table.stage = 'showdown';
  }
  // скинемо ставки кола
  for (const p of table.players) table.bets[p.socketId] = 0;
}

/* ====== допоміжні для емісії станів ====== */
function lobbySnapshot() {
  return {
    tables: Array.from(tables.values()).map(t => ({
      id: t.id,
      name: t.name,
      seats: t.seats,
      busy: t.players.length,
      stage: t.stage,
    })),
  };
}

function tablePublicState(table) {
  return {
    tableId: table.id,
    name: table.name,
    seats: table.seats,
    players: table.players.map(p => ({
      id: p.id,
      name: p.name,
      stack: p.stack,
      seat: p.seat,
    })),
    board: table.board, // повні карти на столі
    pot: table.pot,
    stage: table.stage,
    turn: table.players[table.turn]?.id ?? null,
  };
}

function emitLobby() {
  io.emit('lobby', lobbySnapshot());
}

function emitTable(table) {
  io.to(roomName(table.id)).emit('table_state', tablePublicState(table));
}

function roomName(tableId) {
  return `table:${tableId}`;
}

/* ====== socket.io ====== */
io.on('connection', (socket) => {
  // при підключенні одразу лобі
  socket.emit('lobby', lobbySnapshot());

  // створення столу (опційно з клієнта)
  socket.on('create_table', (name) => {
    const t = createTable(name || '3-max BB10');
    emitLobby();
    socket.emit('created_table', t.id);
  });

  // приєднатися до столу
  socket.on('join_table', ({ tableId, name }) => {
    const table = tables.get(String(tableId));
    if (!table) return;

    // якщо вже сидить – ігноруємо
    if (table.players.some(p => p.socketId === socket.id)) {
      socket.join(roomName(table.id));
      socket.emit('table_state', tablePublicState(table));
      return;
    }

    if (table.players.length >= table.seats) return; // full

    const player = {
      id: Math.floor(1000 + Math.random() * 9000),
      socketId: socket.id,
      name: name || `Player ${Math.floor(Math.random()*9000)}`,
      stack: 1000,
      seat: table.players.length, // просте садіння по порядку
      hole: [],
    };
    table.players.push(player);

    socket.join(roomName(table.id));
    emitLobby();
    emitTable(table);
  });

  // залишити стіл
  socket.on('leave_table', ({ tableId }) => {
    const table = tables.get(String(tableId));
    if (!table) return;
    table.players = table.players.filter(p => p.socketId !== socket.id);
    socket.leave(roomName(table.id));
    if (table.players.length === 0) {
      // скинемо стіл у початковий стан
      table.board = [];
      table.pot = 0;
      table.stage = 'waiting';
      table.bets = {};
    }
    emitLobby();
    emitTable(table);
    socket.emit('left_table');
  });

  // почати нову роздачу
  socket.on('new_hand', ({ tableId }) => {
    const table = tables.get(String(tableId));
    if (!table || table.players.length < 2) return;
    // дилер переходить далі
    table.dealer = (table.dealer + 1) % table.players.length;
    deal(table);
    emitTable(table);
    // роздамо hole кожному індивідуально
    for (const p of table.players) {
      io.to(p.socketId).emit('hole_cards', { tableId: table.id, cards: p.hole });
    }
  });

  // запит на свої hole (коли гравець заходить/перезавантажив сторінку)
  socket.on('get_hole', ({ tableId }) => {
    const table = tables.get(String(tableId));
    if (!table) return;
    const p = table.players.find(pp => pp.socketId === socket.id);
    if (p && p.hole && p.hole.length) {
      socket.emit('hole_cards', { tableId: table.id, cards: p.hole });
    }
  });

  // дії гравця
  socket.on('action', ({ tableId, type, amt }) => {
    const table = tables.get(String(tableId));
    if (!table) return;
    const idx = table.players.findIndex(p => p.socketId === socket.id);
    if (idx === -1) return;

    const player = table.players[idx];

    if (type === 'fold') {
      // для демо просто прибираємо зі столу
      table.players.splice(idx, 1);
      // якщо лишився 1 — одразу шоудаун
      if (table.players.length <= 1) table.stage = 'showdown';
    } else if (type === 'bet') {
      const val = Number(amt) || BIG_BLIND;
      takeBet(table, player, val);
    } else if (type === 'check_call') {
      // для демо — просто "колл" до найбільшої ставки кола
      const maxBet = Math.max(...Object.values(table.bets || { [socket.id]: 0 }));
      const need = maxBet - (table.bets[player.socketId] || 0);
      if (need > 0) takeBet(table, player, need);
      else {
        // всі заколили — наступна стадія
        advanceStage(table);
      }
    }

    emitTable(table);

    // коли шоудаун — просто завершуємо коло, нова роздача за запитом new_hand
    if (table.stage === 'showdown') {
      // повернемо кожному hole ще раз (на випадок, щоб усі бачили власні)
      for (const p of table.players) {
        io.to(p.socketId).emit('hole_cards', { tableId: table.id, cards: p.hole });
      }
    }
  });

  // роз’єднання
  socket.on('disconnect', () => {
    for (const table of tables.values()) {
      const existed = table.players.length;
      table.players = table.players.filter(p => p.socketId !== socket.id);
      if (table.players.length !== existed) {
        if (table.players.length === 0) {
          table.board = [];
          table.pot = 0;
          table.stage = 'waiting';
          table.bets = {};
        }
        emitLobby();
        emitTable(table);
      }
    }
  });
});

/* ====== запуск ====== */
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Poker Fishka server listening on ${PORT}`);
});
