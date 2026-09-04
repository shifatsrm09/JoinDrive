import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/auth.routes.js";
import healthRoutes from "./routes/health.routes.js";
import driveRoutes from "./routes/drive.routes.js";

const app = express();


app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/drive", driveRoutes);
export default app;
