const app = require('./src/app');
const env = require('./src/config/env');
const { connectDB, closeDB } = require('./src/config/db');

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught Exception:', err.name, err.message);
  process.exit(1);
});

const startServer = async () => {
  // Connect to Database
  await connectDB();

  // Start HTTP Server
  const server = app.listen(env.PORT, () => {
    console.log(`[Server] CareerPilot backend running in ${env.NODE_ENV} mode on port ${env.PORT}`);
    console.log(`[Server] Health check endpoint: http://localhost:${env.PORT}/api/v1/health`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('[Process] Unhandled Rejection:', err.name, err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  const reminderService = require('./src/services/reminder.service');
  // Initial tick and 5-minute recurring scheduler per FR-098
  reminderService.runSchedulerTick();
  const reminderInterval = setInterval(() => {
    reminderService.runSchedulerTick();
  }, 5 * 60 * 1000);

  // Graceful shutdown on process termination signals
  const shutdown = async (signal) => {
    console.log(`\n[Process] Received ${signal}. Starting graceful shutdown...`);
    clearInterval(reminderInterval);
    server.close(async () => {
      console.log('[Server] HTTP server closed');
      await closeDB();
      process.exit(0);
    });

    // Force close after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('[Process] Forced shutdown timeout exceeded');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};

startServer();
