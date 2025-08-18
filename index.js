require('dotenv').config()
let express = require('express');
const cors = require('cors');
 
const { connectDatabase } = require('./config/prismaConfig')
let commonRouter = require('./urls')
let logger = require('./utils/logger')
const { initializeCronJobs } = require('./scheduler/cronJobs')
 
let app = express();
 
// Environment-based CORS configuration
const isDevelopment = process.env.NODE_ENV !== 'production';
console.log(isDevelopment);

 
const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://monitering-system-client.vercel.app",
    "https://employee-monitering-sys-client.vercel.app"
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200 // Some legacy browsers (IE11, various SmartTVs) choke on 204
};
 
app.use(cors(corsOptions));
 
// Additional CORS preflight handling
app.options('*', cors(corsOptions));
 
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/', commonRouter)
 
// Environment-based host configuration
const HOST = isDevelopment ? "localhost" : "0.0.0.0";
const PORT = process.env.PORT || 8000
const serverLink = isDevelopment
  ? `Server Started on http://${HOST}:${PORT}`
  : `Server Started on port ${PORT}`
 
// Connect to database and start server
async function startServer() {
  try {
    await connectDatabase();
   
    // Initialize cron jobs for scheduled notifications
    initializeCronJobs();
   
    const server = app.listen(PORT, HOST, () => {
      console.log("Express server listening on Port: ", PORT)
      logger.info(serverLink)
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
    })
 
    module.exports = server
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}
 
startServer();
 