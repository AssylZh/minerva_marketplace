# Architecture Diagram — Minerva Marketplace

## System Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│                           CLIENT (Browser)                           │
│                                                                      │
│   React 19 (Single Page Application)                                 │
│   ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│   │   Pages    │  │ Components │  │  Services  │  │  Context   │   │
│   │            │  │            │  │            │  │            │   │
│   │ Home       │  │ Header     │  │ authSvc    │  │ AuthContext │   │
│   │ Items      │  │ ItemCard   │  │ itemSvc    │  │  ├─ user   │   │
│   │ Item       │  │ StatBox    │  │ api        │  │  ├─ login  │   │
│   │ Post       │  │ SectionCard│  │            │  │  ├─ logout │   │
│   │ Dashboard  │  │ Button     │  │ Each svc   │  │  └─ JWT in │   │
│   │ Messages   │  │ Body       │  │ calls      │  │  localStorage│  │
│   │ Login      │  │ Heading    │  │ API_BASE   │  │            │   │
│   │ Signup     │  │ Protected  │  │ from       │  └────────────┘   │
│   │            │  │  Route     │  │ config.js  │                    │
│   └──────┬─────┘  └────────────┘  └──────┬─────┘                   │
│          │ renders                        │ fetch()                  │
│          └──────────────────┬─────────────┘                         │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                    HTTP/JSON + multipart/form-data
                    Authorization: Bearer <JWT>
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        SERVER (Flask 3.1)                            │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                     app.py (Factory)                          │  │
│  │  create_app() → Flask + SQLAlchemy + JWTManager + CORS       │  │
│  │  Reads DATABASE_URL and JWT_SECRET_KEY from environment      │  │
│  │  Registers 4 Blueprints:                                     │  │
│  │    auth_bp (/api/auth), items_bp (/api), messages_bp         │  │
│  │    (/api/messages), dashboard_bp (/api/me)                   │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   ROUTES (HTTP Layer)                        │   │
│  │                                                             │   │
│  │  Parse requests, verify JWT, return JSON.                   │   │
│  │  Business logic delegated to services. dashboard.py is a    │   │
│  │  current exception that also queries Item directly.         │   │
│  │                                                             │   │
│  │  auth.py         items.py        messages.py  dashboard.py  │   │
│  │  POST /signup    GET  /items     GET  /conversations GET /me/dash  │   │
│  │  POST /login     POST /items     POST /conversations               │   │
│  │                  PUT  /items/:id GET  /conversations/:id           │   │
│  │                  DELETE /items/:id POST /conversations/:id         │   │
│  │                  GET /categories GET /unread-count           │   │
│  │                  GET /cities                                 │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                           │ function calls                          │
│                           ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                  SERVICES (Business Logic)                   │   │
│  │                                                             │   │
│  │  All validation, filtering, sorting, pagination.            │   │
│  │  No Flask request/response objects. No HTTP awareness.      │   │
│  │                                                             │   │
│  │  auth_service.py       item_service.py   message_service.py │   │
│  │  ├─ signup()           ├─ list_items()   ├─ get_convos()   │   │
│  │  ├─ login()            ├─ create_item()  ├─ start_convo()  │   │
│  │  ├─ is_minerva_email() ├─ update_item()  ├─ get_messages() │   │
│  │  └─ validate_password()├─ delete_item()  ├─ send_message() │   │
│  │                        ├─ validate_data() └─ unread_count() │   │
│  │                        ├─ get_categories()                  │   │
│  │                        └─ get_cities()                      │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                           │ SQLAlchemy ORM                          │
│                           ▼                                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                   MODELS (Data Layer)                        │   │
│  │                                                             │   │
│  │  SQLAlchemy models define schema. to_dict() serialization.  │   │
│  │  No logic beyond data definition and relationships.         │   │
│  │                                                             │   │
│  │  User ──< Item         (one user has many items)            │   │
│  │  User ──< Conversation (as buyer or seller)                 │   │
│  │  Item ──< Conversation (one item has many conversations)    │   │
│  │  Conversation ──< Message (one conversation has many msgs)  │   │
│  │  User ──< Message      (one user sends many messages)       │   │
│  └────────────────────────┬────────────────────────────────────┘   │
│                           │                                         │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ SQL
                            ▼
                 ┌─────────────────────┐
                 │     Database        │
                 │  SQLite (dev)       │
                 │  PostgreSQL (prod)  │
                 └─────────────────────┘
```

## Key Design Decisions

**Service layer pattern**: Routes generally delegate all database access to service functions, making business logic testable in isolation and reusable across routes (e.g., `dashboard.py` reuses `message_service.get_unread_count()`). `dashboard.py` is a current exception that also queries the Item model directly alongside service calls.

**App factory**: `create_app()` reads config from environment variables, making the same codebase deployable to dev/staging/production by changing only env vars. No code changes needed per environment.

**Stateless processes**: All state lives in the database. Flask processes share nothing, enabling horizontal scaling via multiple Gunicorn workers.

**JWT auth**: Tokens are issued at login and stored in the browser's localStorage. The backend validates tokens per-request with no server-side session state.

**Composable API filters**: `GET /api/items` accepts multiple query params (`q`, `category`, `city`, `listing_type`, `sort`, `page`, `per_page`) that compose at the SQL level, keeping filtering efficient regardless of combination.

## Request Flow Example: Posting an Item

```
1. User fills Post form, attaches image
2. Post.js reads JWT from localStorage
3. fetch(API_BASE + "/items", { method: "POST", body: FormData })
4. Flask routes to items_bp → create_item()
5. Route verifies JWT, extracts seller_id
6. Route checks content_type → reads from request.form + request.files
7. Route validates file extension + size
8. Route saves image to static/uploads/
9. Route calls item_service.validate_item_data(data)
10. Route calls item_service.create_item(seller_id, data)
11. Service creates Item model, db.session.commit()
12. Route returns item.to_dict() as JSON, status 201
```
