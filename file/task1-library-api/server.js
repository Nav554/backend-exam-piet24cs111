const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const bookRoutes = require('./routes/bookRoutes');

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const app = express();

app.use((req, res, next) => {
  console.log(req.method, req.originalUrl);
  next();
});

app.use(express.json());
app.use('/books', bookRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.name === 'ValidationError' || error.name === 'CastError') {
    return res.status(400).json({ error: error.message });
  }
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON body.' });
  }
  if (error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ error: error.message });
  }

  console.error(error);
  res.status(500).json({ error: 'Internal server error.' });
});

async function start() {
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in the Library API .env file.');

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });

  const server = app.listen(3000, '127.0.0.1', () => {
    console.log('Library API running at http://127.0.0.1:3000');
  });
  server.on('error', reportStartupError);
}

async function reportStartupError(error) {
  console.error('Library API could not start:', error.message);
  process.exitCode = 1;
  await mongoose.disconnect();
}

start().catch(reportStartupError);
