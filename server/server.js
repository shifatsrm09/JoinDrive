import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log("======================================");
    console.log("🚀 JoinDrive Backend Started");
    console.log(`🌐 http://localhost:${PORT}`);
    console.log("======================================");
  });
}

startServer();