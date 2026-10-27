import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import expensesRouter from './routes/expenses.js';
import preferencesRouter from './routes/preferences.js';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../.env') });

const app = express();
const port = Number(process.env.PORT) || 5000;
const mongoUri = process.env.MONGO_URI;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok', database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});

app.use('/api/expenses', expensesRouter);
app.use('/api/preferences', preferencesRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  if (error.name === 'ValidationError') {
    return response.status(400).json({ message: 'Please check the expense details and try again.' });
  }
  response.status(500).json({ message: 'Something went wrong while processing the request.' });
});

if (!mongoUri) {
  console.error('MONGO_URI is missing. Copy .env.example to .env and configure your MongoDB connection.');
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  app.listen(port, () => console.log(`FLEXI API listening on http://localhost:${port}`));
} catch (error) {
  console.error(`MongoDB connection failed: ${error.message}`);
  process.exit(1);
}