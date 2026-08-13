import { Request, Response, NextFunction } from "express";
import multer from "multer";
import createHttpError from "http-errors";
import upload from "../config/multer";

// ============================================================================
// UPLOAD COVER IMAGE MIDDLEWARE
// ============================================================================
//
// WHAT: "upload.single('coverImage')" ek Express middleware RETURN karta
// hai (khud middleware nahi hai) — "coverImage" wo field-name hai jiske
// naam se client apni request me file bhejega (multipart/form-data form
// field). Yeh middleware:
//   1. Multipart request ko parse karta hai.
//   2. Text fields (title, author, etc.) ko `req.body` me daal deta hai —
//      bilkul waisa hi jaisa "express.json()" JSON body ke liye karta hai.
//   3. Uploaded file ko `req.file` me daal deta hai (config/multer.ts me
//      diye "storage"/"fileFilter"/"limits" rules apply karke).
//
// WHY isse seedha route par na lagakar, ek wrapper middleware banaya:
// Multer jab fail hota hai (jaise file size limit cross ho gayi, ya
// "fileFilter" ne reject kar diya), to wo apni khud ki "MulterError" class
// ka error "next(err)" ke through bhejta hai. Yeh error class "HttpError"
// nahi hai — isme "statusCode" property NAHI hoti. Agar hum isse seedha
// "globalErrorHandler" tak jaane dete, to wo "statusCode" na milne ki
// wajah se ise default 500 (Internal Server Error) samajh leta — jabki
// "file bahut badi hai" ya "galat file type hai" jaisi galtiyan asal me
// CLIENT ki taraf se hoti hain, 400 (Bad Request) honi chahiye.
//
// Yeh wrapper Express ke normal middleware ki jagah "upload.single(...)"
// ko MANUALLY call karta hai (uski callback ke through), taki hum uska
// error khud intercept karke sahi statusCode ke saath "createHttpError" me
// convert kar sakein, phir wahi wapas "next()" ko de sakein.
const uploadCoverImage = (req: Request, res: Response, next: NextFunction) => {
    const handleSingleUpload = upload.single("coverImage");

    handleSingleUpload(req, res, (error) => {
        if (!error) {
            // Koi error nahi — matlab file (agar bheji gayi thi) safaltapoorvak
            // parse ho gayi, `req.file` set ho chuka hai. Aage badho.
            return next();
        }

        if (error instanceof multer.MulterError) {
            // Multer ki apni known errors — jaise "LIMIT_FILE_SIZE" (file
            // bahut badi thi). Inka "message" already client-friendly hota
            // hai, bas statusCode 400 attach karke bhej rahe hain.
            return next(createHttpError(400, error.message));
        }

        // Koi aur error — jaise humare "fileFilter" se aaya "createHttpError"
        // (galat file type). Woh already ek proper HttpError hai, isliye
        // usse jaisa-hai-waisa hi aage forward kar dete hain.
        return next(error);
    });
};

export default uploadCoverImage;
