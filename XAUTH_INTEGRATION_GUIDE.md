# XAuth Integration Guide

Quick guide for auxiliary applications to integrate with Staff360's XAuth (Cross-Authentication) system.

## Overview

XAuth allows auxiliary apps to authenticate users against the central X100 staff credentials database without managing their own user stores.

> **Base URL:** All API endpoints below are relative to `http://10.203.14.15:8080`. Replace `<staff360-host>` with this address in all requests.

The flow is:

1. **Admin registers your app** → you receive an `appKey` and `appSecret`
2. **User is redirected** to XAuth's hosted login page
3. **User authenticates** with their X100 username/password
4. **XAuth redirects back** to your `callbackUrl` with an opaque `token`
5. **Your app decodes the token** to get the authenticated user's identity

---

## ⚠️ Mandatory Requirement: `staffId` Column

**Every integrating application MUST have a `staffId` column in its users table.** This is non-negotiable.

When a user authenticates via XAuth, the decoded token response includes a `staffId` field (e.g., `"STF-00142"`, `"CBS001"`). This is the **primary staff identifier** from the central X100 database. Your application must store it to:

- Link the authenticated user to their staff record
- Make authorized API calls back to Staff360 on behalf of the user
- Enforce role-based access control using staff group assignments

### Required Schema Change

Add a `staffId` column to your `users` table. Example migrations:

**PostgreSQL:**
```sql
ALTER TABLE users ADD COLUMN staff_id VARCHAR(20) NOT NULL UNIQUE;
CREATE INDEX idx_users_staff_id ON users(staff_id);
```

**MySQL:**
```sql
ALTER TABLE users ADD COLUMN staff_id VARCHAR(20) NOT NULL UNIQUE;
CREATE INDEX idx_users_staff_id ON users(staff_id);
```

**SQL Server:**
```sql
ALTER TABLE users ADD staff_id NVARCHAR(20) NOT NULL;
CREATE UNIQUE INDEX idx_users_staff_id ON users(staff_id);
```

**MongoDB / NoSQL:**
```
Add a "staffId" field (String, indexed, unique) to your user document schema.
```

### How It Fits in the Flow

After your app calls `/api/v1/xauth/decode`, the response contains `staffId`:

```json
{
  "data": {
    "username": "jsmith",
    "staffId": "STF-00142",
    "fullName": "John Michael Smith",
    "email": "jsmith@staff360.com",
    "appName": "My Auxiliary App",
    "timestamp": "2026-07-24T10:30:00Z"
  },
  "success": true
}
```

Your callback handler **must** save `staffId` to the user record:

```javascript
// After decoding the token
const user = data.data;
// Find or create local user, always storing staffId
await db.users.findOneAndUpdate(
  { staffId: user.staffId },          // lookup by staffId
  { $setOnInsert: {
      staffId: user.staffId,
      username: user.username,
      fullName: user.fullName,
      email: user.email
  }},
  { upsert: true }
);
```

---

## Step 1: Register Your App (Admin Task)

An administrator must register your application via the Staff360 Control API:

```
POST /api/v1/xauth/apps
Authorization: Bearer <admin-jwt>

{
  "appName": "My Auxiliary App",
  "appIp": "192.168.1.50",
  "appPort": 3000,
  "callbackUrl": "https://myapp.example.com/xauth/callback"
}
```

You will receive back your credentials — **store these securely**:

```json
{
  "appId": 1,
  "appName": "My Auxiliary App",
  "appKey": "a1b2c3d4e5f6...",
  "appSecret": "f6e5d4c3b2a1...",
  "callbackUrl": "https://myapp.example.com/xauth/callback"
}
```

| Field | Purpose |
|-------|---------|
| `appKey` | Public identifier for your app. Used in login URL and token decode requests. |
| `appSecret` | Private secret. Only used in server-side token decode calls. **Never expose in client-side code.** |
| `callbackUrl` | Where XAuth redirects after successful authentication. Must be HTTPS in production. |

---

## Step 2: Redirect User to Login

When a user needs to log in, redirect them (302) or open in a browser/webview:

```
GET http://10.203.14.15:8080/api/v1/xauth/signin/initiate?app_key={YOUR_APP_KEY}
```

This displays a hosted login page branded with your app name. The user enters their X100 credentials and submits.

---

## Step 3: Handle the Callback

After successful authentication, XAuth redirects to your `callbackUrl`:

```
https://myapp.example.com/xauth/callback?token={opaque_token}
```

If no `callbackUrl` is configured, the endpoint returns `{"token": "..."}` as a JSON response instead.

---

## Step 4: Decode the Token

Exchange the opaque token for user identity. **This must be done server-side** (your `appSecret` must not be exposed to the browser or mobile client).

```
POST http://10.203.14.15:8080/api/v1/xauth/decode
Content-Type: application/json

{
  "token": "{opaque_token_from_callback}",
  "appKey": "{YOUR_APP_KEY}",
  "appSecret": "{YOUR_APP_SECRET}"
}
```

Response:

```json
{
  "data": {
    "username": "jsmith",
    "staffId": "STF-00142",
    "fullName": "John Michael Smith",
    "email": "jsmith@staff360.com",
    "appName": "My Auxiliary App",
    "timestamp": "2026-07-24T10:30:00Z"
  },
  "success": true
}
```

---

## Minimal Server-Side Example (Node.js / Express)

```javascript
const express = require('express');
const axios = require('axios');
const app = express();

const STAFF360_HOST = 'http://10.203.14.15:8080';
const APP_KEY = process.env.XAUTH_APP_KEY;
const APP_SECRET = process.env.XAUTH_APP_SECRET;

// Redirect to XAuth login
app.get('/login', (req, res) => {
  res.redirect(`${STAFF360_HOST}/api/v1/xauth/signin/initiate?app_key=${APP_KEY}`);
});

// Handle callback from XAuth
app.get('/xauth/callback', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');

  try {
    const { data } = await axios.post(`${STAFF360_HOST}/api/v1/xauth/decode`, {
      token,
      appKey: APP_KEY,
      appSecret: APP_SECRET,
    });

    const user = data.data;
    // Create session, JWT, etc. for user.staffId / user.username
    req.session.user = user;
    res.redirect('/dashboard');
  } catch (err) {
    res.status(401).send('Authentication failed');
  }
});

app.listen(3000);
```

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/xauth/signin/initiate?app_key={key}` | None | Shows hosted login page |
| `POST` | `/api/v1/xauth/signin` | None | Submits credentials, redirects to callback |
| `POST` | `/api/v1/xauth/decode` | None (requires appSecret) | Decodes opaque token to user identity |
| `GET` | `/api/v1/xauth/apps` | Admin JWT | List registered apps |
| `POST` | `/api/v1/xauth/apps` | Admin JWT | Register a new app |
| `PUT` | `/api/v1/xauth/apps/{id}` | Admin JWT | Update app config (e.g. callbackUrl) |
| `DELETE` | `/api/v1/xauth/apps/{id}` | Admin JWT | Remove a registered app |

**Note:** The XAuth admin endpoints (`/api/v1/xauth/apps`) require a valid admin JWT bearer token. The Staff360 Control Portal uses its own admin authentication — if you are integrating XAuth into the portal itself, see the [Staff360 Portal Integration Note](#staff360-portal-integration-note) below.

---

## Staff360 Portal Integration Note

If you are integrating XAuth login **into the Staff360 Control Portal itself** (rather than an external auxiliary app), there is an important special case to be aware of:

### The Authorization Overlap

The Staff360 Control Portal currently uses **admin JWT bearer authentication** (`Authorization: Bearer <admin-jwt>`) for all API calls, including the XAuth admin endpoints (`/api/v1/xauth/apps`). The XAuth system, however, is designed for **auxiliary (non-admin) applications** that authenticate regular staff users via username/password.

**Key considerations if the portal integrates XAuth login:**

1. **Dual auth context:** The portal has two distinct authentication paths:
   - **Admin auth** → JWT bearer token, used for admin operations (CRUD on apps, staff management, etc.)
   - **XAuth staff auth** → opaque token decoded server-side, used for regular staff users
   - These must not conflict. An admin logging in via XAuth should **not** automatically receive admin privileges.

2. **Token scope mismatch:** XAuth tokens identify a staff member (via `staffId`), but they do **not** carry admin role information. The decoded token response includes `username`, `staffId`, `fullName`, and `email` — but no `role` or `adminUserId` field. If the portal needs to determine whether an XAuth-authenticated user is also an admin, it must perform an additional lookup against `admin_users` using the `email` or `username`.

3. **Session management:** The portal likely maintains admin sessions via JWT. XAuth sessions for regular staff would need a separate session mechanism (or a unified session that tracks both auth source and role). Mixing the two without clear separation can lead to privilege escalation.

4. **Do not use XAuth for admin login:** The `/api/v1/xauth/signin` endpoint authenticates against the `vw_all_staff_access` view (regular staff credentials), **not** the `admin_users` table. An admin cannot log in through XAuth unless they also have a regular staff record.

5. **Recommended approach for portal integration:**
   - Keep admin JWT authentication as-is for admin operations.
   - Use XAuth only for regular staff-facing features within the portal.
   - If an admin also needs staff-level access, treat them as two separate identity contexts.
   - Never use an XAuth-decoded `staffId` to authorize admin actions without an explicit admin role check.

---

## Important Notes

- **`staffId` is mandatory.** Your users table **must** have a `staffId` column. Without it, you cannot properly identify or link authenticated staff members. See the [Mandatory Requirement](#️-mandatory Requirement-staffid-column) section above.
- **`appSecret` is server-side only.** Never embed it in JavaScript, mobile app bundles, or any client-facing code.
- **Token validation is mandatory.** Never trust user identity from URL params alone — always call `/decode` to verify.
- **Tokens are opaque.** Do not attempt to parse or decode them yourself; they are generated/validated by Oracle functions and are not JWTs.
- **`callbackUrl` must be pre-registered.** If you need to change it later, ask an admin to update it via `PUT /api/v1/xauth/apps/{id}`.
- **HTTPS required in production.** XAuth tokens are sensitive credentials that must be transmitted securely.
