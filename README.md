# Social Media Microservices

A scalable social media backend built with a microservices architecture using Node.js, Docker, Kafka, and Redis.

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

## Services

| Service | Port | Description |
|---|---|---|
| api-gateway | 3000 | Single entry point, handles routing, auth, rate limiting |
| identity-service | 3001 | User registration, login, JWT & refresh token management |
| post-service | 3002 | Create, read, delete posts with Redis caching |
| media-service | 3003 | Media upload to Cloudinary, Kafka event consumer |
| search-service | 3004 | Full text search powered by MongoDB text indexes |

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

## Prerequisites

- Docker Desktop
- Node.js 18+
- MongoDB Atlas account
- Cloudinary account

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/sagarrakshit/social-media-microservices.git
cd social-media-microservices
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

Fill in the following for each service:
- `MONGODB_URL` — your MongoDB Atlas connection string
- `JWT_SECRET` — a strong random secret
- `CLOUDINARY_*` — your Cloudinary credentials (media-service only)

### 3. Start all services

```bash
docker compose up --build
```

All services will start in the correct order with health checks ensuring dependencies are ready.

### 4. Verify everything is running

```bash
docker compose ps
```

You should see all 7 containers running — api-gateway, identity-service, post-service, media-service, search-service, redis, kafka, zookeeper.

## API Endpoints

All requests go through the API Gateway at `http://localhost:3000`.

### Auth (`/api/v1/auth`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/auth/register` | Register a new user | No |
| POST | `/api/v1/auth/login` | Login and get tokens | No |
| POST | `/api/v1/auth/refresh-token` | Get new access token | No |
| POST | `/api/v1/auth/logout` | Logout user | No |

### Posts (`/api/v1/post`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/post/create` | Create a new post | Yes |
| GET | `/api/v1/post/all-posts` | Get all posts (paginated) | Yes |
| GET | `/api/v1/post/:id` | Get a single post | Yes |
| DELETE | `/api/v1/post/:id` | Delete a post | Yes |

### Media (`/api/v1/media`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/v1/media/upload` | Upload media file | Yes |
| GET | `/api/v1/media/get` | Get all media | Yes |

### Search (`/api/v1/search`)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/v1/search?q=query` | Search posts | Yes |

## Authentication

This project uses JWT access tokens + refresh token rotation.

```
1. Register/Login → receive accessToken (15min) + refreshToken (7days)
2. Pass accessToken in every request: Authorization: Bearer <token>
3. When accessToken expires → call /refresh-token with refreshToken
4. Receive new accessToken + refreshToken (old one is invalidated)
```

## Rate Limiting

| Route | Limit |
|---|---|
| All routes | 100 requests / 15 minutes |
| Auth routes | 10 requests / 15 minutes |

Rate limits are stored in Redis and persist across restarts.

## Event-Driven Architecture

Services communicate asynchronously via Kafka:

| Event | Producer | Consumer | Action |
|---|---|---|---|
| `post.deleted` | post-service | media-service | Delete associated media from Cloudinary + MongoDB |
| `post.deleted` | post-service | search-service | Remove post from search index |
| `post.created` | post-service | search-service | Index post for search |

## Project Structure

```
social-media-microservices/
├── api-gateway/
│   └── src/
│       ├── middlewares/      # auth, errorHandler, rateLimiter
│       ├── routes/           # proxy routes to services
│       ├── utils/            # logger
│       └── server.js
├── identity-service/
│   └── src/
│       ├── controllers/      # register, login, refresh, logout
│       ├── models/           # User, RefreshToken
│       ├── routes/
│       ├── utils/            # logger, validation, token generation
│       └── server.js
├── post-service/
│   └── src/
│       ├── controllers/      # CRUD operations
│       ├── events/           # Kafka producer
│       ├── models/           # Post
│       ├── utils/            # logger, validation, kafkaClient
│       └── server.js
├── media-service/
│   └── src/
│       ├── controllers/      # upload, delete, getAll
│       ├── events/           # Kafka consumer + message router
│       ├── middlewares/      # auth, upload (multer)
│       ├── models/           # Media
│       ├── utils/            # logger, cloudinary, kafkaClient
│       └── server.js
├── search-service/
│   └── src/
│       ├── controllers/      # search
│       ├── events/           # Kafka consumer + handlers
│       ├── models/           # Search
│       ├── utils/            # logger, kafkaClient
│       └── server.js
└── docker-compose.yml
```

## Development

### Hot Reload

All services use `nodemon` with `--legacy-watch` for hot reload on Windows/WSL:

```json
"dev": "nodemon --legacy-watch src/server.js"
```

### Rebuild a single service

When you install a new npm package:

```bash
docker compose up --build <service-name>
```

### View logs

```bash
# all services
docker compose logs -f

# specific service
docker compose logs -f post-service
```

### Stop everything

```bash
docker compose down
```

### Stop and remove volumes

```bash
docker compose down -v
```

## Environment Variables

Each service has a `.env.docker.example` file. Key variables:

| Variable | Description |
|---|---|
| `MONGODB_URL` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret for signing JWT tokens |
| `REDIS_URL` | Redis connection URL |
| `KAFKA_BROKER` | Kafka broker address |
| `CLOUDINARY_*` | Cloudinary credentials (media-service) |
