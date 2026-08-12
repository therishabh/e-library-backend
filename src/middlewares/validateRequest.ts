import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";
import createHttpError from "http-errors";

// ============================================================================
// VALIDATE REQUEST MIDDLEWARE
// ============================================================================
//
// WHAT: "express-validator" ke saath kaam karne ka pattern yeh hai — pehle
// route par validation "rules" (jaise body('email').isEmail()) chain ki
// tarah lagate hain, aur wo rules sirf errors ko REQUEST OBJECT ke andar
// collect kar dete hain, khud response nahi bhejte. Is generic middleware
// ka kaam hai un collected errors ko check karna aur agar koi mile to
// ek hi jagah se 400 error throw karna.
//
// WHY separate/reusable: Har route (register, login, aur future me jo bhi
// naye routes aayenge — books, etc.) apne alag validation rules define
// karega, lekin "check karo aur error bhejo" wala logic sabke liye same
// rahega — isliye yeh ek generic, reusable middleware hai jise kisi bhi
// rules array ke baad lagaya ja sakta hai.
//
// HOW/WHEN: Route me isse hamesha validation rules ARRAY ke BAAD lagate
// hain, jaise:
//   router.post('/register', registerValidationRules, validateRequest, registerUser)
// Express in sabko sequence me chalata hai — pehle rules apna kaam (check)
// karke `next()` call karte hain, phir yeh middleware un checks ka result
// dekhta hai, phir jaake controller (registerUser) tak request pahuchti hai.
// NOTE: "res" yaha use nahi ho raha (isliye "_res" naam diya — leading
// underscore se TypeScript "unused parameter" warning nahi deta), lekin
// isse signature se hata NAHI sakte. Express middleware ko hamesha
// (req, res, next) positional order me hi call karta hai — agar hum
// "res" ko params se poori tarah hata dete, to jo teesra argument
// (asli "next" function) Express bhejega wo is function ke "res" wale
// slot me chala jaata, aur humara `next()` call kabhi kaam nahi karta.
const validateRequest = (req: Request, _res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    console.log("Validation errors:", errors.array()); // Debugging ke liye console log

    
    // Agar koi validation error nahi mili, to sab kuch theek hai — request
    // ko aage controller tak jaane do.
    if (errors.isEmpty()) {
        return next();
    }

    // Errors ko ek simple, readable array me convert kar rahe hain — har
    // error ke saath field ka naam aur message, taki client (frontend) ko
    // exactly pata chale ki kaunsa field galat tha.
    const formattedErrors = errors.array().map((error) => ({
        field: "path" in error ? error.path : undefined,
        message: error.msg,
    }));

    // "createHttpError" ka 3rd argument extra properties set karne deta hai
    // — hum yaha "details" ke naam se saari field-wise errors attach kar
    // rahe hain, jo globalErrorHandler ke through client tak pahunch jayengi
    // (agar globalErrorHandler unhe response me include kare).
    return next(
        createHttpError(400, "Validation failed.", {
            details: formattedErrors,
        }),
    );
};

export default validateRequest;
