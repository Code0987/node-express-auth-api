import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
  dotenv.config({ path: ".env" });
} else {
  process.exit(1);
}

export const ENVIRONMENT = process.env.NODE_ENV;
export const prod = ENVIRONMENT === "production";

export const MONGODB_URI = process.env["MONGODB_URI"];

export const SECRET = process.env["SECRET"];

export const SMTP_URI = process.env["SMTP_URI"];
export const SMTP_SENDER = process.env["SMTP_SENDER"];
