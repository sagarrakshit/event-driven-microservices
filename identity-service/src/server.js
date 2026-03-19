import "dotenv/config";
import mongoose from "mongoose";
import logger from "./utils/logger.js";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import router from "./routes/identity-service.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
const PORT = process.env.PORT;

mongoose
  .connect(process.env.MONGODB_URL)
  .then(() => logger.info("Connected to mongodb"))
  .catch((error) => logger.error("Mongodb connection error", error));

app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info("Request body", { body: req.body });
  next();
});

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.use("/api/auth", router);
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Identity service running on port ${PORT}`);
});

const errorTypes = ["unhandledRejection", "uncaughtException"];
errorTypes.forEach((type) => {
  process.on(type, async (error) => {
    try {
      logger.error(`process.on ${type}`, { error });
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
      await mongoose.connection.close();
    } finally {
      process.kill(process.pid, type);
    }
  });
});
