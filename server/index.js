import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import GameState from './gameLogic.js';

// DB abstraction — uses MongoDB if MONGO_URI is set, else SQLite
import { connectDB, User } from './mongo.js';
import { getDb } from './db.js';

const useMongo = !!process.env.MONGO_URI;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Boot DB
if (useMongo) {
  await connectDB();
} else {
  console.log('Using SQLite (set MONGO_URI to switch to MongoDB)');
}

// Initialize Game
const game = new GameState(io);
const chatHistory = [];

// ─── DB Helpers (abstracted) ─────────────────────────────────────────────────
async function findUser(username) {
  if (useMongo) return User.findOne({ username });
  const db = await getDb();
  return db.get('SELECT * FROM users WHERE username = ?', [username]);
}

async function getUserBalance(username) {
  if (useMongo) {
    const u = await User.findOne({ username }, 'balance');
    return u ? u.balance : null;
  }
  const db = await getDb();
  const row = await db.get('SELECT balance FROM users WHERE username = ?', [username]);
  return row ? row.balance : null;
}

async function deductBalance(username, amount) {
  if (useMongo) return User.updateOne({ username }, { $inc: { balance: -amount } });
  const db = await getDb();
  return db.run('UPDATE users SET balance = balance - ? WHERE username = ?', [amount, username]);
}

async function addBalance(username, amount) {
  if (useMongo) return User.updateOne({ username }, { $inc: { balance: amount } });
  const db = await getDb();
  return db.run('UPDATE users SET balance = balance + ? WHERE username = ?', [amount, username]);
}

// ─── Sockets ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('gameState', game.getState());
  socket.emit('chatHistory', chatHistory);

  socket.on('placeBet', async ({ username, amount, panelId }) => {
    try {
      const balance = await getUserBalance(username);
      if (balance === null || balance < amount) {
        return socket.emit('betFailed', 'Insufficient balance');
      }
      if (game.placeBet(username, amount, panelId)) {
        await deductBalance(username, amount);
        socket.emit('betConfirmed', { amount, username, panelId });
      } else {
        socket.emit('betFailed', 'Could not place bet — wait for next round');
      }
    } catch (error) {
      console.error('placeBet error:', error);
      socket.emit('betFailed', 'Server error');
    }
  });

  socket.on('cashOut', async ({ username, panelId }) => {
    try {
      const winAmount = game.cashOut(username, panelId);
      if (winAmount) {
        await addBalance(username, winAmount);
        socket.emit('cashOutSuccess', { amount: winAmount, username, panelId });
      }
    } catch (error) {
      console.error('cashOut error:', error);
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

// ─── Auth Routes ─────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
  const { username, password, phone } = req.body;

  const phoneRegex = /^(?:254|\+254|0)?((?:7|1)(?:(?:[0-9][0-9])|[0-9])\d{6})$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    if (useMongo) {
      const existing = await User.findOne({ $or: [{ username }, { phone }] });
      if (existing) return res.status(400).json({ error: 'Username or phone already exists' });
      const newUser = await User.create({ username, phone, password: hashedPassword });
      return res.json({ success: true, username, balance: newUser.balance });
    } else {
      const db = await getDb();
      const existing = await db.get('SELECT username FROM users WHERE username = ? OR phone = ?', [username, phone]);
      if (existing) return res.status(400).json({ error: 'Username or phone already exists' });
      await db.run('INSERT INTO users (username, phone, password) VALUES (?, ?, ?)', [username, phone, hashedPassword]);
      return res.json({ success: true, username, balance: 500 });
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await findUser(username);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ success: true, username, balance: user.balance });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/withdraw', async (req, res) => {
  const { username, amount, phoneNumber } = req.body;
  try {
    const balance = await getUserBalance(username);
    if (balance === null || balance < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    await deductBalance(username, amount);
    setTimeout(() => {
      res.json({ success: true, message: `KSH ${amount} sent to ${phoneNumber} via M-Pesa`, newBalance: balance - amount });
    }, 1500);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  try {
    let leaders;
    if (useMongo) {
      leaders = await User.find({}, 'username phone balance').sort({ balance: -1 }).limit(10);
    } else {
      const db = await getDb();
      leaders = await db.all('SELECT username, phone, balance FROM users ORDER BY balance DESC LIMIT 10');
    }
    res.json(leaders);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Serve Frontend ───────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '../dist')));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} [DB: ${useMongo ? 'MongoDB' : 'SQLite'}]`);
});
