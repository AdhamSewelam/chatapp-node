const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const userRoutes = require('./routes/userRoutes');
const messageRoute = require('./routes/messagesRoute');
const socket = require('socket.io');

dotenv.config();
app.use(cors());
app.use(express.json());

app.use('/api/auth', userRoutes);
app.use('/api/message', messageRoute);

app.get('/', (req, res) => {
  res.json({ message: 'HELLO WORLD!' });
});

//mongoose connection
mongoose.set('strictQuery', false);
mongoose
  .connect(process.env.MONGO_URL, { useNewUrlParser: true })
  .then(() => {
    console.log('DB Connection Successful!');
  })
  .catch((err) => console.log(err));

const server = app.listen(process.env.PORT, () => {
  console.log(`Server started on Port ${process.env.PORT}`);
});

const io = socket(server, {
  cors: {
    origin: 'https://adhamsewelam.github.io/chatapp-react/',
    credentials: true,
  },
});
//store all online users inside this map
global.onlineUsers = new Map();

io.on('connection', (socket) => {
  global.chatSocket = socket;
  socket.on('add-user', (userId) => {
    onlineUsers.set(userId, socket.id);
  });

  socket.on('send-msg', (data) => {
    const sendUserSocket = onlineUsers.get(data.to);
    if (sendUserSocket) {
      socket.to(sendUserSocket).emit('msg-recieved', data.message);
    }
  });

  socket.on('join', ({ email }) => {
    console.log(`${email} joined the chat`);
  });

  socket.on('chat message', (msg) => {
    console.log(`Message received: ${msg}`);
    const token = socket.handshake.auth.token;
    try {
      if (token && token !== 'null') {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET,
          (err, decoded) => {
            if (err) {
              console.error(err);
            } else {
              console.log(decoded);
            }
          }
        );
        const { email } = decoded;
        console.log(`${email}: ${msg}`);
        io.emit('chat message', { email, msg });
      }
    } catch (err) {
      console.log(err);
    }
  });

  // socket.on('disconnect', () => {
  //   console.log('User disconnected');
  // });
});
