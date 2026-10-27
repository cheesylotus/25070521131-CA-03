# FLEXI Expense Tracker

Full-stack expense tracking with a React/Vite client, Express API, and MongoDB.

## Requirements

- Node.js 20+ and npm
- MongoDB Server running locally, or a MongoDB URI
- MongoDB Compass is optional for inspecting the database

## Setup

1. Install client dependencies from `client/`:

   ```sh
   cd client
   npm install
   ```

2. Install API dependencies from `server/`:

   ```sh
   cd server
   npm install
   ```

3. Configure `server/.env`. The default URI connects to the local `flexi_expense_tracker` database. MongoDB Server must be running.

4. Start both apps from `client/`:

   ```sh
   npm run dev:full
   ```

   Or start the API with `npm run dev` from `server/` and the client with `npm run dev` from `client/` in two terminals.

The Vite app is usually available at `http://localhost:5173`. Set `VITE_CURRENCY` in `client/.env` to change the default currency.

## API

- `GET /api/health`
- `GET`, `POST`, `PUT`, and `DELETE /api/expenses`
- `GET` and `PUT /api/preferences`