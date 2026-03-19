import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import mediaRoutes from "./routes/media-route.js";
import logger from "./utils/logger.js";
import {
  connectConsumer,
  disconnectConsumer,
  runConsumer,
  subscribeToTopic,
} from "./event-handlers/kafka.js";
import { deleteMedia } from "./controllers/media-controller.js";

const app = express();
const PORT = process.env.PORT || 3003;

app.use(cors());
app.use(helmet());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info("Request body", { body: req.body });
  next();
});

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/media", mediaRoutes);

const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URL);
    logger.info("Connected to mongodb");
    await connectConsumer();
    await subscribeToTopic("post.deleted");
    await runConsumer(deleteMedia);
    app.listen(PORT, () => {
      logger.info(`Media Service started on port ${PORT}`);
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
      await disconnectConsumer();
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
      await disconnectConsumer();
      await mongoose.connection.close();
    } finally {
      process.kill(process.pid, type); // re-raise signal
    }
  });
});
