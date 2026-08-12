import mongoose from "mongoose";
import { Book } from "./books.types";

const bookSchema = new mongoose.Schema<Book>(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        author: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: false,
            trim: true,
        },
        genre: {
            type: String,
            required: false,
            trim: true,
        },
        isbn: {
            type: String,
            required: false,
            trim: true,
            // "unique: true" MongoDB ko batata hai: is field ki value kisi
            // bhi do documents mein SAME nahi honi chahiye (yaha ek DB-level
            // index bhi ban jata hai, jo humein khud se duplicate-check
            // query likhne se bachata hai).
            //
            // PROBLEM: "isbn" optional field hai (required: false). Jab
            // koi document "isbn" bhejta hi nahi, MongoDB use internally
            // "isbn: null" jaisa treat karta hai (missing field ≈ null,
            // indexing ke nazariye se). Ab agar "sparse: true" na ho:
            //
            //   Book.create({ title: "Book A" })   // OK — isbn missing → null
            //   Book.create({ title: "Book B" })   // ❌ FAILS!
            //
            // Book B bhi fail ho jayegi, kyunki wo bhi "isbn: null" ban
            // gayi, aur unique index dono null values ko "same" maan kar
            // duplicate-key error de dega — jabki humne to kabhi isbn diya
            // hi nahi tha in dono books mein, wo genuinely duplicate nahi
            // hain.
            //
            // FIX: "sparse: true" MongoDB ko bolta hai — "jin documents
            // mein yeh field EXIST hi nahi karti, unhe is unique index se
            // bahar rakho." Matlab jitni bhi books bina isbn ke hain, unhe
            // uniqueness check touch hi nahi karega:
            //
            //   Book.create({ title: "Book A" })                     // OK — isbn missing, index se skip
            //   Book.create({ title: "Book B" })                     // OK — yeh bhi skip, koi conflict nahi
            //   Book.create({ title: "Book C", isbn: "978-0-13" })   // OK — pehli baar yeh isbn use hua
            //   Book.create({ title: "Book D", isbn: "978-0-13" })   // ❌ FAILS — yeh sahi hai, same isbn dobara nahi chal sakta
            unique: true,
            sparse: true,
        },
        publishedYear: {
            type: Number,
            required: false,
        },
        addedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model<Book>("Book", bookSchema);
