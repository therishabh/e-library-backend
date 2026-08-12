import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import userModel from "./user.model";
import { config } from "../config/config";

// bcrypt "salt rounds" — hashing algorithm ko kitni baar internally repeat
// karna hai. Jitna zyada, utna hashing slow (aur brute-force ke against
// utna hi safe) hota hai. 10 industry-standard default value hai — na
// zyada slow, na zyada weak.
const SALT_ROUNDS = 10;

/**
 * POST /register
 *
 * WHAT: Naya user create karta hai — request body se (name, email, password)
 * leta hai, password ko hash karke DB me save karta hai, aur ek JWT token
 * generate karke response me bhej deta hai (taki user register hote hi
 * automatically "logged in" jaisa treat ho jaye).
 *
 * NOTE ON VALIDATION: "name/email/password required hain, email valid
 * format me ho, password kam se kam 6 characters ka ho" — yeh saare basic
 * checks ab is controller me nahi, balki route-level par
 * ("registerValidationRules" + "validateRequest" middleware,
 * users.route.ts me) ho chuke hote hain. Matlab jab tak execution yaha
 * tak pahuchta hai, hum bharose se maan sakte hain ki "req.body" already
 * valid shape me hai.
 *
 * WHY bcrypt: Password kabhi bhi plain-text me DB me store nahi karte —
 * agar kabhi DB leak/hack ho jaye to attacker ko directly passwords na mil
 * jayein. bcrypt ek "one-way" hashing algorithm hai — hash se original
 * password wapas nikalna practically impossible hai.
 */
const registerUser = async (req: Request, res: Response, next: NextFunction) => {
    const { name, email, password } = req.body;

    try {
        // ---- DUPLICATE CHECK ----
        // Same email se pehle se koi user registered hai ya nahi — yeh check
        // hum khud bhi karte hain (schema me "unique: true" hai, lekin agar
        // hum khud pehle check kar lein to error message zyada user-friendly
        // ho jaata hai, DB ke raw duplicate-key error se behtar).
        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return next(createHttpError(409, "A user with this email already exists."));
        }

        // ---- PASSWORD HASHING ----
        // "bcrypt.hash" async hai (CPU-intensive kaam hai), isliye await
        // kar rahe hain taki event loop block na ho.
        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        // ---- CREATE USER IN DB ----
        const newUser = await userModel.create({
            name,
            email,
            password: hashedPassword, // yaha PLAIN password kabhi mat bhejna
        });

        // ---- GENERATE JWT TOKEN ----
        // Token ke "payload" me sirf non-sensitive, minimal data rakhte hain
        // (yaha user ki DB id — "sub" claim ka standard convention hai
        // "subject", matlab yeh token kiske liye issue hua hai).
        const token = generateToken(newUser._id.toString());

        // ---- RESPONSE ----
        // Password field kabhi bhi response me wapas nahi bhejte, chahe wo
        // hashed hi kyu na ho.
        return res.status(201).json({
            message: "User registered successfully.",
            token,
        });
    } catch (error) {
        // Koi bhi unexpected error (DB down, network issue, etc.) seedha
        // globalErrorHandler ko forward — wahi decide karega statusCode
        // aur response format.
        return next(error);
    }
};

/**
 * POST /login
 *
 * WHAT: Existing user ko authenticate karta hai — (email, password) leta
 * hai, DB me user dhoondta hai, bcrypt se password compare karta hai, aur
 * match hone par ek naya JWT token issue karta hai.
 *
 * NOTE ON VALIDATION: "email/password required hain, email valid format
 * me ho" — yeh check route-level par ("loginValidationRules" +
 * "validateRequest", users.route.ts me) already ho chuka hota hai.
 *
 * WHY same error message for "user not found" and "wrong password":
 * Security best-practice — agar hum alag-alag message dete ("user nahi
 * mila" vs "password galat hai") to attacker ko pata chal jaata ki konsa
 * email registered hai (email enumeration attack). Isliye dono cases me
 * ek hi generic "Invalid email or password." message bhejte hain.
 */
const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    const { email, password } = req.body;

    try {
        // ---- FIND USER ----
        const user = await userModel.findOne({ email });
        if (!user) {
            return next(createHttpError(401, "Invalid email or password."));
        }

        // ---- PASSWORD VERIFY ----
        // "bcrypt.compare" plain password ko dobara hash karke, DB me stored
        // hash ke saath compare karta hai — hum kabhi hash ko "decrypt"
        // nahi karte, sirf compare karte hain.
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return next(createHttpError(401, "Invalid email or password."));
        }

        // ---- GENERATE JWT TOKEN ----
        const token = generateToken(user._id.toString());

        // ---- RESPONSE ----
        return res.status(200).json({
            message: "Login successful.",
            token,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * HELPER: generateToken
 *
 * WHY separate function: registerUser aur loginUser dono ko same tarike se
 * token banana hota hai — logic ek jagah rakhne se duplication avoid hoti
 * hai aur agar kal secret/expiry logic change karna ho to sirf ek jagah
 * badalna padega.
 *
 * WHY throw if JWT_SECRET missing: JWT_SECRET wahi "key" hai jisse token
 * sign hota hai. Agar yeh env variable set hi nahi hai, to app ko silently
 * aage nahi badhne dena chahiye (warna token insecure ban sakta hai) —
 * isliye turant ek clear 500 error throw kar rahe hain taki misconfiguration
 * jaldi pakad me aaye.
 */
const generateToken = (userId: string): string => {
    if (!config.jwtSecret) {
        throw createHttpError(500, "JWT secret is not configured on the server.");
    }

    return jwt.sign({ sub: userId }, config.jwtSecret, {
        expiresIn: config.jwtExpiresIn,
    } as jwt.SignOptions);
};

export { registerUser, loginUser };
