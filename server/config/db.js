import mongoose from "mongoose";

let connectionPromise;

export async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI must be configured");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 5,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 45_000,
      bufferCommands: false,
    }).finally(() => {
      connectionPromise = undefined;
    });
  }

  return connectionPromise;
}
