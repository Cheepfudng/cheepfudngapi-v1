import { connectDatabase } from './config/database';
import { env } from './config/env';
import app from './app';
import { logger } from './utils/logger';

const startServer = async (): Promise<void> => {
  try {
    await connectDatabase();

    app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on port ${env.PORT}`);
      logger.info(`📍 Environment: ${env.NODE_ENV}`);
      logger.info(`🔗 http://localhost:${env.PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);

    process.exit(1);
  }
};

void startServer();
