# API Design: Current User + Matches

## Goal

1. **Login** as a user → backend identifies who they are (e.g. with a token).
2. **Profile & Edit Profile** → use **current user’s** data from the API (no mock).
3. **Matches** → store when user swipes right on someone (target user id, timestamp, other user's location).

---

## How “current user” works

- **Login**: `POST /api/auth/login` with `email` + `password` → backend checks credentials and returns a **JWT** (or session id) that encodes `user_id` (or `_id`).
- **Authenticated requests**: Frontend sends that token (e.g. `Authorization: Bearer <token>`). Backend has a middleware that decodes the token and sets `req.user` (e.g. `req.user.user_id`). So “me” = the user implied by the token.

No token (or invalid token) → 401 Unauthorized on protected routes.

---

## Match structure (swipe right)

In `User.Matches` you store an array of matches when the current user swipes right on someone:

- `targetUserId`: the other user's `user_id` (number).
- `timestamp`: when the swipe happened (e.g. `new Date()`).
- `otherUserLocation`: the other user's `location.coordinates` `[longitude, latitude]` at that time.

So: "I (current user) matched with user X at time T; they were at location L."

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
| `PATCH` | `/api/users/me` | Update **current user** (Edit Profile save). Body: fields to update (e.g. `username`, `age`, `bio`, `profilePhoto`, `location`, `preferences`, `hideProfile`). |
| `GET` | `/api/users/others` | Get **other users** (excluding current user) for Dashboard/Discover. Returns safe profile fields and distance when current user has location. |
| `POST` | `/api/users/me/matches` | Add a **match** when user swipes right. Stores target user id, timestamp (now), and that user's location. |

### Pings (all require auth)
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

- `user_id`, `username`, `email`, `profilePhoto`, `age`, `bio`, `location`, `preferences`, `hideProfile`, `Matches`, `matchLock`, `createdAt`, `updatedAt`.

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
  "hideProfile": false
}
```

**Response (200):** Updated user object (same shape as `GET /api/users/me`, no `passwordHash`).

**Errors:** 400 if validation fails (e.g. username taken), 401 if not logged in.

---

### `GET /api/users/others`

**Headers:** `Authorization: Bearer <token>`

**Purpose:** Returns all users except the current user, for the Dashboard/Discover feed. Excludes sensitive fields (`passwordHash`, `email`, `Matches`, `matchLock`). When the current user has a location, results are sorted by distance using MongoDB `$geoNear`.

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
- Excludes: `passwordHash`, `email`, `Matches`, `matchLock`, `createdAt`, `updatedAt`.

**Errors:** 401 if not logged in.

---

### `POST /api/users/me/matches`

**Headers:** `Authorization: Bearer <token>`

**Purpose:** Records when the current user swipes right (matches) on another user. Stores the target user's id, the current timestamp, and the other user's location at that time.

**Request body:**

```json
{ "targetUserId": 1235 }
```

**Backend logic:**

1. Resolve current user from token.
2. Look up target user by `user_id` and fetch their `location.coordinates`.
3. Append to `User.Matches`: `{ targetUserId, timestamp: now, otherUserLocation }`.
4. Return the created match.

**Response (201):**

```json
{
  "message": "Match added",
  "match": {
    "targetUserId": 1235,
    "timestamp": "2025-03-07T14:30:00.000Z",
    "otherUserLocation": [-123.12, 49.28]
  }
}
```

## Backend structure (suggested)

```
backend/
  middleware/
    auth.js          # Verify JWT, set req.user (e.g. { user_id, _id })
  routes/
    authRoutes.js    # POST /signup, POST /login
    userRoutes.js    # GET /me, PATCH /me, GET /others, POST /me/matches
  controllers/
    authController.js  # signup, login
    userController.js  # getMe, updateMe, getOthers, addMatch
  server.js            # app.use("/api/auth", authRoutes); app.use("/api/users", authMiddleware, userRoutes);
```

- **Auth middleware:**  
  Read `Authorization: Bearer <token>`, verify JWT, decode `user_id` (or `_id`), load user from DB once and set `req.user`. If no/invalid token → 401.

---

## Frontend flow (short)

1. **Login page** → `POST /api/auth/login` with email/password → store `token` (and optionally `user`) in state or localStorage/sessionStorage.
2. **All API calls** for “me” or “my matches” → send `Authorization: Bearer <token>`.
3. **Profile page** → `GET /api/users/me` → set state with that user → render (map `username` → name, `location` or separate city if you add it, etc.).
4. **Edit Profile** → load same `GET /api/users/me`; on Save → `PATCH /api/users/me` with changed fields.
5. **Dashboard / Discover** → `GET /api/users/others` to list other users for swipe cards. On swipe right (match) → `POST /api/users/me/matches` with `{ targetUserId }` to store the match (target user id, timestamp, other user's location).
This gives you: login → one “current user” → use that user’s data for Profile and Edit Profile, and a Matches for swipe-right actions.
