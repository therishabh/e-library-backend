import { config } from './src/config/config';
import app from './src/app';
import connectDB from './src/config/db';

const PORT = config.port;

const startServer = async() => {

    // connect to the database
    await connectDB();

    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

startServer();