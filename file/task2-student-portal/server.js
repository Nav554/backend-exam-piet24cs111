const path = require('node:path');
const express = require('express');
const mongoose = require('mongoose');
const helmet = require('helmet');
const cors = require('cors');
const { rateLimit } = require('express-rate-limit');
const Student = require('./models/Student');
const portalRoutes = require('./routes/portalRoutes');

require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const app = express();

app.use(helmet());
app.use(cors());
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in 15 minutes.' }
}));
app.use(express.json());
app.use(portalRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.code === 11000 && error.keyPattern?.email) {
    return res.status(400).json({ error: 'An account with that email already exists.' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: 'Invalid student details.' });
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
  if (!process.env.MONGO_URI) throw new Error('Set MONGO_URI in the Student Portal .env file.');
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
    throw new Error('Set a JWT_SECRET of at least 32 bytes in the Student Portal .env file.');
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  await Student.init();

  const server = app.listen(3001, '127.0.0.1', () => {
    console.log('Student Portal running at http://127.0.0.1:3001');
  });
  server.on('error', reportStartupError);
}

async function reportStartupError(error) {
  console.error('Student Portal could not start:', error.message);
  process.exitCode = 1;
  await mongoose.disconnect();
}

start().catch(reportStartupError);
