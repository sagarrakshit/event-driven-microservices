import rateLimit from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";
import logger from "../utils/logger.js";

const createRateLimiter = (limit, redisClient, message) => {
  return rateLimit({
    windowMs: 15 * 60 * 1000,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP : ${req.ip}`);
      return res.status(429).json({
        success: false,
        message,
      });
    },
    store: new RedisStore({
      sendCommand: (...args) => redisClient.call(...args),
    }),
  });
};

export const createAuthLimiter = (redisClient) =>
  createRateLimiter(
    10,
    redisClient,
    "Too many login attempts. Please try again later.",
  );
export const createGlobalLimiter = (redisClient) =>
  createRateLimiter(100, redisClient, "Too many requests.");
