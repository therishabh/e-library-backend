import { body } from "express-validator";

// ============================================================================
// USER VALIDATION RULES (express-validator)
// ============================================================================
//
// WHAT: Yeh "rule chains" hain — har chain ek field ko check karta hai.
// Yeh khud koi error throw/response nahi karte, sirf failures ko request
// ke andar collect kar dete hain. Actual "check karo aur error bhejo" wala
// kaam "validateRequest" middleware karta hai (jo inke turant baad route
// me lagaya jaata hai).
//
// WHY route se pehle, controller se bahar: Isse controller sirf "business
// logic" (DB me user create karna, password compare karna) par focus karta
// hai — "kya input sahi format me hai" wala kaam yaha, route-level par,
// alag se define ho jaata hai. Isse rules reusable bhi ban jaate hain agar
// kal kisi aur route (jaise "update profile") me bhi same email/password
// validation chahiye ho.

export const registerValidationRules = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Name is required.")
        .isLength({ min: 2 })
        .withMessage("Name must be at least 2 characters long."),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required.")
        .isEmail()
        .withMessage("Please provide a valid email address.")
        .normalizeEmail(), // "John@Example.com" -> "john@example.com", taki
    // duplicate-email check case-insensitive tarike se kaam kare.

    body("password")
        .notEmpty()
        .withMessage("Password is required.")
        .isLength({ min: 6 })
        .withMessage("Password must be at least 6 characters long.")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        .withMessage(
            "Password must contain at least one uppercase letter, one lowercase letter, and one number.",
        ),
];

export const loginValidationRules = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required.")
        .isEmail()
        .withMessage("Please provide a valid email address.")
        .normalizeEmail(),

    // Login me hum password ka LENGTH/FORMAT check nahi karte (jaise
    // register me karte hain) — kyuki agar user ka purana password kisi
    // wajah se current rules se match na kare (jaise rules baad me change
    // hui hon), phir bhi use login karne dena chahiye. Bas itna check
    // kaafi hai ki field khali na ho.
    body("password").notEmpty().withMessage("Password is required."),
];

// PATCH /me — dono fields optional hain (user sirf name ya sirf email bhi
// update kar sakta hai), lekin agar field bheji hai to uska format sahi
// hona chahiye. ".optional()" ka matlab hai ki field bheji hi na jaye to
// yeh rule skip ho jayega, lekin present hote hue empty string invalid
// maani jayegi.
export const updateProfileValidationRules = [
    body("name")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Name cannot be empty.")
        .isLength({ min: 2 })
        .withMessage("Name must be at least 2 characters long."),

    body("email")
        .optional()
        .trim()
        .notEmpty()
        .withMessage("Email cannot be empty.")
        .isEmail()
        .withMessage("Please provide a valid email address.")
        .normalizeEmail(),
];

// PATCH /me/password — "currentPassword" sirf presence check hoti hai
// (jaise login me), asli verification controller me bcrypt.compare se
// hoti hai. "newPassword" par wahi strength policy lagti hai jo register
// ke password par lagti hai.
export const changePasswordValidationRules = [
    body("currentPassword").notEmpty().withMessage("Current password is required."),

    body("newPassword")
        .notEmpty()
        .withMessage("New password is required.")
        .isLength({ min: 6 })
        .withMessage("New password must be at least 6 characters long.")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        .withMessage(
            "New password must contain at least one uppercase letter, one lowercase letter, and one number.",
        ),
];

export const forgotPasswordValidationRules = [
    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required.")
        .isEmail()
        .withMessage("Please provide a valid email address.")
        .normalizeEmail(),
];

export const resetPasswordValidationRules = [
    body("token").trim().notEmpty().withMessage("Reset token is required."),

    body("newPassword")
        .notEmpty()
        .withMessage("New password is required.")
        .isLength({ min: 6 })
        .withMessage("New password must be at least 6 characters long.")
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
        .withMessage(
            "New password must contain at least one uppercase letter, one lowercase letter, and one number.",
        ),
];
