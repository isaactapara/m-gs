<p align="center">
  <img src="frontend/public/brand-logo-v2.png" alt="M&G's Restaurant Hub" width="200" />
</p>

# M&G's Restaurant Hub

A production-grade Point-of-Sale system built for restaurant operations in the Kenyan market, featuring real-time M-Pesa payment integration, floor plan management, and comprehensive sales reporting.

---

## System Architecture

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Vite, Vanilla JS, TailwindCSS | Multi-page SPA with reactive state management |
| Backend | Node.js, Express 5 | RESTful API with domain-driven service architecture |
| Database | PostgreSQL (Supabase) | Relational persistence via Prisma ORM |
| Payments | Safaricom Daraja API | STK Push, callback processing, automated reconciliation |

---

## Project Structure

```
backend/
  prisma/
    schema.prisma              # Database schema definitions
  src/
    config/                    # Environment and Prisma client configuration
    core/                      # Shared utilities (logger, error classes, constants)
    mappers/                   # Prisma-to-frontend payload transformation layer
    middlewares/               # Auth, rate limiting, error handling, request context
    domains/
      auth/                    # User authentication (login, register, JWT)
      billing/                 # Bill creation, status management
      menu/                    # Menu item CRUD operations
      payments/                # M-Pesa STK Push, callbacks, reconciliation engine
      reports/                 # Revenue analytics and trend reporting
      sharedState/             # Restaurant settings, floor plan management
      audit/                   # System-wide audit trail logging
  validators/                  # Express-validator request schemas

frontend/
  src/
    core/                      # State management (stores), API client
    components/                # Shared layout components
    pages/                     # Page-level entry points
    styles/                    # TailwindCSS, theme, fonts
  public/                      # Static assets
```

---

## Prerequisites

- Node.js >= 18.x
- PostgreSQL 15+ (or a Supabase project)
- Safaricom Daraja API sandbox credentials (for M-Pesa integration)

---

## Environment Configuration

Copy the example environment file and populate it with your credentials:

```bash
cp backend/.env.example backend/.env
```

### Required Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `DIRECT_URL` | Direct database connection (required by Prisma) |
| `JWT_SECRET` | Minimum 10-character secret for token signing |
| `MPESA_CONSUMER_KEY` | Daraja API consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja API consumer secret |
| `MPESA_PASSKEY` | Lipa Na M-Pesa passkey |
| `MPESA_SHORTCODE` | Business shortcode |
| `MPESA_CALLBACK_URL` | Publicly accessible callback endpoint |
| `MPESA_CALLBACK_SECRET` | Shared secret for callback authorization |

---

## Installation

```bash
# Install backend dependencies
cd backend
npm install

# Generate the Prisma client
npx prisma generate

# Push the schema to your database
npx prisma db push

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Development

Start the backend and frontend development servers:

```bash
# Terminal 1: Backend API (port 5000)
cd backend
npm run dev

# Terminal 2: Frontend (port 5173)
cd frontend
npm run dev
```

### Prisma Utilities

```bash
npm run prisma:studio      # Visual database browser
npm run prisma:migrate:dev # Create and apply migrations
npm run prisma:format      # Format schema file
npm run prisma:validate    # Validate schema syntax
```

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | None | Register a new user |
| POST | `/api/auth/login` | None | Authenticate and receive JWT |
| GET | `/api/menu` | JWT | List active menu items |
| POST | `/api/menu` | Owner | Create a menu item |
| GET | `/api/bills` | JWT | List bills (filtered by role) |
| POST | `/api/bills` | JWT | Create a new bill |
| POST | `/api/payments/initiate` | JWT | Initiate M-Pesa STK Push |
| POST | `/api/payments/status` | JWT | Poll payment status |
| POST | `/api/payments/callback` | M-Pesa | Process Daraja callback |
| GET | `/api/settings` | JWT | Retrieve restaurant settings |
| PATCH | `/api/settings` | Owner | Update restaurant settings |
| GET | `/api/tables` | JWT | Retrieve floor plan |
| PUT | `/api/tables` | Staff | Update floor plan layout |
| GET | `/api/reports` | JWT | Revenue summary and trends |
| GET | `/api/health` | None | Service health check |

---

## Payment Flow

1. Cashier initiates payment via the frontend billing interface.
2. Backend acquires an atomic database lock on the bill to prevent duplicate requests.
3. An STK Push is dispatched to the customer's phone via the Daraja API.
4. Safaricom posts the transaction result to the callback endpoint.
5. The reconciliation engine runs on a configurable interval to resolve any missed callbacks.

---

## License

ISC
