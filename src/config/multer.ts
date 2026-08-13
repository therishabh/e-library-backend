import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer, { FileFilterCallback } from "multer";
import { Request } from "express";
import createHttpError from "http-errors";

// ============================================================================
// MULTER SETUP — book cover image upload
// ============================================================================
//
// WHAT IS MULTER: Express khud multipart/form-data (jisme text fields ke
// saath files bhi hoti hain) parse nahi kar sakta — "express.json()" sirf
// JSON body parse karta hai. Multer ek middleware hai jo specifically
// multipart/form-data requests ko parse karta hai: text fields ko
// `req.body` me daalta hai (jaise humesha se ho raha hai), aur uploaded
// file(s) ko `req.file` (single file ke liye) ya `req.files` (multiple ke
// liye) me daal deta hai.
//
// Multer 3 cheezein configure karne deta hai — teeno neeche define ki hain:
//   1. storage    — file DISK par KAHAN aur KIS NAAM se save hogi.
//   2. fileFilter — kaunsi files ACCEPT karni hain, kaunsi REJECT.
//   3. limits     — file kitni badi ho sakti hai (DoS se bachne ke liye).

// Jahan uploaded cover images save hongi. "process.cwd()" project ka root
// folder deta hai (jahan se `npm run dev` chalaya jata hai) — isse path
// hamesha sahi banega, chahe hum is file ko kahi se bhi run karein.
const UPLOAD_DIR = path.join(process.cwd(), "uploads", "covers");

// Agar yeh folder pehle se exist nahi karta, to disk storage file save
// karte waqt fail ho jayega ("ENOENT: no such file or directory"). Isliye
// server start hote hi (jab yeh file pehli baar import hoti hai) folder
// bana dete hain. "recursive: true" isliye taki agar "uploads" folder bhi
// exist na kare, to wo bhi khud-ba-khud ban jaye.
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// ---- 1. STORAGE ENGINE ----
// "diskStorage" ka matlab hai file server ke local disk par save hogi
// (bade production apps me isके bajaye S3/Cloudinary jaisi cloud storage
// use hoti hai, lekin logic same rehta hai — bas "storage" engine badalta
// hai, baaki poora multer setup waisa hi rehta hai).
const storage = multer.diskStorage({
    // "destination" decide karta hai file kis folder me jayegi.
    destination: (_req, _file, callback) => {
        callback(null, UPLOAD_DIR);
    },
    // "filename" decide karta hai file ka naam kya hoga. Agar hum
    // "file.originalname" (jaise user ne apni file ka naam rakha tha)
    // seedha use karein, to do users agar "photo.jpg" naam ki file upload
    // karein, to dusri wali pehli ko OVERWRITE kar degi. Isliye har file
    // ko ek random unique naam dete hain ("crypto.randomUUID()"), aur
    // sirf original extension (".jpg", ".png", etc.) preserve karte hain.
    filename: (_req, file, callback) => {
        const uniqueSuffix = crypto.randomUUID();
        const extension = path.extname(file.originalname);
        callback(null, `${uniqueSuffix}${extension}`);
    },
});

// Yeh sirf image formats ki whitelist hai jo hum accept karna chahte hain.
// Note: "image/svg+xml" (SVG) yaha jaan-boojh kar exclude kiya hai — SVG
// files ke andar `<script>` tags chal sakte hain, isliye SVG upload allow
// karna ek XSS security risk hota hai.
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ---- 2. FILE FILTER ----
// Yeh function har uploaded file ke liye chalta hai, upload complete hone
// SE PEHLE. "callback(error, acceptFile)" ke do parameters hain:
//   - pehla: agar kuch galat hai to Error object (hum "createHttpError" use
//     kar rahe hain, kyuki "HttpError" bhi ek normal "Error" hi hai, aur
//     usme "statusCode" property bhi hoti hai — humara "globalErrorHandler"
//     ise automatically 400 ke roop me handle kar lega, koi extra code
//     nahi likhna padega).
//   - doosra: boolean — true matlab file accept karo, false matlab reject.
const fileFilter = (_req: Request, file: Express.Multer.File, callback: FileFilterCallback) => {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        callback(createHttpError(400, "Only JPEG, PNG, WEBP, or GIF images are allowed."));
        return;
    }

    callback(null, true);
};

// ---- 3. FINAL MULTER INSTANCE ----
// "limits.fileSize" bytes me hota hai — 5 * 1024 * 1024 = 5 MB. Isके bina
// koi bhi user ek 2 GB ki file upload karke server ki disk/memory bhar
// sakta tha (ek simple DoS attack). Agar limit cross ho jaye, multer khud
// ek "MulterError" (code: "LIMIT_FILE_SIZE") throw karta hai — usse hum
// "uploadCoverImage" middleware (dekho src/middlewares/uploadCoverImage.ts)
// me pakad kar ek proper 400 response me convert karte hain.
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 8 * 1024 * 1024, // 8 MB
    },
});

export default upload;
