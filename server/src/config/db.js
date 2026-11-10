const mongoose = require('mongoose');
const env = require('./env');
const { initSQLite } = require('./sqlite');

let isConnected = false;
let activeEngine = 'sqlite3';

const seedDemoUser = async () => {
  try {
    const User = require('../models/User');
    const UserPreference = require('../models/UserPreference');
    const existing = await User.findOne({ email: 'demo@lifepilot.ai' });
    if (!existing) {
      const demoUser = await User.create({
        name: 'Alex Mercer',
        email: 'demo@lifepilot.ai',
        password: 'demopass123',
        bio: 'Explorer, Product Builder & AI Enthusiast',
        role: 'user',
        theme: 'dark'
      });
      await UserPreference.create({ ownerId: demoUser._id });
      console.log('[Database] Auto-seeded demo user: demo@lifepilot.ai (demopass123)');
    }
  } catch (err) {
    console.warn('[Database] Demo user check/seed failed:', err.message);
  }
};

const connectDB = async () => {
  if (isConnected) return;

  // Explicit SQLite local use
  if (env.DB_MODE === 'sqlite') {
    initSQLite();
    activeEngine = 'sqlite3';
    console.log(`[Database] 🚀 Local Mode: SQLite3 Engine active at ${env.SQLITE_PATH}`);
    await seedDemoUser();
    return;
  }

  const mongoUri = env.MONGODB_URI;
  const isAtlas = mongoUri.includes('mongodb+srv://');
  const timeoutMs = isAtlas || env.DB_MODE === 'mongodb' ? 15000 : 3000;

  try {
    console.log(`[Database] Connecting to ${isAtlas ? 'MongoDB Atlas' : 'MongoDB'}...`);
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: timeoutMs,
      autoIndex: true
    });

    isConnected = true;
    activeEngine = 'mongodb';
    console.log(`[Database] 🌐 Connected to MongoDB: ${conn.connection.host}/${conn.connection.name}`);
    await seedDemoUser();
  } catch (err) {
    isConnected = false;
    activeEngine = 'sqlite3';
    console.warn(`[Database Warning] Could not connect to MongoDB: ${err.message}`);
    initSQLite();
    console.log(`[Database] 🚀 Operating on SQLite3 local database: ${env.SQLITE_PATH}`);
    await seedDemoUser();
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  activeEngine = 'sqlite3';
  console.warn('[Database] MongoDB disconnected, operating on SQLite3 fallback.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  activeEngine = 'mongodb';
  console.log('[Database] MongoDB reconnected.');
});

const getDBStatus = () => ({
  connected: true,
  engine: isConnected && mongoose.connection.readyState === 1 ? 'mongodb' : 'sqlite3',
  mongoReadyState: mongoose.connection.readyState,
  sqlitePath: env.SQLITE_PATH,
  mode: env.DB_MODE
});

module.exports = { connectDB, getDBStatus };

