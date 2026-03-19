import "dotenv/config";
import express from "express";
import Redis from "ioredis";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import logger from "./utils/logger.js";
import errorHandler from "./middlewares/errorHandler.js";
import postRoutes from "./routes/post-route.js";
import { connectProducer, disconnectProducer } from "./utils/kafkaClient.js";

const app = express();
const PORT = process.env.PORT || 3002;

const redisClient = new Redis(process.env.REDIS_URL);
redisClient.on("error", (err) =>
  logger.error("Redis error", { error: err.message }),
);
redisClient.on("connect", () => logger.info("Redis connected"));

//middlewares
app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info("Received request body", { body: req.body });
  next();
});

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use(
  "/api/post",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes,
);

app.use(errorHandler);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    logger.info("Post-service connected to mongodb.");
    await connectProducer();

    app.listen(PORT, () => {
      logger.info(`Post-service started on PORT: ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to start server", error);
    process.exit(1);
  }
};

startServer();

// check kafkajs documentation for the below code
// gracefully handling alll unforseen errors
const errorTypes = ["unhandledRejection", "uncaughtException"];
errorTypes.forEach((type) => {
  process.on(type, async (error) => {
    try {
      logger.error(`process.on ${type}`, { error });
      await disconnectProducer();
      await mongoose.connection.close();
      process.exit(0);
    } catch (_) {
      process.exit(1);
    }
  });
});

// handle signals — disconnect then re-raise for clean OS exit
const signalTraps = ["SIGTERM", "SIGINT", "SIGUSR2"];
signalTraps.forEach((type) => {
  process.once(type, async () => {
    try {
      await disconnectProducer();
      await mongoose.connection.close();
    } finally {
      process.kill(process.pid, type); // re-raise signal
    }
  });
});
