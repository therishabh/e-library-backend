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
    addedBy: mongoose.Types.ObjectId;
}
