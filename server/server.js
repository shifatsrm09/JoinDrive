import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = Number(process.env.PORT);
const HOST = process.env.HOST;

if (!HOST || !Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("Set HOST and a valid PORT in server/.env");
}

async function startServer() {
  await connectDB();

  app.listen(PORT, HOST, () => {
    console.log("✅ JoinDrive Server Running on port", PORT);
  });
}

startServer();
