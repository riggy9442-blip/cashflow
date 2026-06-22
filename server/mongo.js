import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI;

let isConnected = false;

export async function connectDB() {
  if (isConnected) return;
  if (!MONGO_URI) {
    console.warn('⚠️  MONGO_URI not set — falling back to SQLite');
    return;
  }
  try {
    await mongoose.connect(MONGO_URI);
    isConnected = true;
    console.log('✅ MongoDB connected');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    throw err;
  }
}

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  password: { type: String, required: true },
  phone:    { type: String, required: true },
  balance:  { type: Number, default: 500 },
  referredBy: { type: String, default: null }
}, { timestamps: true });

// Transaction Schema
const transactionSchema = new mongoose.Schema({
  username: { type: String, required: true, index: true },
  type:     { type: String, required: true, enum: ['bet', 'win', 'deposit', 'withdraw', 'referral_commission'] },
  amount:   { type: Number, required: true },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
