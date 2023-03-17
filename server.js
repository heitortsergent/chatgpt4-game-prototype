const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const path = require('path');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(8080, () => {
  console.log('Server listening on port 8080');
});

const players = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  players[socket.id] = {
    playerId: socket.id,
    x: Math.random() * 800,
    y: Math.random() * 600,
  };

  socket.on('clientReady', () => {
    socket.emit('currentPlayers', players);
  });

  io.emit('newPlayer', players[socket.id]);

  socket.on('playerMovement', (movementData) => {
    players[socket.id].x = movementData.x;
    players[socket.id].y = movementData.y;
    socket.broadcast.emit('playerMoved', players[socket.id]);
  });

  socket.on('boxCreated', (boxInfo) => {
    // Broadcast the new box's position to all connected clients
    socket.broadcast.emit('boxCreated', boxInfo);
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
    delete players[socket.id];
    io.emit('playerDisconnected', socket.id);
  });
});