# FLEXI Expense Tracker

- The frontend is a Vite React app in `client/`; the API is an Express app in `server/`.
- MongoDB via Mongoose is the source of truth for expense data. Do not replace persistence with browser storage.
- Keep expense validation consistent between the React form and the API.
- The frontend API proxy targets `http://localhost:5000`; configure MongoDB through `server/.env`.
- Use the existing visual system and responsive layout when adding UI features.