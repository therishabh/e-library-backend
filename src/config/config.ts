import { config as dotenvConfig } from "dotenv";
dotenvConfig();

const requireEnv = (key: string): string => {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};

const _config = {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || "development",
    databaseURL: requireEnv("MONGO_URI"),
    jwtSecret: requireEnv("JWT_SECRET"),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
};

export const config = Object.freeze(_config);
