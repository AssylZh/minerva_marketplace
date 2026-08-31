# Minerva Marketplace

A peer-to-peer marketplace for Minerva University students to buy, sell, and request items within the Minerva community. Built with Flask (backend) and React (frontend).

**Live App**: [frontend-nu-six-12.vercel.app](https://frontend-nu-six-12.vercel.app)
**Backend API**: [minerva-marketplace-api-production.up.railway.app](https://minerva-marketplace-api-production.up.railway.app/api/health)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      CLIENT (Browser)                    │
│                                                         │
│  React 19 SPA                                           │
│  Pages: Home, Browse, Post, Item Detail, Edit, Messages,│
│         Dashboard, Login, Signup                         │
│  Components: Header, ItemCard, StatBox, Toast, etc.     │
│  Services: authService, itemService, api (messaging)    │
│  Context: AuthContext (JWT in localStorage)              │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP/JSON + multipart/form-data
                         │ Authorization: Bearer <JWT>
                         ▼
┌─────────────────────────────────────────────────────────┐
│                      SERVER (Flask)                      │
│                                                         │
│  Routes (HTTP layer)        Services (business logic)   │
│  ┌───────────────────┐     ┌───────────────────────┐   │
│  │ auth.py           │────►│ auth_service.py        │   │
│  │ items.py          │────►│ item_service.py        │   │
│  │ messages.py       │────►│ message_service.py     │   │
│  │ dashboard.py      │────►│ (uses item + msg svc)  │   │
│  └───────────────────┘     └───────────────────────┘   │
│                                                         │
│  Models: User, Item, Conversation, Message              │
│  Uploads: Cloudinary (production) / local (dev)         │
│  Migrations: Alembic via Flask-Migrate                  │
└─────────────────────────┬───────────────────────────────┘
                          │ SQL
                          ▼
                   PostgreSQL (prod)
                   SQLite (local dev)
```

### Separation of Concerns

**Backend** follows a three-layer architecture:
- **Routes** handle HTTP only: parse requests, check auth, return JSON. No business logic.
- **Services** contain all business logic: validation, querying, filtering, sorting. No Flask request/response objects.
- **Models** define the database schema via SQLAlchemy ORM. Provide `to_dict()` serialization.

**Frontend** separates concerns similarly:
- **Pages** are route-level components that compose UI and call services.
- **Components** are reusable UI elements with no API knowledge.
- **Services** abstract all API calls behind named functions.
- **Context** (AuthContext) manages auth state and JWT storage synchronously from localStorage.

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19.2 |
| Routing | React Router | 7.13 |
| Backend | Flask | 3.1 |
| ORM | Flask-SQLAlchemy | 3.1 |
| Auth | Flask-JWT-Extended | 4.7 (7-day token expiry) |
| Database | SQLite (dev) / PostgreSQL (prod via Neon) |
| Migrations | Flask-Migrate (Alembic) | 4.1 |
| Image Storage | Cloudinary (prod) / local filesystem (dev) |
| CORS | Flask-CORS | 5.0 |
| WSGI | Gunicorn | 23.0 |
| Testing | pytest (backend, 70 tests) + React Testing Library (frontend) |
| Deployment | Railway (backend) + Vercel (frontend) + Neon (PostgreSQL) |
| Containerization | Docker + Docker Compose |

## Features

- **Auth**: Signup with Minerva email validation (`@uni.minerva.edu` / `@minerva.edu`), JWT login (7-day expiry), protected routes
- **Dual Post Flows**: Separate forms for selling (offering) and requesting items with per-type validation
- **Listings**: Post items with image upload (Cloudinary), condition, category, purchased from/year, edit via dedicated page, mark as sold, delete with cascade
- **Browse**: Server-side keyword search with synonym expansion (earbuds→headphones, sofa→couch, etc.), category filter, city filter, price range filter (min/max), sort (newest/oldest/price asc/desc), pagination with Load More, sold items deprioritized
- **Seller Profiles**: Name, city, cohort, join date on item detail page
- **Messaging**: Start conversations from item detail, real-time polling (5s), message timestamps, read receipts (Seen/Sent), image sharing in messages, edit/delete (soft delete) own messages, unread count badge in navbar, unread dot indicator per conversation, draft persistence in localStorage
- **Dashboard**: Active listings, sold items, quick stats, recent messages
- **Dark Mode**: Default for new visitors, toggle persists in localStorage, inline script prevents light flash on load, all colors use CSS custom properties
- **Responsive**: All pages work on mobile
- **Empty States**: Helpful messages with CTAs when no data exists
- **Loading States**: Prevents flash of empty content while data loads

## Database Schema

```
users                    items
├─ id (PK)               ├─ id (PK)
├─ email (unique)        ├─ seller_id (FK → users)
├─ password_hash         ├─ title, description
├─ first_name            ├─ price (cents), currency
├─ last_name             ├─ category, condition
├─ city, cohort          ├─ listing_type (offering/request)
├─ created_at            ├─ status (active/sold)
└─ updated_at            ├─ location, image_url
                         ├─ purchased_from, purchased_year
conversations            └─ created_at, updated_at
├─ id (PK)
├─ item_id (FK → items)  messages
├─ buyer_id (FK → users) ├─ id (PK)
├─ seller_id (FK → users)├─ conversation_id (FK)
└─ created_at            ├─ sender_id (FK → users)
                         ├─ body, image_url
                         ├─ created_at, read_at
                         └─ deleted_at (soft delete)
```

## API Endpoints

### Auth (`/api/auth`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/signup` | No | Create account (Minerva email, 6+ char password) |
| POST | `/api/auth/login` | No | Login, returns JWT (7-day expiry) |

### Items (`/api`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/items` | No | List items (`?q=`, `?category=`, `?city=`, `?listing_type=`, `?sort=`, `?min_price=`, `?max_price=`, `?page=`, `?per_page=`) |
| GET | `/api/items/:id` | No | Get single item with seller profile |
| POST | `/api/items` | JWT | Create item (JSON or multipart with image) |
| PUT | `/api/items/:id` | JWT | Update item (owner only) |
| DELETE | `/api/items/:id` | JWT | Delete item with cascade (owner only) |
| GET | `/api/categories` | No | List valid categories (8) |
| GET | `/api/cities` | No | List cities with active listings |

### Messages (`/api/messages`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/messages/conversations` | JWT | List conversations (with `has_unread` flag) |
| POST | `/api/messages/conversations` | JWT | Start conversation about an item |
| GET | `/api/messages/conversations/:id` | JWT | Get messages in conversation |
| POST | `/api/messages/conversations/:id` | JWT | Send message (text or multipart with image) |
| GET | `/api/messages/unread-count` | JWT | Get unread message count |
| POST | `/api/messages/conversations/:id/read` | JWT | Mark conversation as read |
| PUT | `/api/messages/:id` | JWT | Edit message (sender only) |
| DELETE | `/api/messages/:id` | JWT | Soft delete message (sender only) |

### Dashboard (`/api/me`)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/me/dashboard` | JWT | Active/sold listings, stats, recent messages |

### Health
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | No | Returns `{"status": "ok"}` |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///app.db` | Database connection string (PostgreSQL in production) |
| `JWT_SECRET_KEY` | insecure dev default | Secret for signing JWTs (must set in production) |
| `CORS_ORIGINS` | `*` | Comma-separated allowed origins |
| `CLOUDINARY_URL` | (none) | Cloudinary connection URL for persistent image uploads |
| `PORT` | `5001` | Backend server port |
| `UPLOAD_DIR` | `static/uploads/` | Local upload directory (used when CLOUDINARY_URL not set) |
| `REACT_APP_API_ORIGIN` | `http://127.0.0.1:5001` | Backend origin for frontend API calls |

## Deployment

The app is deployed with **Railway** (backend), **Vercel** (frontend), and **Neon** (PostgreSQL).

### Backend (Railway)

The backend runs as a Docker container on Railway with gunicorn. Database migrations run automatically on each deploy via `FLASK_APP=backend.app flask db upgrade`.

### Frontend (Vercel)

The frontend is a static React build deployed to Vercel. The `REACT_APP_API_ORIGIN` environment variable points to the Railway backend URL. SPA routing is handled via `vercel.json` rewrites.

### Database (Neon)

PostgreSQL hosted on Neon (free tier, no expiry). Connection string is set as `DATABASE_URL` on Railway.

## Docker Setup

Run the entire stack locally with Docker Compose:

```bash
# Create .env file with a JWT secret
echo "JWT_SECRET_KEY=$(python3 -c 'import secrets; print(secrets.token_hex(32))')" > .env

# Start all services
docker compose up --build

# Stop
docker compose down
```

This starts:
- Backend on http://localhost:5001 (Flask + gunicorn)
- Frontend on http://localhost:3000 (React served via `npx serve`)
- PostgreSQL on port 5433

The backend waits for PostgreSQL to be healthy before starting, and runs database migrations automatically.

## Local Development Setup (without Docker)

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm

### Backend

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r backend/requirements.txt
python -m backend.app
```

The backend runs on http://localhost:5001. The database file (`instance/app.db`) is created automatically on first run via SQLite.

### Frontend

```bash
cd frontend
npm install
npm start
```

The frontend runs on http://localhost:3000.

### Running Both

Open two terminal windows:

```bash
# Terminal 1 — Backend
source venv/bin/activate
python -m backend.app

# Terminal 2 — Frontend
cd frontend
npm start
```

## Testing

### Backend (70 tests)

```bash
source venv/bin/activate
python -m pytest backend/tests/ -v
```

Covers: auth (13), items CRUD + search + filters + sort + pagination + price range + sold deprioritization + purchase details (38), messages + edit/delete (11), dashboard (6), plus synonym search tests.

### Frontend

```bash
cd frontend
npm test
```

Covers: Login, Signup, Browse (Items), Item detail, ProtectedRoute, auth forms.

## Project Structure

```
minerva-marketplace/
├── backend/
│   ├── __init__.py              # db + migrate initialization
│   ├── app.py                   # App factory, blueprint registration, logging
│   ├── models.py                # SQLAlchemy models (User, Item, Conversation, Message)
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── build.sh                 # Deploy build script (pip install + flask db upgrade)
│   ├── routes/
│   │   ├── auth.py              # Signup/login endpoints
│   │   ├── items.py             # Item CRUD + search/filter
│   │   ├── messages.py          # Messaging + edit/delete endpoints
│   │   └── dashboard.py         # Dashboard summary endpoint
│   ├── services/
│   │   ├── auth_service.py      # Auth logic, email validation, password hashing
│   │   ├── item_service.py      # Item queries, validation, CRUD, Cloudinary upload, synonym search
│   │   └── message_service.py   # Conversation and message logic, unread tracking
│   ├── utils/
│   │   └── message_media.py     # Message image upload validation + Cloudinary
│   ├── migrations/              # Alembic migrations (4 migration files)
│   └── tests/
│       ├── conftest.py          # Shared fixtures
│       ├── test_auth.py         # 13 auth tests
│       ├── test_items.py        # 38 item tests
│       ├── test_messages.py     # 11 message tests
│       └── test_dashboard.py    # 6 dashboard tests
├── frontend/
│   ├── public/
│   │   └── index.html           # Dark mode inline script
│   ├── src/
│   │   ├── App.js               # Router setup with all routes
│   │   ├── config.js            # API_BASE, API_ORIGIN, image helpers, price formatting
│   │   ├── context/
│   │   │   └── AuthContext.js   # Sync auth from localStorage (no flash)
│   │   ├── components/          # Header, ItemCard (timeAgo, badges), Button, Toast, etc.
│   │   ├── pages/               # Home, Items, Item, EditItem, Post, Messages, Dashboard, Login, Signup
│   │   ├── hooks/
│   │   │   └── useUnreadMessages.js  # Real-time unread polling + notifications
│   │   ├── services/
│   │   │   ├── api.js           # apiFetch wrapper, message APIs, edit/delete
│   │   │   ├── authService.js   # loginUser, registerUser
│   │   │   └── itemService.js   # fetchItems
│   │   ├── __tests__/           # RTL tests (Item, Items, Login, Signup, ProtectedRoute)
│   │   └── index.css            # CSS variables, dark mode, responsive, all component styles
│   ├── Dockerfile
│   ├── vercel.json              # Vercel build + SPA rewrites
│   └── package.json
├── migrations/                  # Alembic migrations directory (used by Docker/Railway)
├── docker-compose.yml           # Backend + Frontend + PostgreSQL
├── Dockerfile                   # Root Dockerfile for Railway deployment
├── render.yaml                  # Render deployment config (legacy)
├── .env.example                 # Required environment variables
├── ARCHITECTURE.md              # Detailed architecture diagram
└── README.md
```
