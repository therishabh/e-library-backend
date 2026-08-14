import express from "express";
import {
    registerUser,
    loginUser,
    getMe,
    updateMe,
    changePassword,
    forgotPassword,
    resetPassword,
    deleteMe,
} from "./users.controller";
import {
    registerValidationRules,
    loginValidationRules,
    updateProfileValidationRules,
    changePasswordValidationRules,
    forgotPasswordValidationRules,
    resetPasswordValidationRules,
} from "./users.validator";
import validateRequest from "../middlewares/validateRequest";
import authenticate from "../middlewares/authenticate";
import authenticateLocal from "../middlewares/authenticateLocal";

const userRouter = express.Router();

userRouter.post("/register", registerValidationRules, validateRequest, registerUser);

// "loginValidationRules" + "validateRequest" pehle basic input shape check
// karte hain (email/password present hain, email format sahi hai). Uske
// baad "authenticateLocal" (Passport "local" strategy) actual credential
// verification karta hai — email se user dhoondhna aur bcrypt se password
// compare karna. Sirf tabhi "loginUser" controller chalta hai jab dono
// steps pass ho jayein.
userRouter.post("/login", loginValidationRules, validateRequest, authenticateLocal, loginUser);

userRouter.post("/forgot-password", forgotPasswordValidationRules, validateRequest, forgotPassword);
userRouter.post("/reset-password", resetPasswordValidationRules, validateRequest, resetPassword);

// "/me" wale sabhi routes protected hain — "authenticate" pehle JWT verify
// karke `req.userId` set karta hai, tabhi jaake controller chalta hai.
userRouter.get("/me", authenticate, getMe);
userRouter.patch("/me", authenticate, updateProfileValidationRules, validateRequest, updateMe);
userRouter.patch("/me/password", authenticate, changePasswordValidationRules, validateRequest, changePassword);
userRouter.delete("/me", authenticate, deleteMe);

export default userRouter;
