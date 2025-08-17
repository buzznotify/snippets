# Snippets API Documentation

## Base URL

```
http://localhost:3000/api/v1
```

## Authentication

All endpoints require authentication via JWT token in the Authorization header:

```
Authorization: <token>
```

## Endpoints

### 1. Create Snippet

**POST** `/snippet`

Creates a new snippet for the authenticated user.

**Request Body:**

```json
{
  "keyName": "ttyl",
  "value": "talk to you later",
  "type": "text" // "text" or "url"
}
```

**Response:**

```json
{
  "data": {
    "_id": "68a1f1d4cb7493621612140f",
    "user_id": "66afdefb3395066fde13a038",
    "keyName": "ttyl",
    "value": "talk to you later",
    "type": "text",
    "status": "published",
    "version": 1,
    "createdAt": "2025-01-13T10:00:00.000Z",
    "updatedAt": "2025-01-13T10:00:00.000Z"
  }
}
```

### 2. Update Snippet

**PATCH** `/snippet`

Updates an existing snippet.

**Request Body:**

```json
{
  "snippet_id": "68a1f1d4cb7493621612140f",
  "keyName": "ttyl_updated",
  "value": "talk to you later :)",
  "type": "text" // optional
}
```

**Response:**

```json
{
  "data": {
    "_id": "68a1f1d4cb7493621612140f",
    "user_id": "66afdefb3395066fde13a038",
    "keyName": "ttyl_updated",
    "value": "talk to you later :)",
    "type": "text",
    "status": "published",
    "version": 2,
    "updatedAt": "2025-01-13T10:05:00.000Z"
  }
}
```

### 3. Delete Snippet

**DELETE** `/snippet`

Archives a snippet (soft delete).

**Request Body:**

```json
{
  "snippet_id": "68a1f1d4cb7493621612140f"
}
```

**Response:**

```json
{
  "message": "Snippet 68a1f1d4cb7493621612140f deleted successfully"
}
```

### 4. Get Snippet by ID (Query Parameter)

**GET** `/snippet?snippet_id=<id>`

Retrieves a snippet by its ID using query parameter.

**Example:**

```bash
curl --location 'http://localhost:3000/api/v1/snippet?snippet_id=68a1f1d4cb7493621612140f' \
--header 'Authorization: <token>'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "68a1f1d4cb7493621612140f",
    "user_id": "66afdefb3395066fde13a038",
    "keyName": "ttyl",
    "value": "talk to you later",
    "type": "text",
    "status": "published"
  }
}
```

### 5. Get Snippet by ID (Path Parameter)

**GET** `/snippet/id/<snippet_id>`

Retrieves a snippet by its ID using path parameter.

**Example:**

```bash
curl --location 'http://localhost:3000/api/v1/snippet/id/68a1f1d4cb7493621612140f' \
--header 'Authorization: <token>'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "68a1f1d4cb7493621612140f",
    "user_id": "66afdefb3395066fde13a038",
    "keyName": "ttyl",
    "value": "talk to you later",
    "type": "text",
    "status": "published"
  }
}
```

### 6. Get Snippet by Key Name (Option 1)

**GET** `/snippet/<keyName>`

Retrieves a snippet by its key name.

**Example:**

```bash
curl --location 'http://localhost:3000/api/v1/snippet/ttyl' \
--header 'Authorization: <token>'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "68a1f1d4cb7493621612140f",
    "user_id": "66afdefb3395066fde13a038",
    "keyName": "ttyl",
    "value": "talk to you later",
    "type": "text",
    "status": "published"
  }
}
```

### 7. Get Snippet by Key Name (Option 2)

**GET** `/snippet/key/<keyName>`

Alternative endpoint to retrieve a snippet by its key name.

**Example:**

```bash
curl --location 'http://localhost:3000/api/v1/snippet/key/ttyl' \
--header 'Authorization: <token>'
```

**Response:**

```json
{
  "success": true,
  "data": {
    "_id": "68a1f1d4cb7493621612140f",
    "user_id": "66afdefb3395066fde13a038",
    "keyName": "ttyl",
    "value": "talk to you later",
    "type": "text",
    "status": "published"
  }
}
```

### 8. List All Snippets

**GET** `/snippet/list`

Retrieves all snippets for the authenticated user.

**Example:**

```bash
curl --location 'http://localhost:3000/api/v1/snippet/list' \
--header 'Authorization: <token>'
```

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "_id": "68a1f1d4cb7493621612140f",
      "user_id": "66afdefb3395066fde13a038",
      "keyName": "ttyl",
      "value": "talk to you later",
      "type": "text",
      "status": "published",
      "createdAt": "2025-01-13T10:00:00.000Z"
    }
    // ... more snippets
  ]
}
```

## Important Notes

### URL Structure Clarification

⚠️ **Common Mistake:** Using `/snippet/<snippet_id>` to get by ID won't work!

The route `/snippet/[keyName]` is a dynamic route that expects a key name, not an ID. If you pass a snippet ID here, it will try to find a snippet with that ID as the keyName, which will fail.

**Correct ways to get snippet by ID:**

- ✅ `GET /api/v1/snippet?snippet_id=68a1f1d4cb7493621612140f`
- ✅ `GET /api/v1/snippet/id/68a1f1d4cb7493621612140f`

**Correct ways to get snippet by key name:**

- ✅ `GET /api/v1/snippet/ttyl`
- ✅ `GET /api/v1/snippet/key/ttyl`

### Cache Behavior

All GET operations use read-through caching:

1. First checks Redis cache
2. If not found, fetches from MongoDB
3. Caches the result for future requests
4. Returns the data

Cache is automatically invalidated on:

- Create new snippet
- Update existing snippet
- Delete snippet

### Error Responses

All endpoints return consistent error responses:

**400 Bad Request:**

```json
{
  "success": false,
  "message": "Description of what's missing or invalid"
}
```

**404 Not Found:**

```json
{
  "success": false,
  "message": "Snippet not found"
}
```

**401 Unauthorized:**

```json
{
  "success": false,
  "message": "No authorization token provided"
}
```

**500 Internal Server Error:**

```json
{
  "success": false,
  "message": "Description of the error"
}
```
