import winston from "winston";

const { combine, timestamp, errors, splat, json, colorize, printf } =
  winston.format;

// custom format for console — more readable than simple()
const consoleFormat = printf(
  ({ level, message, timestamp, service, ...meta }) => {
    const metaStr = Object.keys(meta).length
      ? JSON.stringify(meta, null, 2)
      : "";
    return `${timestamp} [${service}] ${level}: ${message} ${metaStr}`;
  },
);

const logger = winston.createLogger({
  level:
    process.env.LOG_LEVEL ||
    (process.env.NODE_ENV === "production" ? "info" : "debug"),
  format: combine(
    timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    errors({ stack: true }),
    splat(),
    json(),
  ),
  defaultMeta: { service: "identity-service" },
  transports: [
    // console — only in non-production
    ...(process.env.NODE_ENV !== "production"
      ? [
          new winston.transports.Console({
            format: combine(
              colorize({ all: true }),
              timestamp({ format: "HH:mm:ss" }),
              consoleFormat,
            ),
          }),
        ]
      : []),

    // error log — only error level
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      maxsize: 5242880, // 5MB max file size
      maxFiles: 5, // keep last 5 files
    }),

    // combined log — all levels
    new winston.transports.File({
      filename: "logs/combined.log",
      maxsize: 5242880, // 5MB max file size
      maxFiles: 5, // keep last 5 files
    }),
  ],
});

export default logger;
