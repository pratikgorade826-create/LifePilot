const app = require('./app');
const env = require('./config/env');
const { connectDB } = require('./config/db');

const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

  const server = app.listen(env.PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 LifePilot AI Server running on port ${env.PORT}`);
    console.log(`📡 Environment: ${env.NODE_ENV}`);
    console.log(`🧠 AI Provider: ${env.AI_PROVIDER}`);
    console.log(`🔗 Health Check: http://localhost:${env.PORT}/api/health`);
    console.log(`===============================================`);
  });

  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Promise Rejection:', err);
  });

  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Shutting down gracefully.');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });
};

startServer();
