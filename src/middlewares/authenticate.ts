import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import createHttpError from "http-errors";
import { config } from "../config/config";

/**
 * AUTHENTICATE MIDDLEWARE
 *
 * WHAT: "Authorization: Bearer <token>" header se JWT nikal kar verify
 * karta hai. Valid hone par token ke payload se user id (`sub` claim)
 * nikal kar `req.userId` par attach kar deta hai, taki aage koi bhi
 * protected route handler seedha `req.userId` use kar sake — dobara token
 * parse/verify karne ki zaroorat nahi padti.
 *
 * WHY generic 401 on any failure: Token missing ho, malformed ho, expire
 * ho chuka ho, ya signature match na ho — client ke liye in sabka matlab
 * same hai: "tumhe dobara login karna padega." Isliye internal reason ko
 * response me expose nahi karte, sirf ek consistent 401 bhejte hain.
 */
const authenticate = (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next(createHttpError(401, "Authentication token is missing."));
    }

    // Header ka format "Bearer <token>" hota hai — "Bearer " wala prefix
    // (uski length, yani 7 characters) hata kar sirf actual JWT string
    // nikal rahe hain.
    const token = authHeader.slice("Bearer ".length);

    try {
        // "jwt.verify" do kaam ek saath karta hai: (1) signature check —
        // token humare JWT_SECRET se hi sign hua tha ya nahi, aur (2)
        // expiry check — token abhi expire to nahi ho gaya. Dono me se
        // koi bhi fail ho to yeh function khud hi throw kar deta hai
        // (isliye try/catch ke andar hai). "as jwt.JwtPayload" cast isliye
        // lagaya hai kyuki `verify` ka return type union hai
        // (string | JwtPayload) — humara payload hamesha object (JwtPayload)
        // hoga kyuki sign karte waqt hum bhi object hi bhejte hain.
        const payload = jwt.verify(token, config.jwtSecret) as jwt.JwtPayload;

        // "sub" (subject) claim me humne token banate waqt (generateToken,
        // users.controller.ts) user ki DB id string ke roop me daali thi.
        // Yeh check bas ek safety-net hai — agar kabhi koi malformed/
        // tampered token yaha tak pahunch bhi jaye jisme "sub" missing ho
        // ya string na ho, to usse aage process na karein.
        if (typeof payload.sub !== "string") {
            return next(createHttpError(401, "Invalid authentication token."));
        }

        req.userId = payload.sub;
        return next();
    } catch (error) {
        // jwt.verify expired/tampered/malformed token par exception throw
        // karta hai — teeno cases ko ek hi generic message me convert kar
        // rahe hain (security ke liye, upar wali WHY note dekho).
        return next(createHttpError(401, "Invalid or expired authentication token."));
    }
};

export default authenticate;
