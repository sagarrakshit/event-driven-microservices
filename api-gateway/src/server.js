import "dotenv/config";
import cors from "cors";
import express from "express";
import errorHandler from "./middlewares/errorHandler.js";
import helmet from "helmet";
import Redis from "ioredis";
import logger from "./utils/logger.js";
import {
  createAuthLimiter,
  createGlobalLimiter,
} from "./middlewares/rateLimiter.js";
import { initRoutes } from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

// redis
const redisClient = new Redis(process.env.REDIS_URL);
redisClient.on("error", (err) =>
  logger.error("Redis error", { error: err.message }),
);
redisClient.on("connect", () => logger.info("Redis connected"));

const globalLimiter = createGlobalLimiter(redisClient);
const authLimiter = createAuthLimiter(redisClient);

//middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  if (req.path.startsWith("/api/v1/auth")) return next();
  return globalLimiter(req, res, next);
});

//request logger
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info("Request body", { body: req.body });
  next();
});

// health-check
app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

// routes
initRoutes(app, authLimiter);

// error-handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway started on PORT ${PORT}`);
  logger.info(`Identity Service: ${process.env.IDENTITY_SERVICE_URL}`);
  logger.info(`Post Service: ${process.env.POST_SERVICE_URL}`);
  logger.info(`Media Service: ${process.env.MEDIA_SERVICE_URL}`);
});

// gracefully handling all unforseen errors
const errorTypes = ["unhandledRejection", "uncaughtException"];
errorTypes.forEach((type) => {
  process.on(type, async (error) => {
    try {
      logger.error(`process.on ${type}`, { error });
      redisClient.disconnect();
      process.exit(0);
    } catch (_) {
      process.exit(1);
    }
  });
});

const signalTraps = ["SIGTERM", "SIGINT", "SIGUSR2"];
signalTraps.forEach((type) => {
  process.once(type, async () => {
    try {
      redisClient.disconnect();
    } finally {
      process.kill(process.pid, type);
    }
  });
});
