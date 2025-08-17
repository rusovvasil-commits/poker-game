const path = require('path');  // Додати для роботи з шляхами
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));  // Відправка index.html на головну сторінку
});

io.on('connection', (socket) => {
    console.log('a user connected');

    // Basic game events
    socket.on('bet', (playerIndex, amount) => {
        console.log(`Player ${playerIndex + 1} placed a bet of ${amount}`);
        socket.broadcast.emit('update', { playerIndex, amount });
    });

    socket.on('fold', (playerIndex) => {
        console.log(`Player ${playerIndex + 1} folded`);
        socket.broadcast.emit('update', { playerIndex, action: 'fold' });
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

http.listen(3000, () => {
    console.log('listening on *:3000');
});
