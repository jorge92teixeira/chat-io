const express = require('express');
const path = require('path');

const app = express();

const server = require('http').createServer(app);
const io = require('socket.io')(server, { path: '/chat/socket.io' });

const cors = require('cors');

server.listen(process.env.PORT || 3002, () => {
  console.log(`Server has started on port ${process.env.PORT || 3002}`);
});

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
} = require('./users');

// Cors
app.use(cors());

// Serve static assets in production
if (process.env.NODE_ENV === 'production') {
  app.use('/chat/', express.static(path.join(__dirname, '/client/build')));
}

app.get('/', (req, res) => {
  res.status(200).send({ response: 'Server is up and running' });
});

const chat = io.on('connection', (socket) => {
  socket.on('join', ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });

    if (error) return callback(error);

    socket.join(user.room);
    socket.emit('message', { user: 'admin', text: `${user.name}, welcome to the room ${user.room}` });
    socket.broadcast.to(user.room).emit('message', { user: 'admin', text: `${user.name} has joined` });

    chat.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    return callback();
  });

  socket.on('sendMessage', (message, callback) => {
    const user = getUser(socket.id);

    chat.to(user.room).emit('message', { user: user.name, text: message });
    chat.to(user.room).emit('roomData', { room: user.room, users: getUsersInRoom(user.room) });

    return callback();
  });

  socket.on('disconnect', () => {
    const user = removeUser(socket.id);

    if (user) {
      chat.to(user.room).emit('message', { user: 'admin', text: `${user.name} has left.` });
    }
  });
});
