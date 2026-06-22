import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import GameState from './gameLogic.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Mock Database
const users = new Map(); // username -> { password, balance }

// Initialize Game
const game = new GameState(io);

// Chat messages history
const chatHistory = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send initial state
  socket.emit('gameState', game.getState());
  socket.emit('chatHistory', chatHistory);

  socket.on('placeBet', ({ username, amount }) => {
    // Check balance logic here ideally, but mocking it
    if (game.placeBet(socket.id, username, amount)) {
      socket.emit('betConfirmed', amount);
    } else {
      socket.emit('betFailed', 'Could not place bet');
    }
  });

  socket.on('cashOut', () => {
    const winnings = game.cashOut(socket.id);
    if (winnings !== false) {
      socket.emit('cashOutSuccess', winnings);
    }
  });

  socket.on('sendMessage', ({ username, message }) => {
    const chatMsg = { username, message, time: new Date().toLocaleTimeString() };
    chatHistory.push(chatMsg);
    if (chatHistory.length > 50) chatHistory.shift();
    io.emit('newMessage', chatMsg);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Auth Routes (Mock)
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (users.has(username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  // KSH 500 bonus
  users.set(username, { password, balance: 500 });
  res.json({ success: true, username, balance: 500 });
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.get(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  res.json({ success: true, username, balance: user.balance });
});

// M-Pesa Withdrawal Route (Mock)
app.post('/api/withdraw', (req, res) => {
  const { username, amount, phoneNumber } = req.body;
  const user = users.get(username);
  if (!user || user.balance < amount) {
    return res.status(400).json({ error: 'Insufficient balance' });
  }
  user.balance -= amount;
  // Simulate M-Pesa API delay
  setTimeout(() => {
    res.json({ success: true, message: `KSH ${amount} sent to ${phoneNumber} via M-Pesa`, newBalance: user.balance });
  }, 1500);
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
