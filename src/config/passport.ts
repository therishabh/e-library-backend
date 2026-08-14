import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";
import userModel from "../users/user.model";

// ============================================================================
// PASSPORT — "local" STRATEGY (email + password)
// ============================================================================
//
// WHAT IS A "STRATEGY": Passport khud authentication nahi karta — yeh sirf
// ek common framework/interface hai. Asal "check kaise karna hai" wala
// logic ek "strategy" ke andar likha jata hai. "passport-local" wo strategy
// hai jo classic username/password (yaha humare case mein email/password)
// verify karti hai. Iske alawa aur strategies hoti hain — "passport-jwt"
// (JWT verify karne ke liye), "passport-google-oauth20" (Google login ke
// liye), etc. — sabka use karne ka tareeka same rehta hai
// (`passport.authenticate("strategy-name")`), sirf andar ka verification
// logic badalta hai.
//
// "passport.use(new LocalStrategy(options, verifyCallback))" — is call se
// hum strategy ko GLOBALLY register kar rahe hain, Passport ke internal
// registry mein "local" naam se. Isके baad kahi bhi route par
// `passport.authenticate("local", ...)` likh kar isse use kiya ja sakta
// hai (dekho users.route.ts).
passport.use(
    new LocalStrategy(
        {
            // Default rooop mein passport-local "username" aur "password"
            // naam ke fields expect karta hai request body mein. Humara
            // app "email" field use karta hai (jaisa register/login
            // dono mein consistent hai), isliye yaha bata rahe hain ki
            // "username" ki jagah "email" field padho.
            usernameField: "email",
            passwordField: "password",
        },
        // ---- VERIFY CALLBACK ----
        // Yehi humara ASLI authentication logic hai — bilkul wahi jo
        // pehle "loginUser" controller ke andar manually likha hua tha
        // (findOne + bcrypt.compare), bas ab yeh ek "strategy" ke andar
        // hai taki Passport ke standard flow se integrate ho sake.
        //
        // "done" callback teen tarah se call ho sakta hai:
        //   done(error)                    -> kuch unexpected fail hua (DB down, etc.)
        //   done(null, false, { message }) -> authentication FAIL hui (galat email/password)
        //   done(null, user)               -> authentication SUCCESS, yeh user hai
        // Passport in teeno cases ko differentiate karke aage
        // route-level callback ko sahi arguments ke saath call karta hai
        // (dekho users.route.ts ka "authenticateLocal" wrapper).
        async (email, password, done) => {
            try {
                const user = await userModel.findOne({ email });
                if (!user) {
                    return done(null, false, { message: "Invalid email or password." });
                }

                const isPasswordValid = await bcrypt.compare(password, user.password);
                if (!isPasswordValid) {
                    return done(null, false, { message: "Invalid email or password." });
                }

                return done(null, user);
            } catch (error) {
                return done(error);
            }
        },
    ),
);

// Is file ko "side-effect import" ke roop mein app.ts mein import kiya
// jayega (matlab sirf `import "./config/passport"` — koi named/default
// value use kiye bina) — sirf isliye taki upar wala `passport.use(...)`
// call chal jaye aur strategy register ho jaye, app start hote hi.
export default passport;
