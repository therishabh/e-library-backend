import express from 'express';
import { registerUser, loginUser } from './users.controller';
import { registerValidationRules, loginValidationRules } from './users.validator';
import validateRequest from '../middlewares/validateRequest';

const userRouter = express.Router();

// Har route par pehle validation "rules" chalti hain (request ko check karke
// errors collect karti hain), phir "validateRequest" un errors ko dekh kar
// zaroorat pade to 400 error bhej deta hai — tabhi jaake request controller
// (registerUser/loginUser) tak pahunchti hai.
userRouter.post('/register', registerValidationRules, validateRequest, registerUser);
userRouter.post('/login', loginValidationRules, validateRequest, loginUser);

export default userRouter;