import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);

  if (res.headersSent) return next(err);

  const status = err.status || 500;
  const message =
    err.clientMessage ||
    (status >= 500 ? "Internal server error." : err.message);

  return res.status(status).json({
    success: false,
    message,
  });
};

export default errorHandler;
