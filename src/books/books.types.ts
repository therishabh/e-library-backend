import mongoose from "mongoose";

// Book document ki shape. "addedBy" us user ki id store karta hai jisne
// yeh book add ki thi — isse hum baad me update/delete ke waqt check kar
// sakte hain ki request bhejne wala user wahi hai jisne book add ki thi
// (books.controller.ts ke updateBook/deleteBook dekho).
export interface Book {
    title: string;
    author: string;
    description?: string | undefined;
    genre?: string | undefined;
    isbn?: string | undefined;
    publishedYear?: number | undefined;
    // Yaha actual image FILE store nahi kar rahe — sirf uska URL (string)
    // store karte hain. Image khud kisi image-hosting service (Cloudinary,
    // S3, ya koi bhi CDN) par upload hoti hai, aur wahi service jo URL
    // deta hai, wo humein bhej diya jata hai.
    coverImage?: string | undefined;
    addedBy: mongoose.Types.ObjectId;
}
