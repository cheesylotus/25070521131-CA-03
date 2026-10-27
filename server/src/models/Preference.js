import mongoose from 'mongoose';

const currencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY'];

const preferenceSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, default: 'default' },
    displayName: { type: String, required: true, trim: true, maxlength: 60, default: 'My account' },
    email: { type: String, trim: true, lowercase: true, maxlength: 120, default: '' },
    currency: { type: String, enum: currencies, default: 'USD' },
    monthlyBudget: { type: Number, min: 0, max: 100000000, default: 0 },
    weekStartsOn: { type: String, enum: ['Monday', 'Sunday'], default: 'Monday' },
  },
  { timestamps: true },
);

export default mongoose.model('Preference', preferenceSchema);