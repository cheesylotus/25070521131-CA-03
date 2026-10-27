import { Router } from 'express';
import mongoose from 'mongoose';
import Expense from '../models/Expense.js';

const router = Router();
const categories = new Set([
  'Food & dining',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Other',
]);

function validationMessage({ title, amount, category, date, note = '' }) {
  if (typeof title !== 'string' || !title.trim() || title.trim().length > 80) {
    return 'Enter a description up to 80 characters.';
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0.01 || amount > 100000000) {
    return 'Enter a valid expense amount.';
  }
  if (!categories.has(category)) return 'Choose a valid category.';
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T12:00:00.000Z`))) {
    return 'Choose a valid date.';
  }
  if (typeof note !== 'string' || note.length > 180) return 'Notes must be 180 characters or fewer.';
  return '';
}

router.get('/', async (_request, response, next) => {
  try {
    const expenses = await Expense.find().sort({ date: -1, createdAt: -1 }).limit(500);
    response.json(expenses);
  } catch (error) {
    next(error);
  }
});

router.post('/', async (request, response, next) => {
  try {
    const { title, amount, category, date, note = '' } = request.body;
    const message = validationMessage(request.body);
    if (message) return response.status(400).json({ message });

    const expense = await Expense.create({
      title: title.trim(),
      amount,
      category,
      date: new Date(`${date}T12:00:00.000Z`),
      note: note.trim(),
    });
    response.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: 'Invalid expense id.' });
    }
    const message = validationMessage(request.body);
    if (message) return response.status(400).json({ message });
    const { title, amount, category, date, note = '' } = request.body;
    const expense = await Expense.findByIdAndUpdate(
      request.params.id,
      { title: title.trim(), amount, category, date: new Date(`${date}T12:00:00.000Z`), note: note.trim() },
      { new: true, runValidators: true },
    );
    if (!expense) return response.status(404).json({ message: 'Expense not found.' });
    response.json(expense);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (request, response, next) => {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(400).json({ message: 'Invalid expense id.' });
    }
    const expense = await Expense.findByIdAndDelete(request.params.id);
    if (!expense) return response.status(404).json({ message: 'Expense not found.' });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;