const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const path = require('path');  // Додати для роботи з шляхами

app.use(express.static('public'));

// Обробка GET запиту для кореневого маршруту
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));  // Відправка index.html на головну сторінку
});

// Створення покерної колоди
const cardDeck = [
    'A♠', '2♠', '3♠', '4♠', '5♠', '6♠', '7♠', '8♠', '9♠', '10♠', 'J♠', 'Q♠', 'K♠',
    'A♦', '2♦', '3♦', '4♦', '5♦', '6♦', '7♦', '8♦', '9♦', '10♦', 'J♦', 'Q♦', 'K♦',
    'A♣', '2♣', '3♣', '4♣', '5♣', '6♣', '7♣', '8♣', '9♣', '10♣', 'J♣', 'Q♣', 'K♣',
    'A♥', '2♥', '3♥', '4♥', '5♥', '6♥', '7♥', '8♥', '9♥', '10♥', 'J♥', 'Q♥', 'K♥'
];

// Функція для тасування колоди
function shuffleDeck() {
    return cardDeck.sort(() => Math.random() - 0.5);
}

// Логіка для роздачі карт
function dealCards() {
    const shuffledDeck = shuffleDeck();
    const playerCards = [
        shuffledDeck.splice(0, 2), // Карти для гравця 1
        shuffledDeck.splice(0, 2), // Карти для гравця 2
        shuffledDeck.splice(0, 2)  // Карти для гравця 3
    ];
    const communityCards = shuffledDeck.splice(0, 5); // 5 карт на столі
    return { playerCards, communityCards };
}

// Логіка для ставок та фолдінгу
let playerChips = [1000, 1000, 1000]; // Чіпи для 3 гравців
let currentBet = 0;

io.on('connection', (socket) => {
    console.log('a user connected');
    let gameData = dealCards();

    // Відправка карт кожному гравцеві
    socket.emit('gameData', gameData);

    // Подія для ставки
    socket.on('bet', (playerIndex, amount) => {
        if (amount <= playerChips[playerIndex]) {
            playerChips[playerIndex] -= amount;
            currentBet = amount;
            console.log(`Player ${playerIndex + 1} placed a bet of ${amount}`);
            io.emit('update', { playerIndex, amount, currentBet });
        } else {
            console.log(`Player ${playerIndex + 1} does not have enough chips`);
        }
    });

    // Подія для фолдінгу
    socket.on('fold', (playerIndex) => {
        console.log(`Player ${playerIndex + 1} folded`);
        io.emit('update', { playerIndex, action: 'fold' });
    });

    // Подія для відключення
    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
