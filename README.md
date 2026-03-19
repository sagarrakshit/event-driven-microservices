# Event Driven Microservices

A production-ready microservices boilerplate with a fully implemented JWT authentication system, event-driven architecture, and API gateway. Clone, configure, and build your own services on top of the existing foundation.

## What's Included

This boilerplate gives you the hard parts for free:

- ✅ JWT authentication with refresh token rotation
- ✅ API Gateway with rate limiting and request proxying
- ✅ Event-driven communication via Kafka
- ✅ Redis caching layer
- ✅ Dockerized development environment with hot reload
- ✅ Structured logging with Winston
- ✅ Graceful shutdown handling
- ✅ MongoDB integration per service

The `post-service`, `media-service`, and `search-service` are example implementations — replace or extend them with your own business logic.

---

## Architecture

```
                        ┌─────────────────┐
                        │   API Gateway   │
                        │   (Port 3000)   │
                        └────────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
   ┌──────────▼──────┐  ┌───────▼────────┐  ┌──────▼──────────┐
   │ Identity Service│  │  Post Service  │  │  Media Service  │
   │   (Port 3001)   │  │  (Port 3002)   │  │  (Port 3003)    │
   └─────────────────┘  └───────┬────────┘  └──────┬──────────┘
                                │                  │
                        ┌───────▼──────────────────▼──────┐
                        │            Kafka                 │
                        │     (Event-Driven Updates)       │
                        └───────────────┬─────────────────┘
                                        │
                              ┌─────────▼──────────┐
                              │   Search Service   │
                              │   (Port 3004)      │
                              └────────────────────┘
```

---

## Services

| Service          | Port | Description                                       |
| ---------------- | ---- | ------------------------------------------------- |
| api-gateway      | 3000 | Single entry point — routing, auth, rate limiting |
| identity-service | 3001 | JWT auth — register, login, refresh, logout       |
| post-service     | 3002 | Example CRUD service with Redis caching           |
| media-service    | 3003 | Example media upload service with Cloudinary      |
| search-service   | 3004 | Example full text search service                  |

---

## Tech Stack

- **Runtime** — Node.js with ES Modules
- **Framework** — Express.js
- **Database** — MongoDB Atlas (separate DB per service)
- **Cache** — Redis
- **Message Broker** — Apache Kafka
- **Media Storage** — Cloudinary
- **Auth** — JWT + Refresh Token rotation
- **Containerization** — Docker + Docker Compose
- **Logging** — Winston

---

## Prerequisites

- Docker Desktop
- MongoDB Atlas account
- Cloudinary account (only if using media-service)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sagarrakshit/event-driven-microservices.git
cd event-driven-microservices
```

### 2. Configure environment variables

Copy the example env files and fill in your values:

```bash
cp api-gateway/.env.docker.example api-gateway/.env.docker
cp identity-service/.env.docker.example identity-service/.env.docker
cp post-service/.env.docker.example post-service/.env.docker
cp media-service/.env.docker.example media-service/.env.docker
cp search-service/.env.docker.example search-service/.env.docker
```

Minimum required values to get started:

| Variable       | Description                                             |
| -------------- | ------------------------------------------------------- |
| `MONGODB_URL`  | MongoDB Atlas connection string                         |
| `JWT_SECRET`   | A strong random secret — same value across all services |
| `REDIS_URL`    | Already set to `redis://redis:6379` — no change needed  |
| `KAFKA_BROKER` | Already set to `kafka:9092` — no change needed          |
| `CLOUDINARY_*` | Cloudinary credentials (media-service only)             |

### 3. Start all services

```bash
docker compose up --build
```

### 4. Verify everything is running

```bash
docker compose ps
```

You should see all containers running — api-gateway, identity-service, post-service, media-service, search-service, redis, kafka, zookeeper.

---

## JWT Authentication — Fully Implemented

The authentication system is production-ready and reusable. You do not need to modify `identity-service` or the auth middleware unless you want to extend it.

### How it works

```
1. Register/Login
   POST /api/v1/auth/register or /api/v1/auth/login
   → receive accessToken (15 min) + refreshToken (7 days)

2. Authenticated requests
   Pass accessToken in every request header:
   Authorization: Bearer <accessToken>

3. Token expired (401 response)
   POST /api/v1/auth/refresh-token  { refreshToken }
   → receive new accessToken + new refreshToken
   → old refreshToken is immediately invalidated (rotation)

4. Logout
   POST /api/v1/auth/logout  { refreshToken }
   → refreshToken deleted from database
```

### Auth endpoints

| Method | Endpoint                     | Description          | Auth Required |
| ------ | ---------------------------- | -------------------- | ------------- |
| POST   | `/api/v1/auth/register`      | Register new user    | No            |
| POST   | `/api/v1/auth/login`         | Login                | No            |
| POST   | `/api/v1/auth/refresh-token` | Refresh access token | No            |
| POST   | `/api/v1/auth/logout`        | Logout               | No            |

### Protecting your own routes

Every service has an `auth.js` middleware that validates the JWT passed by the API Gateway. To protect a route in any service:

```js
import authenticateRequest from "../middlewares/auth.js";

router.get("/your-route", authenticateRequest, yourController);
```

The authenticated user is available in the controller via:

```js
const userId = req.user.userId;
const username = req.user.username;
```

### Adding a new protected service to the gateway

In `api-gateway/src/routes/index.js`, add a new proxy:

```js
app.use(
  "/api/v1/your-service",
  validateToken,
  proxy(process.env.YOUR_SERVICE_URL, {
    ...proxyOptions,
    proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
      proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
      proxyReqOpts.headers["content-type"] = "application/json";
      return proxyReqOpts;
    },
  }),
);
```

Then add your service URL to `api-gateway/.env.docker`:

```
YOUR_SERVICE_URL=http://your-service:PORT
```

---

## Building Your Own Service

Use the existing services as reference. A typical service follows this structure:

```
your-service/
├── src/
│   ├── controllers/        # business logic
│   ├── events/             # kafka producers/consumers (if needed)
│   │   ├── handlers/       # per-event handlers
│   │   └── messageRouter.js
│   ├── middlewares/
│   │   ├── auth.js         # copy from any existing service
│   │   └── errorHandler.js # copy from any existing service
│   ├── models/             # mongoose schemas
│   ├── routes/             # express routes
│   ├── utils/
│   │   ├── kafkaClient.js  # copy and update clientId
│   │   └── logger.js       # copy and update service name
│   └── server.js
├── .dockerignore
├── .env.docker
├── .env.docker.example
├── Dockerfile.dev
└── package.json
```

### Steps to add a new service

**1. Create your service** following the structure above.

**2. Add a `Dockerfile.dev`:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV PORT=YOUR_PORT
ENV NODE_ENV=development
EXPOSE ${PORT}
CMD ["npm", "run", "dev"]
```

**3. Add to `docker-compose.yml`:**

```yaml
your-service:
  build:
    context: ./your-service
    dockerfile: Dockerfile.dev
  container_name: your-service
  ports:
    - "YOUR_PORT:YOUR_PORT"
  env_file:
    - ./your-service/.env.docker
  volumes:
    - ./your-service:/app
    - /app/node_modules
  depends_on:
    - redis
    - kafka
  networks:
    - social-net
```

**4. Add proxy in api-gateway** (see JWT section above).

---

## Event-Driven Architecture

Services communicate asynchronously via Kafka. Current events:

| Event          | Producer     | Consumer       | Action                                 |
| -------------- | ------------ | -------------- | -------------------------------------- |
| `post.deleted` | post-service | media-service  | Delete media from Cloudinary + MongoDB |
| `post.deleted` | post-service | search-service | Remove from search index               |
| `post.created` | post-service | search-service | Add to search index                    |

### Publishing an event

```js
import kafka from "../utils/kafkaClient.js";

const producer = kafka.producer();

await producer.connect();
await producer.send({
  topic: "your.event",
  messages: [
    {
      key: resourceId,
      value: JSON.stringify({ ...data, timestamp: new Date().toISOString() }),
    },
  ],
});
```

### Consuming an event

```js
// server.js
await connectConsumer();
await subscribeToTopic("your.event");
await runConsumer(messageRouter);
```

---

## Rate Limiting

Applied at the API Gateway level using Redis:

| Route          | Limit                     |
| -------------- | ------------------------- |
| All routes     | 100 requests / 15 minutes |
| `/api/v1/auth` | 10 requests / 15 minutes  |

---

## Development

### Useful commands

```bash
# start all services with hot reload
docker compose up

# rebuild a specific service (after npm install)
docker compose up --build <service-name>

# view logs for a specific service
docker compose logs -f <service-name>

# open a shell inside a container
docker compose exec <service-name> sh

# check redis keys
docker compose exec redis redis-cli keys "*"

# stop everything
docker compose down

# stop and remove volumes
docker compose down -v
```

### Hot reload

All services use `nodemon --legacy-watch` for hot reload on Windows/WSL. Code changes reflect instantly without rebuilding.

> After `npm install` of a new package, rebuild that service:
>
> ```bash
> docker compose up --build <service-name>
> ```

---

## Project Structure

```
event-driven-microservices/
├── api-gateway/            # ← fully implemented, reuse as-is
├── identity-service/       # ← fully implemented, reuse as-is
├── post-service/           # ← example implementation
├── media-service/          # ← example implementation
├── search-service/         # ← example implementation
└── docker-compose.yml
```
