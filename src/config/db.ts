import mongoose from 'mongoose';
import { config } from './config';

const connectDB = async() => {
    try {
        const conn = await mongoose.connect(config.databaseURL as string);
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        conn.connection.on('error', (err) => {
            console.error(`MongoDB connection error: ${err}`);
            process.exit(1);
        });

        conn.connection.on('disconnected', () => {
            console.error('MongoDB disconnected. Attempting to reconnect...');
            connectDB();
        });

        conn.connection.on('reconnected', () => {
            console.log('MongoDB reconnected.');
        });

        conn.connection.on('connected', () => {
            console.log('MongoDB connected.');
        });

    } catch(error){
        console.error(`Error: ${(error as Error).message}`);
        process.exit(1);
    }
}

export default connectDB;