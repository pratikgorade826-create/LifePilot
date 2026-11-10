const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_MODE: process.env.DB_MODE || 'auto', // 'sqlite' | 'mongodb' | 'auto'
  SQLITE_PATH: process.env.SQLITE_PATH || path.join(__dirname, '../../data/lifepilot.sqlite3'),
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/lifepilot',
  JWT_SECRET: process.env.JWT_SECRET || 'lifepilot_super_secret_jwt_key_hackathon_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  AI_PROVIDER: process.env.AI_PROVIDER || 'auto', // 'bharatcode' | 'gemini' | 'demo' | 'auto'
  BHARATCODE_API_KEY: process.env.BHARATCODE_API_KEY || '',
  BHARATCODE_BASE_URL: process.env.BHARATCODE_BASE_URL || 'https://api.bharatcode.org/v1',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  MAX_FILE_SIZE_MB: parseInt(process.env.MAX_FILE_SIZE_MB || '15', 10)
};

