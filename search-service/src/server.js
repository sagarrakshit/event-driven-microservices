import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoose from "mongoose";
import logger from "./utils/logger.js";
import {
  connectConsumer,
  disconnectConsumer,
  runConsumer,
  subscribeToTopic,
} from "./utils/kafka.js";
import messageRouter from "./events/messageRouter.js";

const app = express();
const PORT = process.env.PORT || 3004;

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info("Mongodb is connected"))
  .catch((e) => logger.error("Error connecting to mongodb", e));

app.use(cors());
app.use(helmet());
app.use(express.json());

const startServer = async () => {
  try {
    // start the consumers
    await connectConsumer();
    await subscribeToTopic("post.created");
    await subscribeToTopic("post.deleted");
    await runConsumer(messageRouter);

    app.listen(PORT, () => {
      logger.info(`Server started on port : ${PORT}`);
    });
  } catch (error) {
    await disconnectConsumer();
    logger.error("Error starting server", error);
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
    } finally {
      process.kill(process.pid, type); // re-raise signal
    }
  });
});
