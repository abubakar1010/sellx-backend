# Chat Flow — Full Integration Guide

## Architecture

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│   Client A   │  ───→  │   REST API      │         │  MongoDB     │
│  (Buyer)     │  ←───  │  POST /chat     │         │              │
│              │         │  POST /chat/:id  │         │  conversations│
│  Socket.IO   │  ───→  │  GET /chat      │  ───→   │  messages     │
│  connected   │  ←───  │                 │         │              │
│              │         │  Socket.IO      │         └──────────────┘
│   Client B   │  ───→  │  Server         │
│  (Seller)    │  ←───  │  emit chat:msg  │
└─────────────┘         └─────────────────┘
```

## Data Models

### Conversation

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Conversation ID (used as `roomId`) |
| `participants` | `IParticipant[]` | Exactly 2: buyer + seller |
| `productId` | ObjectId? | Linked product (if product chat) |
| `lastMessage` | string | Preview of last message |
| `lastMessageAt` | Date | Timestamp of last activity |
| `lastSenderId` | ObjectId | Who sent the last message |
| `isActive` | boolean | Soft-delete flag |

Each participant:
```typescript
{ userId, role: 'buyer' | 'seller', storeId?, unreadCount, lastSeenAt }
```

### Message

| Field | Type | Description |
|---|---|---|
| `_id` | ObjectId | Message ID |
| `conversationId` | ObjectId | Reference to conversation |
| `senderId` | ObjectId | Who sent it |
| `text` | string? | Message text (optional if attachments) |
| `attachments` | `IAttachment[]` | File attachments |
| `readAt` | Date? | When recipient read it |
| `isDeleted` | boolean | Soft-delete |

---

## REST API Endpoints

All chat endpoints require `Authorization: Bearer <accessToken>`.

### 1. Check existing conversation by product

```
GET /api/v1/chat/by-product/:productId
```

**Purpose**: Before creating a new message, check if a conversation already exists between the current user and the seller about this product.

**Response** (exists):
```json
{
  "success": true,
  "data": {
    "_id": "664f1a2b...",
    "productId": "...",
    "participants": [...],
    "oppositeParticipant": { "id": "...", "name": "John", "avatarUrl": "..." },
    "unreadCount": 2,
    "lastMessage": "Hi, is this available?",
    "lastMessageAt": "2025-05-15T10:30:00Z"
  }
}
```

**Response** (not found):
```json
{
  "success": true,
  "data": null
}
```

---

### 2. Check existing conversation by store

```
GET /api/v1/chat/by-store/:storeId
```

Same as above but for store-level conversations (no product linked). Finds conversations where the seller participant has the given `storeId` and no `productId` exists.

---

### 3. List conversations

```
GET /api/v1/chat?page=1&limit=20
```

Returns all conversations the authenticated user is part of, sorted by `updatedAt` descending.

---

### 4. View conversation detail

```
GET /api/v1/chat/:conversationId?page=1&limit=20
```

Returns the conversation with paginated messages (newest first). Marks unread messages as read.

---

### 5. Create conversation & send first message

```
POST /api/v1/chat
Content-Type: application/json

{
  "productId": "664f1a2b...",   // or "storeId": "..."
  "text": "Hi, is this available?"
}
```

**Logic**:
1. Resolves the seller from `product.user` or `store.user`
2. Calls `findOrCreate` — returns existing conversation if found, otherwise creates new
3. Creates a message in the conversation
4. Emits `chat:message` event to the Socket.IO room
5. Emits `notification:new` to the seller's user room

**Response**:
```json
{
  "success": true,
  "data": {
    "_id": "messageId...",
    "conversationId": "664f1a2b...",
    "senderId": "...",
    "text": "Hi, is this available?",
    "createdAt": "2025-05-15T10:30:00Z"
  }
}
```

The `conversationId` is the room ID for Socket.IO.

---

### 6. Send message to existing conversation

```
POST /api/v1/chat/:conversationId/messages
Content-Type: application/json

{
  "text": "Yes, still available!"
}
```

Emits `chat:message` to the room. All connected participants receive it.

---

### 7. Mark conversation as read

```
POST /api/v1/chat/:conversationId/mark-read
```

Marks all unread messages (sent by the other participant) as read. Resets `unreadCount` for the current user.

---

## Socket.IO Realtime Events

### Connection

**URL**: `ws://localhost:5000`  
**Path**: `/socket.io`  
**Auth**: Pass JWT access token via any of:
- `Authorization` header: `Bearer <token>`
- Handshake auth: `{ token: "<token>" }` or `{ accessToken: "<token>" }`
- Query param: `?token=<token>`

### Client → Server Events

#### `chat:join`

Join a conversation room to receive messages.

```json
// Emit:
{ "roomId": "664f1a2b..." }

// Ack response:
{ "ok": true, "data": { "roomId": "...", "chatRoom": "chat:..." } }
```

Server validates the user is a participant of that conversation before joining.

#### `chat:leave`

```json
// Emit:
{ "roomId": "664f1a2b..." }

// Ack:
{ "ok": true, "data": { "roomId": "..." } }
```

#### `chat:message`

Send a message directly via socket (alternative to REST).

```json
// Emit:
{
  "roomId": "664f1a2b...",
  "message": "Hello!",
  "clientMessageId": "uuid-123"   // optional, for dedup
}

// Ack:
{ "ok": true, "data": { "messageId": "...", "roomId": "..." } }
```

### Server → Client Events

#### `system:connected`

Fired on successful connection.

```json
{
  "socketId": "abc123",
  "connectedAt": "2025-05-15T10:00:00Z",
  "user": { "id": "...", "email": "...", "name": "John Doe" }
}
```

#### `chat:message`

Fired when a new message is sent in a room you've joined.

```json
{
  "roomId": "664f1a2b...",
  "messageId": "msg123",
  "message": "Hello!",
  "text": "Hello!",
  "attachments": [],
  "sender": {
    "id": "...",
    "email": "john@example.com",
    "name": "John Doe",
    "avatarUrl": "..."
  },
  "sentAt": "2025-05-15T10:30:00Z",
  "createdAt": "2025-05-15T10:30:00Z"
}
```

#### `chat:user-joined` / `chat:user-left`

Fired when a participant joins/leaves the room.

```json
{
  "roomId": "664f1a2b...",
  "userId": "...",
  "occurredAt": "2025-05-15T10:30:00Z"
}
```

#### `notification:new`

Fired to the recipient's user room when a new conversation is created.

```json
{
  "userId": "sellerId...",
  "id": "conversationId...",
  "title": "New message",
  "message": "Hi, is this available?",
  "type": "chat",
  "isRead": false,
  "metadata": { "conversationId": "...", "type": "chat" },
  "createdAt": "2025-05-15T10:30:00Z"
}
```

---

## Complete Flow

### Flow A: Chat about a product

```
BUYER                                              SELLER
  │                                                  │
  │  ─── Connect Socket.IO (with JWT) ───→           │
  │  ←── system:connected ─────────────             │
  │                                                  │
  │  ─── GET /chat/by-product/:productId ──→         │
  │  ←── { data: null } (no existing chat) ────      │
  │                                                  │
  │  ─── POST /chat { productId, text } ───→         │
  │       (creates conversation + message)            │
  │  ←── { data: { conversationId: "X", ... } } ──   │
  │                                                  │
  │  ─── emit chat:join { roomId: "X" } ──→          │
  │  ←── ack { ok: true } ──────────                 │
  │                                                  │
  │                                      (if connected, receives:)
  │                                      ←── notification:new { metadata.conversationId: "X" }
  │                                                  │
  │                                      ─── GET /chat ──────────→
  │                                      ←── list with conv "X" ─
  │                                                  │
  │                                      ─── emit chat:join { roomId: "X" }
  │                                      ←── ack { ok: true }
  │                                                  │
  │  ─── POST /chat/X/messages { text } ──→          │
  │                                                  │
  │  ←── SERVER EMITS TO ROOM "chat:X" ────          │
  │  ←── chat:message { text, sender, ... } ──       │
  │                                      ←── chat:message (same event)
  │                                                  │
  │  ─── POST /chat/X/mark-read ──────────→          │
  │  ←── { success: true } ──────────────            │
```

### Flow B: Chat with a store

Same as Flow A, but:

| Step | Product Chat | Store Chat |
|---|---|---|
| Check existing | `GET /chat/by-product/:id` | `GET /chat/by-store/:id` |
| Create | `POST /chat { productId }` | `POST /chat { storeId }` |
| findOrCreate filter | participants + productId | participants + no productId + storeId |
| Seller resolved | `product.user` | `store.user` |

### Flow C: Resume existing chat (user already has conversations)

1. `GET /chat` → list all conversations
2. For each, `emit chat:join { roomId }` to receive realtime updates
3. `GET /chat/:id?page=1&limit=20` → load messages with pagination

---

## Testing with Postman

### Step 1: Create two users & log in

Create User A (buyer) and User B (seller). Get access tokens for both.

### Step 2: Connect Socket.IO (User A)

1. Create a **Socket.IO** request in Postman
2. URL: `ws://localhost:5000`
3. Handshake Auth → type `token` → value: `<UserA_accessToken>`
4. Click **Connect**
5. In the **Messages** pane, you should see `system:connected`

### Step 3: Connect Socket.IO (User B)

Repeat Step 2 in a separate Postman tab with User B's token.

### Step 4: Check & create conversation

Both clients should be in "Listen" mode.

**User A** tabs:

1. **REST**: `GET /chat/by-product/:productId`
   - If `data` is null → create new:
2. **REST**: `POST /chat` with `{ "productId": "...", "text": "Hi" }`
3. Copy `conversationId` from response

**Socket.IO** tab (User A):
4. **Emit**: `chat:join { "roomId": "<conversationId>" }`
5. Check **ack** → `{ "ok": true }`

**Socket.IO** tab (User B):
6. Should receive `notification:new` (if connected) — extract `conversationId` from `metadata`
7. **Emit**: `chat:join { "roomId": "<conversationId>" }`

### Step 5: Send & receive messages

**User A** → **REST**: `POST /chat/:id/messages { "text": "Hello!" }`

Both Socket.IO tabs should receive the `chat:message` event.

### Room naming convention

- Chat room: `chat:<conversationId>`
- User room: `user:<userId>`

Socket.IO rooms are managed server-side — clients just use the raw `conversationId` as `roomId` in `chat:join`.
