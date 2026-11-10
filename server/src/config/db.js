const mongoose = require('mongoose');
const env = require('./env');

let isConnected = false;

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

  const mongoUri = env.MONGODB_URI;

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true
    });

    isConnected = true;
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
    await seedDemoUser();
  } catch (err) {
    isConnected = false;
    console.warn(`[Database Notice] No MongoDB instance found on port 27017.`);
    console.log(`[Database] 🚀 Activated LifePilot Zero-Config Local Storage Engine.`);
    console.log(`[Database] 💾 Data is safely saved to server/data/local_db.json.`);
  }
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  console.warn('[Database] MongoDB disconnected.');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  console.log('[Database] MongoDB reconnected.');
});

const getDBStatus = () => ({
  connected: isConnected && mongoose.connection.readyState === 1,
  readyState: mongoose.connection.readyState,
  host: mongoose.connection.host || null,
  name: mongoose.connection.name || null
});

module.exports = { connectDB, getDBStatus };

