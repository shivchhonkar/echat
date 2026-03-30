# Real-Time Customer Support Chat (tawk.to style, simplified)

Full-stack real-time support chat with:
- **Client**: React + Vite (widget + admin inbox)
- **Server**: Node.js + Express + Socket.IO
- **DB**: MongoDB + Mongoose
- **Shared**: common Socket event constants
- **Docker**: full stack via `docker-compose`

## Folder Structure

```
client/
server/
shared/
docker-compose.yml
.env.example
```

## Core Features Implemented

- Floating chat widget for users
- User pre-chat form (name required, email optional)
- Optional phone in pre-chat form
- Real-time messaging (user ↔ admin)
- Typing indicators
- Message timestamps
- MongoDB persistence for sessions/messages
- Admin login (email/password -> JWT)
- Admin inbox layout (left sessions, right conversation)
- Online/offline session status
- Admin online/offline indicator in widget
- Unread count badges in admin list
- Auto-scroll messages
- Socket reconnection (Socket.IO default + enabled)
- Optional new-message beep notification in admin
- Multi-tenant support (tenant-scoped data and admin isolation)
- Tenant signup flow
- Super-admin application for tenant subscription + usage analytics
- Multi-tenant isolation (tenant key + tenant-scoped admin inbox)

## MongoDB Models

- `Tenant`
  - `_id`
  - `name`
  - `slug`
  - `widgetKey`
  - `adminEmail`
  - `adminPassword`

- `UserSession`
  - `_id`
  - `tenantId`
  - `name`
  - `email`
  - `socketId`
  - `status` (`online`/`offline`)
  - `pageUrl`
  - `createdAt`

- `Message`
  - `_id`
  - `tenantId`
  - `sessionId`
  - `sender` (`user` | `admin`)
  - `message`
  - `timestamp`
  - `readByAdmin`

## API Endpoints

- `POST /api/start-session`
- `GET /api/sessions` (admin token required)
- `GET /api/messages/:sessionId`
- `POST /api/admin/login`
- `GET /api/admin-status`
- `POST /api/tenant/signup`
- `POST /api/super-admin/login`
- `GET /api/super-admin/tenants`
- `PATCH /api/super-admin/tenants/:tenantId/subscription`

### Tenant-aware usage
- Widget start session requires `tenantKey`
- Admin login requires `tenantSlug`
- Sessions/messages are isolated by tenant

## Socket Events

Client → Server:
- `start_session`
- `send_message`
- `typing`
- `join_session` (admin)

Server → Client:
- `new_message`
- `user_connected`
- `user_disconnected`
- `typing`
- `admin_status`
- `unread_counts`

## Quick Start (Docker)

1. Copy env:
   - `cp .env.example .env` (or create `.env` manually on Windows)
2. Update `.env` values if needed.
3. Run:
   - `docker compose up --build`
4. Open:
   - Widget: [http://localhost:5173](http://localhost:5173)
   - Admin: [http://localhost:5173/admin](http://localhost:5173/admin)
   - Tenant signup: [http://localhost:5173/signup](http://localhost:5173/signup)
   - Super admin: [http://localhost:5173/super-admin](http://localhost:5173/super-admin)
   - API health: [http://localhost:4000/health](http://localhost:4000/health)

## Local (without Docker)

Open 3 terminals:

1) Server
```bash
cd server
npm install
npm run dev
```

2) Client
```bash
cd client
npm install
npm run dev
```

3) MongoDB
- Run local MongoDB or use Docker Mongo container

## Default Admin Credentials

From `.env`:
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

## Multi-Tenant Notes

- Every tenant has:
  - `slug` (used by tenant admin login)
  - `widgetKey` (used by customer widget embedding)
- Widget must send `tenantKey` on session start.
- Admin panel login uses `tenantSlug + admin email/password`.
- Super admin can view all tenant usage and update subscription plans.
- `DEFAULT_TENANT_SLUG`
- `DEFAULT_TENANT_WIDGET_KEY`

## Notes

- To prefill user details (bonus), pass them to widget pre-chat form or extend `startSession()` call source page.
- To embed widget in another site, mount the widget app and pass `pageUrl` from `window.location.href`.
- For multi-business setup, create one tenant per business (`slug` + `widgetKey`) and embed with that tenant key.
