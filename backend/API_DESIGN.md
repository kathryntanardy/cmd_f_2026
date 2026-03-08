# API Design: Current User + Pings

## Goal

1. **Login** as a user → backend identifies who they are (e.g. with a token).
2. **Profile & Edit Profile** → use **current user’s** data from the API (no mock).
3. **Pings** → store and read: “I pinged this user at this time from this location.”

---

## How “current user” works

- **Login**: `POST /api/auth/login` with `email` + `password` → backend checks credentials and returns a **JWT** (or session id) that encodes `user_id` (or `_id`).
- **Authenticated requests**: Frontend sends that token (e.g. `Authorization: Bearer <token>`). Backend has a middleware that decodes the token and sets `req.user` (e.g. `req.user.user_id`). So “me” = the user implied by the token.

No token (or invalid token) → 401 Unauthorized on protected routes.

---

## Ping structure (from your model and seed)

In `User.Ping` you currently store an **array of pings**. From `seedUsers.js`, each ping is:

- `[targetUser_id, timestampISO, [longitude, latitude]]`
  - **targetUser_id**: the other user you pinged (number).
  - **timestampISO**: when you sent the ping (e.g. `new Date().toISOString()`).
  - **coordinates**: **your** location at the time of the ping `[lng, lat]`.

So: “I (current user) pinged user X at time T from location L.”

---

## Recommended APIs

### Auth

| Method | Path | Purpose |
|--------|------|--------|
| `POST` | `/api/auth/signup` | Register (you already have this). |
| `POST` | `/api/auth/login` | Login: body `{ email, password }` → returns `{ token, user: { user_id, username, email } }`. |

### Current user (all require auth)

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/users/me` | Get **current user** profile for My Profile + Edit Profile (exclude `passwordHash`). |
| `PATCH` | `/api/users/me` | Update **current user** (Edit Profile save). Body: fields to update (e.g. `username`, `age`, `bio`, `profilePhoto`, `location`, `preferences`, `Hide Profile`). |
| `GET` | `/api/users/others` | Get **other users** (excluding current user) for Dashboard/Discover. Returns safe profile fields and distance when current user has location. |

### Pings (all require auth)

| Method | Path | Purpose |
|--------|------|--------|
| `GET` | `/api/users/me/pings` | Get **current user’s** `Ping` array (list of pings I sent). |
| `POST` | `/api/users/me/pings` | Add one ping: “I am pinging user X right now from my current location.” |

---

## Request/response shapes

### `POST /api/auth/login`

**Request body:**

```json
{ "email": "alice@example.com", "password": "seedPassword123!" }
```

**Response (200):**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "user_id": 1234,
    "username": "alice",
    "email": "alice@example.com"
  }
}
```

**Errors:** 401 if wrong email/password.

---

### `GET /api/users/me`

**Headers:** `Authorization: Bearer <token>`

**Response (200):** Full user document **without** `passwordHash`, so Profile and Edit Profile can render and edit:

- `user_id`, `username`, `email`, `profilePhoto`, `age`, `bio`, `location`, `preferences`, `Hide Profile`, `Ping`, `matchLock`, `createdAt`, `updatedAt`.

**Errors:** 401 if not logged in.

---

### `PATCH /api/users/me`

**Headers:** `Authorization: Bearer <token>`

**Request body (only send fields you change):**

```json
{
  "username": "alice",
  "age": 29,
  "bio": "Updated bio.",
  "profilePhoto": "https://...",
  "location": { "type": "Point", "coordinates": [-122.4194, 37.7749] },
  "preferences": { "ageMin": 25, "ageMax": 35, "maxDistanceMeters": 5000 },
  "Hide Profile": false
}
```

**Response (200):** Updated user object (same shape as `GET /api/users/me`, no `passwordHash`).

**Errors:** 400 if validation fails (e.g. username taken), 401 if not logged in.

---

### `GET /api/users/others`

**Headers:** `Authorization: Bearer <token>`

**Purpose:** Returns all users except the current user, for the Dashboard/Discover feed. Excludes sensitive fields (`passwordHash`, `email`, `Ping`, `matchLock`). When the current user has a location, results are sorted by distance using MongoDB `$geoNear`.

**Response (200):**

```json
{
  "users": [
    {
      "_id": "...",
      "user_id": 1235,
      "username": "johndoe123",
      "age": 28,
      "bio": "Artist and dog lover.",
      "profilePhoto": "https://...",
      "preferences": { "genderPreference": ["female", "non-binary"] },
      "distanceMeters": 2500
    }
  ]
}
```

- `distanceMeters`: Distance from current user in meters. `null` if current user has no location.
- Excludes: `passwordHash`, `email`, `Ping`, `matchLock`, `createdAt`, `updatedAt`.

**Errors:** 401 if not logged in.

---

### `GET /api/users/me/pings`

**Headers:** `Authorization: Bearer <token>`

**Response (200):**

```json
{
  "pings": [
    {
      "targetUserId": 1240,
      "timestamp": "2025-03-07T12:00:00.000Z",
      "location": [-123.12, 49.28]
    },
    ...
  ]
}
```

Backend can map your stored `Ping` entries `[targetUserId, timestamp, coordinates]` to this shape. Optionally you can add `_id` or an index if you need to reference a specific ping later.

**Errors:** 401 if not logged in.

---

### `POST /api/users/me/pings`

**Headers:** `Authorization: Bearer <token>`

**Request body:**

```json
{ "targetUserId": 1240 }
```

**Backend logic:**

1. Resolve current user from token → `req.user.user_id`.
2. Get current user’s **current location** from their `User` document (or optionally from body if you want to allow “ping from this lat/lng”).
3. Append to `User.Ping`: `[targetUserId, new Date().toISOString(), user.location.coordinates]`.
4. Save and return the new ping or the full `pings` array.

**Response (201):**

```json
{
  "ping": {
    "targetUserId": 1240,
    "timestamp": "2025-03-07T12:00:00.000Z",
    "location": [-123.12, 49.28]
  }
}
```

**Errors:** 400 if `targetUserId` missing or invalid, 401 if not logged in.

---

## Backend structure (suggested)

```
backend/
  middleware/
    auth.js          # Verify JWT, set req.user (e.g. { user_id, _id })
  routes/
    authRoutes.js    # POST /signup, POST /login
    userRoutes.js    # GET /me, PATCH /me, GET /others, GET /me/pings, POST /me/pings
  controllers/
    authController.js  # signup, login
    userController.js  # getMe, updateMe, getOthers, getMyPings, addPing
  server.js            # app.use("/api/auth", authRoutes); app.use("/api/users", authMiddleware, userRoutes);
```

- **Auth middleware:**  
  Read `Authorization: Bearer <token>`, verify JWT, decode `user_id` (or `_id`), load user from DB once and set `req.user`. If no/invalid token → 401.

- **Ping format in DB:**  
  Keep storing `[targetUserId, timestampISO, coordinates]` so it stays compatible with your seed. In controllers, convert to `{ targetUserId, timestamp, location }` for the API response and accept `{ targetUserId }` for POST body.

---

## Frontend flow (short)

1. **Login page** → `POST /api/auth/login` with email/password → store `token` (and optionally `user`) in state or localStorage/sessionStorage.
2. **All API calls** for “me” or “my pings” → send `Authorization: Bearer <token>`.
3. **Profile page** → `GET /api/users/me` → set state with that user → render (map `username` → name, `location` or separate city if you add it, etc.).
4. **Edit Profile** → load same `GET /api/users/me`; on Save → `PATCH /api/users/me` with changed fields.
5. **Dashboard / Discover** → `GET /api/users/others` to list other users for swipe cards (username, age, bio, profilePhoto, preferences, distance).
6. **Match map / pings** → `GET /api/users/me/pings` to list; when user pings someone → `POST /api/users/me/pings` with `{ targetUserId }`.

This gives you: login → one “current user” → use that user’s data for Profile and Edit Profile, and a clear GET/POST API for Pings (with location and time stored on the User model as you described).
