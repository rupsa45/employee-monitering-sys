require('dotenv').config()
let express = require('express');
const cors = require('cors');

const { connectDatabase } = require('./config/prismaConfig')
let commonRouter = require('./urls')
let logger = require('./utils/logger')

let app = express();

// CORS configuration for Electron app
app.use(cors({
  origin: ['http://localhost:3000', 'https://go.tellistechnologies.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/', commonRouter)

const HOST = "localhost";
const PORT = process.env.PORT || 8000
const serverLink = `Server Started on http://${HOST}:${PORT}`

// Connect to database and start server
async function startServer() {
  try {
    await connectDatabase();
    
    const server = app.listen(PORT, () => {
      console.log("Express server listening on Port: ", PORT)
      logger.info(serverLink)
    })

    module.exports = server
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
