import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import driveRoutes from "./routes/drive.routes.js";
import { clientUrls } from "./config/client.js";

const app = express();

if (process.env.VERCEL) {
  app.set("trust proxy", 1);
}

app.disable("x-powered-by");
app.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "private, no-store");
  next();
});

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: clientUrls,
    credentials: true,
  })
);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/drive", driveRoutes);

app.use("/api", (req, res) => {
  res.status(404).json({ success: false, message: "API route not found" });
});

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status === 400 || error.status === 413 ? error.status : 500;
  return res.status(status).json({
    success: false,
    message: status === 400 ? "Invalid request body" : status === 413 ? "Request body too large" : "Internal server error",
  });
});

export default app;
