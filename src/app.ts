import express from 'express';
import globalErrorHandler from './middlewares/globalErrorHandler';
import userRouter from './users/users.route';

const app = express();

// Incoming JSON request bodies (req.body) ko parse karne ke liye — iske
// bina POST /register aur POST /login me req.body hamesha undefined aayega.
app.use(express.json());

//Routes
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to the E-Library API' });
});

// User routes — /api/users/register aur /api/users/login ke liye
app.use('/api/users', userRouter);


// Global Error Handler
app.use(globalErrorHandler);


export default app;