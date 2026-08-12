import { NextFunction, Response, Request } from "express";
import { HttpError } from "http-errors";
import { config } from "../config/config";

// ============================================================================
// GLOBAL ERROR HANDLER MIDDLEWARE
// ============================================================================
//
// YEH KYA HAI (What):
// Express me do tarah ke middleware hote hain:
//   1. Normal middleware   -> (req, res, next)          => 3 arguments
//   2. Error-handling middleware -> (err, req, res, next) => 4 arguments
// Express sirf ARGUMENTS KI COUNT dekh kar decide karta hai ki koi function
// error handler hai ya normal middleware — parameter ka naam (err ho ya
// kuch aur) koi matter nahi karta, sirf 4 hone chahiye.
// Isliye neeche (req, next) directly use nahi bhi ho rahe ho, phir bhi
// signature se hata mat dena — agar hata diya to yeh sirf 3-argument wala
// function ban jayega aur Express ise normal middleware samjhega, error
// handler nahi. Matlab yeh function kabhi call hi nahi hoga jab error aayegi.
//
// YEH KYU CHAHIYE (Why):
// Bina is middleware ke, agar kisi route/controller me error throw hoti hai
// (jaise DB call fail hui, ya humne khud "next(createHttpError(...))" call
// kiya), to Express apna default (ugly HTML) error page bhej dega. Isse:
//   - Client (React app / Postman) ko consistent JSON format nahi milega.
//   - Production me galti se sensitive stack trace bhi expose ho sakta hai.
// Is middleware ki wajah se poori application ke liye EK HI JAGAH par
// error response ka format define hota hai — chahe error kisi bhi
// route/controller se aaya ho.
//
// YEH KAAM KAB HOTA HAI / KAISE TRIGGER HOTA HAI (When/How):
// Jab bhi koi route/controller/middleware "next(error)" call karta hai
// (error object pass karke), Express normal middleware chain ko skip
// karke seedha is error-handling middleware tak pahuch jaata hai.
//
// IMPORTANT — REGISTRATION ORDER:
// Is middleware ko app.ts me hamesha SABSE LAST "app.use(...)" ke roop me
// register karna hai, sab routes ke baad. Kyuki Express middleware ko
// top-se-bottom order me hi check karta hai — agar isse pehle hi kahi
// register kar diya to baad wale routes ki errors iske paas kabhi pahuchengi
// hi nahi.
const globalErrorHandler = (err: HttpError, req: Request, res: Response, next: NextFunction) => {
    // GUARD (safety check):
    // "res.headersSent" batata hai ki response ka header part already
    // client ko bheja ja chuka hai ya nahi (jaise agar koi upstream code
    // stream/chunk bhejna already start kar chuka tha). Agar aisa ho chuka
    // hai to hum dobara "res.status().json()" call NAHI kar sakte — Node.js
    // isme crash kar dega ("ERR_HTTP_HEADERS_SENT" error). Isliye is case
    // me hum khud response bhejne ki koshish nahi karte, balki "next(err)"
    // call karke Express ke apne built-in default error handler ko de dete
    // hain — wo safely connection close kar dega.
    if (res.headersSent) {
        return next(err);
    }

    // STATUS CODE decide karna:
    // "http-errors" package (jaise createHttpError(404, "Not Found")) se
    // aayi hui errors me "statusCode" property already set hoti hai — inhe
    // "operational errors" kehte hain, matlab yeh expected/planned errors
    // hain (validation fail, not found, unauthorized, etc.).
    // Lekin agar koi unexpected/programming error aayi (jaise ek TypeError,
    // ya DB driver ka crash, ya humari khud ki coding mistake), to usme
    // "statusCode" property hoti hi nahi. Us case me hum default 500
    // (Internal Server Error) use karte hain, taki client ko kabhi
    // "undefined" status code na jaaye.
    const statusCode = err.statusCode || 500;

    // LOGGING:
    // Server ke terminal/logs me ek readable line print kar rahe hain —
    // konsa HTTP method tha, konsa URL tha, aur kya statusCode gaya —
    // taki debugging ke waqt jaldi pata chal jaye ki request kahan fail
    // hui. Saath me "err.stack" bhi print kar rahe hain jisse exact file
    // aur line number pata chalta hai jahan se error throw hui thi.
    // NOTE: Bade production apps me "console.error" ki jagah proper logger
    // (jaise winston/pino) use hota hai, lekin abhi ke liye console.error
    // theek hai.
    console.error(`[${req.method}] ${req.originalUrl} -> ${statusCode}`, err.stack);

    // Ab client ko ek CONSISTENT JSON response bhej rahe hain:
    return res.status(statusCode).json({
        // Actual error message jo original error throw karte waqt diya gaya
        // tha (jaise "User not found"). Agar kisi wajah se message set nahi
        // tha, to generic fallback text de rahe hain.
        error: err.message || "Something went wrong!",

        // Yeh ek fixed, generic, user-friendly message hai — frontend
        // isko directly UI par dikha sakta hai bina yeh soche ki internal
        // error text kabhi change ho sakta hai ya kuch sensitive reveal
        // kar sakta hai.
        message: "An unexpected error occurred. Please try again later.",

        // SECURITY NOTE:
        // Stack trace (jisme file paths, function names, code structure
        // dikhta hai) sirf "development" environment me hi client ko
        // bhej rahe hain — taki humein local testing ke waqt debugging
        // easy rahe. Production me isse "undefined" rakhte hain, kyuki
        // agar yeh kisi attacker ke haath lag jaye to unhe app ki
        // internal file structure/code ka andaza mil sakta hai — yeh
        // ek well-known security risk (information disclosure) hai.
        errorStack: config.env === "development" ? err.stack : undefined,

        // statusCode ko JSON body me bhi bhej rahe hain (HTTP response
        // header me already hota hai), taki jo bhi client sirf response
        // body parse kar raha ho, use bhi status code easily mil jaye.
        statusCode: statusCode,

        // "details" — optional field-wise info (jaise express-validator se
        // aayi validation errors: { field: "email", message: "..." }[]).
        // "createHttpError(400, msg, { details })" jaisi call se yeh
        // property error object par set hoti hai. Agar kisi error me yeh
        // set nahi hai, to "undefined" jayega aur JSON.stringify ise
        // response se automatically drop kar dega.
        details: (err as HttpError & { details?: unknown }).details,
    });
};

// Default export — taki app.ts me isse import karke sabhi routes ke
// baad "app.use(globalErrorHandler)" se register kiya ja sake.
export default globalErrorHandler;