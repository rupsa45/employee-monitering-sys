const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// Connect to database
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
    logger.log("info", "PostgreSQL Database connected successfully");
  } catch (error) {
    console.error('Database connection failed:', error);
    logger.log("error", `Database connection failed: ${error.message}`);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

module.exports = {
  prisma,
  connectDatabase
};
