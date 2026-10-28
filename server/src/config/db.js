import mongoose from "mongoose";
import env from "./env.js";
import logger from "../utils/logger.js";
import "../models/index.js";

export async function connectDb(uri = env.MONGODB_URI) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 8000,
    autoIndex: !env.isProd || process.env.AUTO_INDEX === "true",
  });
  console.log("MongoDB connected✅");
  return mongoose.connection;
}
export const syncIndexes = async () => {
  for (const m of Object.values(mongoose.models)) await m.syncIndexes();
};
export const disconnectDb = () => mongoose.disconnect();
