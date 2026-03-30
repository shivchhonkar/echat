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

## MongoDB Models

- `UserSession`
  - `_id`
  - `name`
  - `email`
  - `socketId`
  - `status` (`online`/`offline`)
  - `pageUrl`
  - `createdAt`

- `Message`
  - `_id`
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

## Notes

- To prefill user details (bonus), pass them to widget pre-chat form or extend `startSession()` call source page.
- To embed widget in another site, mount the widget app and pass `pageUrl` from `window.location.href`.
