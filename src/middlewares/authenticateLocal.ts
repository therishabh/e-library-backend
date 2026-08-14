import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import passport from "../config/passport";
import { UserDocument } from "../users/user.model";

// ============================================================================
// AUTHENTICATE LOCAL MIDDLEWARE (Passport "local" strategy wrapper)
// ============================================================================
//
// WHAT: "passport.authenticate('local', options, callback)" call karne se
// ek Express middleware milta hai. Jab isse call karte hain, Passport
// khud:
//   1. `config/passport.ts` mein register ki gayi "local" strategy ko
//      dhoondta hai.
//   2. Uski "verify callback" ko `req.body` ke email/password ke saath
//      chalata hai.
//   3. Verify callback ka result (success/fail/error) is teesre argument
//      wale "callback" function ko de deta hai — yehi neeche likha hai.
//
// WHY "session: false": Passport by default ASSUME karta hai ki tum
// session-based auth use kar rahe ho (cookie + server-side session store),
// aur login ke baad `req.session` mein user ko serialize karne ki koshish
// karta hai. Humara app poori tarah STATELESS hai — har request JWT token
// se authenticate hoti hai (dekho middlewares/authenticate.ts), koi
// session/cookie store nahi hai. "session: false" Passport ko batata hai:
// "session wala kaam skip karo, bas verify karke result de do."
//
// WHY custom callback (3rd argument): Callback diye bina, agar
// authentication FAIL ho, Passport khud hi ek default `401 Unauthorized`
// response bhej deta hai — jo humare app ke consistent JSON error format
// (globalErrorHandler ke through) se match nahi karta. Custom callback
// dene se hum poora control apne haath mein le lete hain: fail hone par
// khud "createHttpError" bana kar `next(error)` karte hain, taki wahi
// generic error-handling pipeline chale jo baaki poore app mein use hoti
// hai.
const authenticateLocal = (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate(
        "local",
        { session: false },
        (error: Error | null, user: UserDocument | false, info: { message?: string } | undefined) => {
            // Case 1: Kuch unexpected fail hua (jaise DB query fail) —
            // seedha globalErrorHandler ko forward.
            if (error) {
                return next(error);
            }

            // Case 2: Authentication fail hui (galat email/password).
            // Strategy ke "done(null, false, { message })" se yehi "info"
            // aata hai.
            if (!user) {
                return next(createHttpError(401, info?.message || "Invalid email or password."));
            }

            // Case 3: Success — Passport ke convention ke hisaab se
            // authenticated user ko `req.user` par set karte hain (yeh
            // property "src/types/express.d.ts" mein already type-declared
            // hai). Aage "loginUser" controller isi `req.user` se JWT
            // generate karega.
            req.user = user;
            return next();
        },
    )(req, res, next);
};

export default authenticateLocal;
