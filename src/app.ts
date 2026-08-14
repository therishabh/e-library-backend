import path from "path";
import express from "express";
import createHttpError from "http-errors";
import passport from "./config/passport";
import globalErrorHandler from "./middlewares/globalErrorHandler";
import userRouter from "./users/users.route";
import bookRouter from "./books/books.route";

const app = express();

app.use(express.json());

// Passport ko har request ke saath kaam karne ke liye "initialize()"
// middleware chahiye hota hai — yeh request object par Passport ke internal
// helpers (jaise `req.login`) attach karta hai, jinke bina
// "passport.authenticate(...)" (dekho middlewares/authenticateLocal.ts)
// kaam nahi karega.
//
// NOTE: Yeh `passport.session()` NAHI hai — humein wo nahi chahiye. Woh
// tab lagta hai jab tum COOKIE-based sessions use karte ho (login ke baad
// server ek session ID cookie bhejta hai, aur user ka data server-side
// session store mein rehta hai). Humara app poori tarah stateless hai —
// har request apna JWT khud carry karti hai (Authorization header mein),
// isliye session middleware ki zaroorat hi nahi.
app.use(passport.initialize());

// "uploadCoverImage" middleware (multer) uploaded book covers ko
// "<project-root>/uploads/covers" folder me disk par save karta hai. Sirf
// disk par save karna kaafi nahi — koi bhi client ne agar wo image dekhni
// hai (jaise browser me `<img src="...">`), to server ko us folder ko
// PUBLICLY serve bhi karna padega. "express.static" exactly yehi karta
// hai: yeh ek built-in Express middleware hai jo diye gaye folder ke andar
// ki files ko seedha URL se accessible bana deta hai.
//
// Yaha "/uploads" prefix par mount kiya hai, isliye
// "uploads/covers/abc123.jpg" file browser me
// "http://localhost:8080/uploads/covers/abc123.jpg" pe accessible hogi —
// bilkul wahi URL jo "books.controller.ts" ki "resolveCoverImage" function
// banati hai.
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

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
