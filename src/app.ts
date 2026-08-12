import express from "express";
import createHttpError from "http-errors";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import userRouter from "./users/users.route";
import bookRouter from "./books/books.route";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
    res.json({ message: "Welcome to the E-Library API" });
});

app.use("/api/users", userRouter);
app.use("/api/books", bookRouter);

app.use((req, _res, next) => {
    next(createHttpError(404, `Route ${req.originalUrl} not found.`));
});

app.use(globalErrorHandler);

export default app;
