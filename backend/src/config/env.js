const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/careerpilot',
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'careerpilot_access_super_secret_min_32_characters_random_key_2026',
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'careerpilot_refresh_super_secret_min_32_characters_random_key_2026',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  STORAGE_DRIVER: process.env.STORAGE_DRIVER || 'local',
  S3_BUCKET: process.env.S3_BUCKET || '',
  S3_REGION: process.env.S3_REGION || 'us-east-1',
  S3_ENDPOINT: process.env.S3_ENDPOINT || '',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'noreply@careerpilot.app'
};

module.exports = env;
