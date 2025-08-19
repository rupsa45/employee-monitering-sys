const { PrismaClient } = require('@prisma/client');
// Logger removed for cleaner output

const prisma = new PrismaClient({
  log: [], // No logging to reduce noise
});

// Connect to database
async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log('Database connected successfully');
  } catch (error) {
    console.error('Database connection failed:', error);
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
