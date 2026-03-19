import proxy from "express-http-proxy";
import validateToken from "../middlewares/auth.js";
import logger from "../utils/logger.js";

const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/api\/v1\b/, "/api");
  },
  proxyErrorHandler: (err, req, res) => {
    logger.error(`Proxy error: ${err.message}`);
    return res.status(500).json({
      success: false,
      messsage: "Internal server error.",
      error: err.message,
    });
  },
};

export const initRoutes = (app, authLimiter) => {
  app.use(
    "/api/v1/auth",
    authLimiter,
    proxy(process.env.IDENTITY_SERVICE_URL, {
      ...proxyOptions,
      proxyReqOptDecorator: (proxyReqOpts, scrReq) => {
        proxyReqOpts.headers["content-type"] = "application/json";
        return proxyReqOpts;
      },
      userResDecorator: (proxyRes, proxyResData) => {
        logger.info(`Response from Identity Service: ${proxyRes.statusCode}`);
        return proxyResData;
      },
    }),
  );

  app.use(
    "/api/v1/post",
    validateToken,
    proxy(process.env.POST_SERVICE_URL, {
      ...proxyOptions,
      proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["content-type"] = "application/json";
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
        return proxyReqOpts;
      },
      userResDecorator: (proxyRes, proxyResData) => {
        logger.info(`Response from Post Service: ${proxyRes.statusCode}`);
        return proxyResData;
      },
    }),
  );

  app.use(
    "/api/v1/media",
    validateToken,
    proxy(process.env.MEDIA_SERVICE_URL, {
      ...proxyOptions,
      proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
        proxyReqOpts.headers["x-user-id"] = srcReq.user.userId;
        const contentType = srcReq.get("content-type");
        if (!contentType?.startsWith("multipart/form-data")) {
          proxyReqOpts.headers["content-type"] = "application/json";
        }
        return proxyReqOpts;
      },
      userResDecorator: (proxyRes, proxyResData) => {
        logger.info(`Response from Media Service: ${proxyRes.statusCode}`);
        return proxyResData;
      },
      parseReqBody: false,
    }),
  );
};
