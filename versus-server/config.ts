import dotenv from "dotenv";
import { AiService } from "./AI-service";
dotenv.config({ path: ".env" });

export const connectionString = process.env.connectionStringAtlas!;
export const dbName = process.env.dbName!;
export const JWT_KEY = process.env.JWT_KEY!;
export const TOKEN_EXPIRY = "7d";
export const SALT_ROUNDS = 10;
export const aiService = new AiService();