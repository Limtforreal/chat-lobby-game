const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Keep a map of players
const players = {};

io.on('connection', socket => {
  console.log('conn:', socket.id);

  // New player
  socket.on('join', (payload) => {
    const { name, color } = payload;
    // default position
    players[socket.id] = {
      id: socket.id,
      name: name || 'Guest',
      color: color || '#333',
      x: Math.floor(Math.random() * 600) + 50,
      y: Math.floor(Math.random() * 300) + 50
    };
    // send current players to new client
    socket.emit('currentPlayers', players);
    // notify others
    socket.broadcast.emit('playerJoined', players[socket.id]);
  });

  socket.on('move', (pos) => {
    if (!players[socket.id]) return;
    players[socket.id].x = pos.x;
    players[socket.id].y = pos.y;
    // broadcast to all except sender
    socket.broadcast.emit('playerMoved', { id: socket.id, x: pos.x, y: pos.y });
  });

  socket.on('chat', (msg) => {
    if (!players[socket.id]) return;
    const data = { from: players[socket.id].name, text: msg, id: socket.id };
    io.emit('chat', data);
  });

  socket.on('disconnect', () => {
    console.log('disc:', socket.id);
    if (players[socket.id]) {
      const leaving = players[socket.id];
      delete players[socket.id];
      io.emit('playerLeft', { id: socket.id, name: leaving.name });
    }
  });
});

server.listen(PORT, () => {
  console.log('Server listening on', PORT);
});
