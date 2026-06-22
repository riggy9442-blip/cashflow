import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcrypt';
import GameState from './gameLogic.js';

// DB abstraction — uses MongoDB if MONGO_URI is set, else SQLite
import { connectDB, User, Transaction } from './mongo.js';
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
const game = new GameState(io, async (username, panelId, winAmount, multiplier) => {
  try {
    await addBalance(username, winAmount);
    await addTransaction(username, 'win', winAmount, { panelId, multiplier, autoCashOut: true });
    const newBalance = await getUserBalance(username);
    io.emit('cashOutSuccess', { amount: winAmount, username, panelId, newBalance });
  } catch (err) {
    console.error('Auto-cashout DB error:', err);
  }
});
const chatHistory = [];

// ─── DB Helpers (abstracted) ─────────────────────────────────────────────────
async function findUser(loginId) {
  if (useMongo) return User.findOne({ $or: [{ username: loginId }, { phone: loginId }] });
  const db = await getDb();
  return db.get('SELECT * FROM users WHERE username = ? OR phone = ?', [loginId, loginId]);
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

async function addTransaction(username, type, amount, metadata = {}) {
  if (useMongo) {
    return Transaction.create({ username, type, amount, metadata });
  }
  const db = await getDb();
  return db.run('INSERT INTO transactions (username, type, amount, metadata) VALUES (?, ?, ?, ?)', 
    [username, type, amount, JSON.stringify(metadata)]);
}

async function processReferralCommission(betUsername, betAmount) {
  try {
    const user = await findUser(betUsername);
    if (!user || !user.referredBy) return;
    
    // 1% commission
    const commission = betAmount * 0.01;
    await addBalance(user.referredBy, commission);
    await addTransaction(user.referredBy, 'referral_commission', commission, { 
      referredUser: betUsername, 
      betAmount 
    });
  } catch (err) {
    console.error('Commission error:', err);
  }
}

// ─── Sockets ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  socket.emit('gameState', game.getState());
  socket.emit('chatHistory', chatHistory);

  socket.on('placeBet', async ({ username, amount, panelId, autoCashOut }) => {
    try {
      const balance = await getUserBalance(username);
      if (balance === null || balance < amount) {
        return socket.emit('betFailed', 'Insufficient balance');
      }
      if (game.placeBet(username, amount, panelId, autoCashOut)) {
        await deductBalance(username, amount);
        await addTransaction(username, 'bet', -amount, { panelId, autoCashOut });
        
        // Process referral commission asynchronously
        processReferralCommission(username, amount);
        
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
        await addTransaction(username, 'win', winAmount, { panelId, multiplier: game.multiplier });
        const newBalance = await getUserBalance(username);
        socket.emit('cashOutSuccess', { amount: winAmount, username, panelId, newBalance });
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
  const { username, password, phone, ref } = req.body;

  const phoneRegex = /^(?:254|\+254|0)?((?:7|1)(?:(?:[0-9][0-9])|[0-9])\d{6})$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Invalid Kenyan phone number' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const referredBy = ref ? ref.trim() : null;

    if (useMongo) {
      const existing = await User.findOne({ $or: [{ username }, { phone }] });
      if (existing) return res.status(400).json({ error: 'Username or phone already exists' });
      const newUser = await User.create({ username, phone, password: hashedPassword, referredBy });
      return res.json({ success: true, username, balance: newUser.balance });
    } else {
      const db = await getDb();
      const existing = await db.get('SELECT username FROM users WHERE username = ? OR phone = ?', [username, phone]);
      if (existing) return res.status(400).json({ error: 'Username or phone already exists' });
      await db.run('INSERT INTO users (username, phone, password, referredBy) VALUES (?, ?, ?, ?)', [username, phone, hashedPassword, referredBy]);
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
    // Return the actual username from the db instead of what they typed (in case they typed a phone number)
    res.json({ success: true, username: user.username, balance: user.balance });
  } catch (error) {
    console.error('Login error:', error);
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
    await addTransaction(username, 'withdraw', -amount, { phoneNumber });
    setTimeout(() => {
      res.json({ success: true, message: `KSH ${amount} sent to ${phoneNumber} via M-Pesa`, newBalance: balance - amount });
    }, 1500);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/balance/:username', async (req, res) => {
  try {
    const balance = await getUserBalance(req.params.username);
    if (balance === null) return res.status(404).json({ error: 'User not found' });
    res.json({ balance });
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

app.get('/api/transactions/:username', async (req, res) => {
  const { username } = req.params;
  try {
    let txs;
    if (useMongo) {
      txs = await Transaction.find({ username }).sort({ createdAt: -1 }).limit(50);
    } else {
      const db = await getDb();
      txs = await db.all('SELECT * FROM transactions WHERE username = ? ORDER BY created_at DESC LIMIT 50', [username]);
      txs = txs.map(t => ({ ...t, metadata: t.metadata ? JSON.parse(t.metadata) : {} }));
    }
    res.json(txs);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/referrals/:username', async (req, res) => {
  const { username } = req.params;
  try {
    let count = 0;
    let earned = 0;
    if (useMongo) {
      count = await User.countDocuments({ referredBy: username });
      const txs = await Transaction.find({ username, type: 'referral_commission' });
      earned = txs.reduce((sum, t) => sum + t.amount, 0);
    } else {
      const db = await getDb();
      const row = await db.get('SELECT COUNT(*) as count FROM users WHERE referredBy = ?', [username]);
      count = row ? row.count : 0;
      const txRows = await db.all('SELECT amount FROM transactions WHERE username = ? AND type = ?', [username, 'referral_commission']);
      earned = txRows.reduce((sum, t) => sum + t.amount, 0);
    }
    res.json({ count, earned });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Admin Routes ────────────────────────────────────────────────────────────
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

app.post('/api/admin/stats', async (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  try {
    let users;
    if (useMongo) {
      users = await User.find({}, 'username phone balance createdAt').sort({ balance: -1 });
    } else {
      const db = await getDb();
      users = await db.all('SELECT username, phone, balance FROM users ORDER BY balance DESC');
    }
    
    const totalBalance = users.reduce((sum, u) => sum + (u.balance || 0), 0);
    res.json({ users, totalBalance, count: users.length });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/admin/adjust-balance', async (req, res) => {
  const { password, targetUsername, amount } = req.body;
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: 'Unauthorized' });

  try {
    await addBalance(targetUsername, amount);
    res.json({ success: true, message: `Added ${amount} to ${targetUsername}` });
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
