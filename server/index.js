import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import GameState from './gameLogic.js';
import { getDb } from './db.js';

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

// Initialize Game
const game = new GameState(io);

// Chat messages history
const chatHistory = [];

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Send initial state
  socket.emit('gameState', game.getState());
  socket.emit('chatHistory', chatHistory);

  socket.on('placeBet', async ({ username, amount }) => {
    try {
      const db = await getDb();
      const user = await db.get('SELECT balance FROM users WHERE username = ?', [username]);
      if (!user || user.balance < amount) {
        return socket.emit('betFailed', 'Insufficient balance');
      }

      if (game.placeBet(username, amount)) {
        await db.run('UPDATE users SET balance = balance - ? WHERE username = ?', [amount, username]);
        socket.emit('betConfirmed', amount);
      } else {
        socket.emit('betFailed', 'Could not place bet');
      }
    } catch (error) {
      socket.emit('betFailed', 'Server error');
    }
  });

  socket.on('cashOut', async (username) => {
    const winnings = game.cashOut(username);
    if (winnings !== false) {
      try {
        const db = await getDb();
        await db.run('UPDATE users SET balance = balance + ? WHERE username = ?', [winnings, username]);
        socket.emit('cashOutSuccess', winnings);
      } catch (error) {
        console.error('Failed to update balance on cashout', error);
      }
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

// Auth Routes
app.post('/api/register', async (req, res) => {
  const { username, password, phone } = req.body;

  // Server-side Kenyan phone validation
  const phoneRegex = /^(?:254|\+254|0)?((?:7|1)(?:(?:[0-9][0-9])|[0-9])\d{6})$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number' });
  }

  try {
    const db = await getDb();
    const existing = await db.get('SELECT username FROM users WHERE username = ? OR phone = ?', [username, phone]);
    if (existing) {
      return res.status(400).json({ error: 'Username or phone already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // KSH 500 bonus applied automatically via DB default
    await db.run(
      'INSERT INTO users (username, phone, password) VALUES (?, ?, ?)',
      [username, phone, hashedPassword]
    );
    
    res.json({ success: true, username, balance: 500 });
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const db = await getDb();
    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ success: true, username, balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// M-Pesa Withdrawal Route
app.post('/api/withdraw', async (req, res) => {
  const { username, amount, phoneNumber } = req.body;
  
  try {
    const db = await getDb();
    const user = await db.get('SELECT balance FROM users WHERE username = ?', [username]);
    
    if (!user || user.balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    await db.run('UPDATE users SET balance = balance - ? WHERE username = ?', [amount, username]);
    
    // Simulate M-Pesa API delay
    setTimeout(() => {
      res.json({ success: true, message: `KSH ${amount} sent to ${phoneNumber} via M-Pesa`, newBalance: user.balance - amount });
    }, 1500);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
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
