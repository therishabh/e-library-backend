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

const userRouter = express.Router();

userRouter.post("/register", registerValidationRules, validateRequest, registerUser);
userRouter.post("/login", loginValidationRules, validateRequest, loginUser);

userRouter.post("/forgot-password", forgotPasswordValidationRules, validateRequest, forgotPassword);
userRouter.post("/reset-password", resetPasswordValidationRules, validateRequest, resetPassword);

// "/me" wale sabhi routes protected hain — "authenticate" pehle JWT verify
// karke `req.userId` set karta hai, tabhi jaake controller chalta hai.
userRouter.get("/me", authenticate, getMe);
userRouter.patch("/me", authenticate, updateProfileValidationRules, validateRequest, updateMe);
userRouter.patch("/me/password", authenticate, changePasswordValidationRules, validateRequest, changePassword);
userRouter.delete("/me", authenticate, deleteMe);

export default userRouter;
