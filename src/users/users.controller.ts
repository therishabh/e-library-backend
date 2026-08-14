import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import userModel, { UserDocument } from "./user.model";
import { config } from "../config/config";

// bcrypt "salt rounds" — hashing algorithm ko kitni baar internally repeat
// karna hai. Jitna zyada, utna hashing slow (aur brute-force ke against
// utna hi safe) hota hai. 10 industry-standard default value hai — na
// zyada slow, na zyada weak.
const SALT_ROUNDS = 10;

// "forgot password" reset token kitni der tak valid rahega. Chhota window
// rakhna better hai — agar email kahi leak/intercept ho jaye to attacker
// ke paas limited time hi hoga token use karne ke liye.
const RESET_TOKEN_EXPIRY_MS = 15 * 60 * 1000;

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
 * WHAT: Existing user ko login karta hai. Actual credential verification
 * (email dhoondhna, bcrypt se password compare karna) ab is controller me
 * NAHI hoti — wo kaam "authenticateLocal" middleware (Passport "local"
 * strategy, dekho middlewares/authenticateLocal.ts aur config/passport.ts)
 * route-level par pehle hi kar chuka hota hai, aur success hone par
 * verified user ko `req.user` par attach kar deta hai. Yeh controller ab
 * sirf ek kaam karta hai: usi verified user ke liye JWT token generate
 * karke response bhejna.
 *
 * WHY isse Passport ke through nikala: Pehle yeh sab logic (findOne +
 * bcrypt.compare + generic "Invalid email or password." error, taaki
 * email enumeration na ho) seedha is function ke andar tha. Ab wahi logic
 * "config/passport.ts" ki strategy ke andar hai — controller "HOW to
 * verify" se decouple ho gaya hai, sirf "verified user mil gaya, ab token
 * do" wala kaam karta hai.
 */
const loginUser = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // "authenticateLocal" middleware isse pehle hi "req.user" set kar
        // chuka hota hai (agar yaha tak execution pahuchi hai, matlab
        // authentication successful thi) — dekho
        // src/types/express.d.ts me "Express.User" augmentation.
        const user = req.user as UserDocument;

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

/**
 * GET /me
 *
 * WHAT: Currently logged-in user ki profile return karta hai. Isse pehle
 * "authenticate" middleware already JWT verify kar chuka hota hai aur
 * `req.userId` set kar chuka hota hai — yaha sirf usi id se user fetch
 * karna hai.
 */
const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        // ---- FETCH USER ----
        // "-password" se query level par hi password field response me
        // aane se pehle exclude kar rahe hain.
        const user = await userModel.findById(req.userId).select("-password");
        if (!user) {
            return next(createHttpError(404, "User not found."));
        }

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
            },
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * PATCH /me
 *
 * WHAT: Logged-in user apna name/email update kar sakta hai. Dono fields
 * optional hain (route-level validator dekho) — jo bheja gaya hai sirf
 * wahi update hota hai.
 *
 * WHY duplicate-email check yaha bhi: Agar user apna email change kar
 * raha hai to naya email kisi doosre account se already registered nahi
 * hona chahiye — bilkul registerUser wale check jaisa hi.
 */
const updateMe = async (req: Request, res: Response, next: NextFunction) => {
    const { name, email } = req.body;

    try {
        if (email) {
            // "_id: { $ne: req.userId }" ka matlab hai "current user ko
            // chhod kar." Yeh add na karte to jab user apna hi wahi purana
            // email dobara bhejta (jaise sirf name change kar raha ho par
            // email bhi bhej diya), to query use khud ko hi "duplicate"
            // samajh kar galti se 409 error de deti.
            const existingUser = await userModel.findOne({ email, _id: { $ne: req.userId } });
            if (existingUser) {
                return next(createHttpError(409, "A user with this email already exists."));
            }
        }

        const updatedUser = await userModel
            .findByIdAndUpdate(
                req.userId,
                {
                    ...(name && { name }),
                    ...(email && { email }),
                },
                // "new: true" se updated document milta hai (default old
                // document deta), "runValidators" se schema rules (jaise
                // "required") update ke time bhi apply hote hain.
                { new: true, runValidators: true },
            )
            .select("-password");

        if (!updatedUser) {
            return next(createHttpError(404, "User not found."));
        }

        return res.status(200).json({
            message: "Profile updated successfully.",
            user: {
                id: updatedUser._id,
                name: updatedUser.name,
                email: updatedUser.email,
            },
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * PATCH /me/password
 *
 * WHAT: Logged-in user apna password change kar sakta hai — current
 * password verify karne ke baad naya password hash karke save karta hai.
 *
 * WHY current password bhi maangte hain (sirf JWT token kaafi nahi):
 * Agar kisi ka token kisi tarah leak/steal ho jaye (jaise shared/public
 * computer), to current password maangna ek extra layer of protection
 * deta hai — attacker sirf token se account "takeover" (naya password set
 * karke asli user ko lock out) nahi kar sakta.
 */
const changePassword = async (req: Request, res: Response, next: NextFunction) => {
    const { currentPassword, newPassword } = req.body;

    try {
        const user = await userModel.findById(req.userId);
        if (!user) {
            return next(createHttpError(404, "User not found."));
        }

        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isCurrentPasswordValid) {
            return next(createHttpError(401, "Current password is incorrect."));
        }

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        await user.save();

        return res.status(200).json({ message: "Password changed successfully." });
    } catch (error) {
        return next(error);
    }
};

/**
 * POST /forgot-password
 *
 * WHAT: Email se user dhoondta hai, ek random reset token generate karta
 * hai, uska HASH (SHA-256) DB me expiry ke saath save karta hai, aur raw
 * token user ko "email" karta hai.
 *
 * NOTE: Abhi tak koi real email service (nodemailer/SES/etc.) is project
 * me wire nahi hai, isliye raw token ko console par log kar rahe hain —
 * sirf local development/testing ke liye. Production me yaha par actual
 * email bhejne wala code aayega.
 *
 * WHY hamesha same generic response bhejte hain (chahe email mile ya na
 * mile): Agar "yeh email registered nahi hai" jaisa alag message dete, to
 * attacker registered emails ka pata laga sakta (email enumeration
 * attack) — bilkul loginUser wale case jaisa hi reasoning.
 *
 * WHY token ka HASH store karte hain, raw token nahi: Reset token bhi
 * ek tarah se password jaisa hi sensitive hota hai — agar DB kabhi leak
 * ho jaye aur usme raw tokens stored hon, to attacker directly kisi ka
 * bhi password reset kar sakta hai. Hash store karne se yeh risk nahi
 * rehta (bilkul password hashing jaisa hi reasoning).
 */
const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body;
    const genericMessage = "If that email is registered, a password reset link has been sent.";

    try {
        const user = await userModel.findOne({ email });
        if (!user) {
            // Yaha jaan-boojh kar 404 nahi bhej rahe — user na milne par bhi
            // wahi generic success message return karte hain jo user milne
            // par jaata hai. Isse response se yeh pata nahi chalta ki email
            // registered thi ya nahi (upar wali "WHY hamesha same generic
            // response" note dekho — email enumeration se bachne ke liye).
            return res.status(200).json({ message: genericMessage });
        }

        // ---- GENERATE RESET TOKEN ----
        const rawToken = crypto.randomBytes(32).toString("hex");
        const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

        user.resetPasswordToken = hashedToken;
        user.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
        await user.save();

        // TODO: yaha par real email provider integrate karke "rawToken"
        // user ke email address par bhejna hai.
        console.log(`Password reset token for ${user.email}: ${rawToken}`);

        return res.status(200).json({ message: genericMessage });
    } catch (error) {
        return next(error);
    }
};

/**
 * POST /reset-password
 *
 * WHAT: "forgotPassword" se mila raw token aur naya password leta hai.
 * Token ko dobara hash karke DB me stored hash ke saath match karta hai —
 * match mile aur abhi expire na hua ho, tabhi naya password set hota hai.
 */
const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const { token, newPassword } = req.body;

    try {
        const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

        // Ek hi query mein DONO conditions check kar rahe hain:
        //   1. resetPasswordToken match kare — client se aaya raw token
        //      humne dobara hash kiya, ab DB mein stored hash se compare
        //      ho raha hai (raw token kabhi DB mein store nahi hota).
        //   2. resetPasswordExpires abhi ke time se aage ho ("$gt": greater
        //      than) — matlab token abhi tak expire nahi hua.
        // Agar dono match nahi hue (galat token, ya sahi token par expire
        // ho chuka), to query `null` return karegi aur neeche wala
        // "if (!user)" wahi ek generic "invalid or expired" error de dega —
        // client ko yeh pata nahi chalega ki exactly kaunsi wajah thi.
        const user = await userModel.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: new Date() },
        });

        if (!user) {
            return next(createHttpError(400, "Reset token is invalid or has expired."));
        }

        user.password = await bcrypt.hash(newPassword, SALT_ROUNDS);
        // Token ek baar use hone ke baad turant invalidate kar dete hain —
        // taki same token dobara replay na kiya ja sake.
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.status(200).json({ message: "Password has been reset successfully." });
    } catch (error) {
        return next(error);
    }
};

/**
 * DELETE /me
 *
 * WHAT: Logged-in user apna account permanently delete kar sakta hai.
 */
const deleteMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const deletedUser = await userModel.findByIdAndDelete(req.userId);
        if (!deletedUser) {
            return next(createHttpError(404, "User not found."));
        }

        return res.status(200).json({ message: "Account deleted successfully." });
    } catch (error) {
        return next(error);
    }
};

export {
    registerUser,
    loginUser,
    getMe,
    updateMe,
    changePassword,
    forgotPassword,
    resetPassword,
    deleteMe,
};
