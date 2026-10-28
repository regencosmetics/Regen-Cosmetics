import express from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "node:path";
import fs from "node:fs";
import mongoose from "mongoose";
import env from "./config/env.js";
import logger from "./utils/logger.js";
import routes from "./routes/index.js";
import { webhook } from "./controllers/checkoutController.js";
import { sitemap } from "./controllers/publicController.js";
import { csrfProtection } from "./middleware/csrf.js";
import { rejectOperators } from "./middleware/validate.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";
import { seoMiddleware } from "./middleware/seo.js";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  if (env.TRUST_PROXY) app.set("trust proxy", env.TRUST_PROXY);
  app.use(
    pinoHttp({
      logger,
      autoLogging: false,
    }),
  );
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: env.SERVE_CLIENT
        ? {
            useDefaults: true,
            directives: {
              "img-src": ["'self'", "data:", "https://res.cloudinary.com"],
              "script-src": ["'self'", "https://checkout.razorpay.com"],
              "frame-src": [
                "'self'",
                "https://api.razorpay.com",
                "https://checkout.razorpay.com",
              ],
              "connect-src": [
                "'self'",
                "https://lumberjack.razorpay.com",
                "https://api.razorpay.com",
              ],
              "style-src": [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
              ],
              "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
            },
          }
        : false,
    }),
  );
  app.use(compression());
  app.use(
    cors({
      origin: (origin, cb) =>
        !origin || env.corsOrigins.includes(origin)
          ? cb(null, true)
          : cb(null, false),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: [
        "Content-Type",
        "X-CSRF-Token",
        "Idempotency-Key",
        "X-Test-Skip-Csrf",
      ],
    }),
  );

  // Razorpay webhook needs the exact raw body for HMAC verification, so it is mounted before express.json().
  app.post(
    "/api/v1/payments/webhook",
    express.raw({ type: "*/*", limit: "1mb" }),
    webhook,
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.get("/health", (_req, res) =>
    res.json({
      success: true,
      status: "ok",
      db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      uptime: Math.round(process.uptime()),
    }),
  );
  app.get("/sitemap.xml", sitemap);
  app.get("/robots.txt", (_req, res) =>
    res
      .type("text/plain")
      .send(
        `User-agent: *\nDisallow: /admin\nDisallow: /account\nDisallow: /checkout\nDisallow: /api/\nSitemap: ${env.CLIENT_URL.replace(/\/$/, "")}/sitemap.xml\n`,
      ),
  );

  app.use("/api/v1", apiLimiter, rejectOperators, csrfProtection, routes);
  app.use("/api", notFoundHandler);

  if (env.SERVE_CLIENT) {
    const dist = path.resolve(env.CLIENT_DIST || "../client/dist");
    if (fs.existsSync(dist)) {
      app.use(
        express.static(dist, {
          index: false,
          maxAge: "1h",
          setHeaders: (res, p) => {
            if (/\/assets\//.test(p))
              res.set("Cache-Control", "public, max-age=31536000, immutable");
          },
        }),
      );
      app.use(seoMiddleware(dist));
    }
  }
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
