import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import driveRoutes from "./routes/drive.routes.js";

const app = express();

// Raised from Express's 100kb default so file uploads (sent as base64
// JSON, see drive.controller.js's `upload`) fit. 34mb comfortably
// covers the ~25MB file cap plus base64's ~33% size overhead.
app.use(express.json({ limit: "34mb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/drive", driveRoutes);
export default app;