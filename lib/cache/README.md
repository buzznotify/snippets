# Cache Architecture Documentation

## Overview

The application uses a **clean, simple, and reliable caching system** built with Redis and following SOLID principles. The architecture focuses on low latency, reliability, and maintainability.

## Key Components

### 1. CacheManager (`CacheManager.js`)

The core caching service that handles:

- **Connection pooling** - Maintains a pool of Redis connections for optimal performance
- **Read-through caching** - Automatically fetches from DB on cache miss
- **Smart invalidation** - Efficient cache invalidation strategies
- **Circuit breaker** - Protects against Redis failures
- **Warm cache maintenance** - Keeps frequently accessed data warm

### 2. BackgroundProcessor (`BackgroundProcessor.js`)

Handles heavy operations asynchronously:

- **Non-blocking cache warming** - Warms cache without blocking API responses
- **Batch operations** - Processes multiple cache operations efficiently
- **Automatic retries** - Resilient to transient failures
- **Queue management** - Manages background job queue

### 3. CacheInitializer (`CacheInitializer.js`)

Manages cache system lifecycle:

- **Automatic initialization** - Sets up cache on application start
- **Graceful degradation** - Runs without cache if Redis unavailable
- **Background warming** - Warms cache in background on startup
- **Clean shutdown** - Properly closes connections on shutdown

## Architecture Principles

### 1. Single Responsibility

Each component has a clear, focused responsibility:

- `CacheManager` - Cache operations and connection management
- `BackgroundProcessor` - Asynchronous job processing
- `CacheInitializer` - System initialization and lifecycle
- Service files (`snippet.js`, `user.js`) - Business logic only

### 2. Clean Separation of Concerns

- **Business logic** is kept in service files
- **Cache logic** is centralized in CacheManager
- **Background processing** is isolated in BackgroundProcessor
- **No cache code in API endpoints**

### 3. Reliability Features

- **Connection pooling** - Prevents connection exhaustion
- **Circuit breaker** - Graceful degradation on failures
- **Automatic retries** - Handles transient failures
- **Fallback to database** - Works even without cache

## Cache Strategies

### Read-Through Cache

Used for snippet retrieval operations:

```javascript
// Automatically fetches from DB if not in cache
const snippet = await cacheManager.getSnippet(id, fetchFromDb);
```

### Cache Invalidation

Smart invalidation on data changes:

```javascript
// Invalidates snippet and related indexes
await cacheManager.invalidateSnippet(id, userId, keyName);
```

### Background Warming

Non-blocking cache warming:

```javascript
// Warms cache in background without blocking response
backgroundProcessor.addJob("warm-user-cache", { userId, snippets });
```

## Performance Optimizations

### 1. Connection Pooling

- Maintains 5-10 Redis connections
- Reuses connections for better performance
- Automatically manages pool size

### 2. TTL Management

- **Snippets**: 1 hour TTL
- **Warm cache**: 2 hours TTL
- **Frequently accessed**: Auto-extended TTL

### 3. Background Operations

- Cache warming happens in background
- Heavy operations are queued
- API responses are never blocked

## API Integration

The cache is transparently integrated into the API:

### Get Snippet by ID

```javascript
// API: GET /api/v1/snippet?snippet_id=xxx
// Automatically uses cache with DB fallback
const snippet = await getSnippet(snippetId, userId);
```

### Get Snippet by Key Name

```javascript
// API: GET /api/v1/snippet/[keyName]
// Uses indexed cache for fast lookups
const snippet = await getSnippetByKeyName(userId, keyName);
```

### Create/Update/Delete

```javascript
// Automatically invalidates relevant cache entries
await createSnippet(userId, keyName, value, type);
await updateSnippet(snippetId, userId, keyName, value, type);
await deleteSnippet(snippetId, userId);
```

## Configuration

Set these environment variables in `.env.local`:

```env
# Redis Configuration
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=
REDIS_DB=0

# Connection Pool
REDIS_POOL_SIZE=5           # Initial pool size
REDIS_MAX_POOL_SIZE=10      # Maximum pool size
```

## Monitoring

### Cache Status Endpoint

```javascript
// GET /api/v1/cache/status
// Returns comprehensive cache statistics
{
  "initializer": { /* initialization status */ },
  "manager": { /* cache manager stats */ },
  "backgroundJobs": { /* job queue status */ }
}
```

## Benefits

1. **Low Latency** - Sub-millisecond cache hits
2. **High Reliability** - Graceful degradation and fallbacks
3. **Clean Code** - SOLID principles and separation of concerns
4. **Zero Cold Starts** - Background warming keeps cache hot
5. **Scalable** - Connection pooling and efficient resource usage
6. **Maintainable** - Simple, well-organized architecture

## Migration from Old System

The new architecture replaces:

- ❌ `snippet-cached.js` → ✅ Clean `snippet.js` with CacheManager
- ❌ `user-cached.js` → ✅ Clean `user.js`
- ❌ Multiple Redis services → ✅ Single CacheManager
- ❌ Complex sync queues → ✅ Simple BackgroundProcessor
- ❌ Manual cache management → ✅ Automatic cache strategies

## Best Practices

1. **Never block API responses** - Use background processing
2. **Always provide fallbacks** - Database fallback on cache miss
3. **Invalidate smartly** - Only invalidate what changed
4. **Monitor performance** - Use status endpoint for monitoring
5. **Keep it simple** - Avoid over-engineering

