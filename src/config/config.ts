import { config as dotenvConfig } from 'dotenv';
dotenvConfig();

const _config = {
    port: process.env.PORT || 3000,
    databaseURL: process.env.MONGO_URI,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
}

export const config = Object.freeze(_config);