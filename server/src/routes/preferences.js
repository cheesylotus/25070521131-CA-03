import { Router } from 'express';
import Preference from '../models/Preference.js';

const router = Router();
const currencies = new Set(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY']);
const defaults = {
  displayName: 'My account',
  email: '',
  currency: 'USD',
  monthlyBudget: 0,
  weekStartsOn: 'Monday',
};

router.get('/', async (_request, response, next) => {
  try {
    const preference = await Preference.findOne({ key: 'default' }).select('-key').lean();
    response.json(preference || defaults);
  } catch (error) {
    next(error);
  }
});

router.put('/', async (request, response, next) => {
  try {
    const { displayName, email = '', currency, monthlyBudget, weekStartsOn } = request.body;
    if (typeof displayName !== 'string' || !displayName.trim() || displayName.trim().length > 60) {
      return response.status(400).json({ message: 'Enter a name up to 60 characters.' });
    }
    if (typeof email !== 'string' || email.length > 120 || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return response.status(400).json({ message: 'Enter a valid email address or leave it blank.' });
    }
    if (!currencies.has(currency)) {
      return response.status(400).json({ message: 'Choose a supported currency.' });
    }
    if (typeof monthlyBudget !== 'number' || !Number.isFinite(monthlyBudget) || monthlyBudget < 0 || monthlyBudget > 100000000) {
      return response.status(400).json({ message: 'Enter a valid monthly budget.' });
    }
    if (!['Monday', 'Sunday'].includes(weekStartsOn)) {
      return response.status(400).json({ message: 'Choose Monday or Sunday as the first day of the week.' });
    }

    const preference = await Preference.findOneAndUpdate(
      { key: 'default' },
      { $set: { displayName: displayName.trim(), email: email.trim(), currency, monthlyBudget, weekStartsOn } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    ).select('-key').lean();
    response.json(preference);
  } catch (error) {
    next(error);
  }
});

export default router;