import { config } from './src/config/config';
import app from './src/app';

const PORT = config.port;

const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}

startServer();