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
const boxes = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('joinRoom', (roomName) => {
    socket.join(roomName);
    // Add the player to the players object
    players[socket.id] = {
        playerId: socket.id,
        x: Math.floor(Math.random() * 700) + 50,
        y: Math.floor(Math.random() * 500) + 50,
        room: roomName
    };

    // Initialize the boxes array for the room if it does not exist
    if (!boxes[roomName]) {
      boxes[roomName] = [];
    }
  
    // socket.on('clientReady', () => {
    //   console.log('socket on clientReady');
    //   socket.to(roomName).emit('currentPlayers', players);
  
    //   socket.to(roomName).emit('currentBoxes', boxes[roomName]);
    // });

    // socket.emit('currentPlayers', players);
    // socket.emit('currentBoxes', boxes[roomName]);
  
    // io.emit('newPlayer', players[socket.id]);
    socket.to(roomName).emit('newPlayer', players[socket.id]);
  
    socket.on('playerMovement', (movementData) => {
      players[socket.id].x = movementData.x;
      players[socket.id].y = movementData.y;
      socket.to(roomName).emit('playerMoved', players[socket.id]);
    });
  
    socket.on('boxCreated', (boxInfo) => {
      boxes[roomName].push({boxInfo});
  
      // Broadcast the new box's position to all connected clients
      socket.to(roomName).emit('boxCreated', boxInfo);
    });
  
    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);
      delete players[socket.id];
      socket.to(roomName).emit('playerDisconnected', socket.id);
    });
  });

  socket.on('clientReady', () => {
    console.log('socket on clientReady');
    const roomName = players[socket.id].room;
    const roomPlayers = Object.fromEntries(Object.entries(players).filter(([_, player]) => player.room === roomName));
    socket.emit('currentPlayers', roomPlayers);
    socket.emit('currentBoxes', boxes[roomName]);
  });
});