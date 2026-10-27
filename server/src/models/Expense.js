import mongoose from 'mongoose';

const categories = [
  'Food & dining',
  'Transport',
  'Shopping',
  'Bills',
  'Health',
  'Entertainment',
  'Other',
];

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0.01, max: 100000000 },
    category: { type: String, required: true, enum: categories },
    date: { type: Date, required: true },
    note: { type: String, trim: true, maxlength: 180, default: '' },
  },
  { timestamps: true },
);

expenseSchema.index({ date: -1, createdAt: -1 });

export default mongoose.model('Expense', expenseSchema);