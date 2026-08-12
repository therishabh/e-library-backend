import { Request, Response, NextFunction } from "express";
import createHttpError from "http-errors";
import bookModel from "./books.model";

/**
 * POST /api/books
 *
 * WHAT: Naya book create karta hai. "authenticate" middleware pehle hi
 * chal chuka hota hai, isliye `req.userId` available hai — usi ko
 * "addedBy" ke roop me save karte hain. Yeh field client se kabhi accept
 * nahi karte (body se nahi leta), warna koi user apne aap ko kisi aur
 * banda ke naam se book add karwa sakta tha.
 */
const createBook = async (req: Request, res: Response, next: NextFunction) => {
    const { title, author, description, genre, isbn, publishedYear, coverImage } = req.body;

    // "authenticate" middleware isse pehle hi chal chuka hota hai, isliye
    // yeh practically hamesha set hota hai. TypeScript ke liye `req.userId`
    // ka type "string | undefined" hai (Express ke Request type ko humne
    // optional field se augment kiya tha), isliye yaha explicit check
    // likhna padta hai — warna neeche "addedBy: req.userId" par TS error
    // aayega ("undefined" DB me ObjectId ke jagah save nahi ho sakta).
    if (!req.userId) {
        return next(createHttpError(401, "Authentication required."));
    }

    try {
        const book = await bookModel.create({
            title,
            author,
            description,
            genre,
            isbn,
            publishedYear,
            coverImage,
            addedBy: req.userId,
        });

        return res.status(201).json({
            message: "Book created successfully.",
            book,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/books
 *
 * WHAT: Sabhi books ki list return karta hai — public route hai, login
 * zaroori nahi. "populate" se "addedBy" ki jagah sirf uski id ke bajaye
 * uska name/email bhi saath me mil jata hai, bina alag se query kiye.
 */
const getBooks = async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const books = await bookModel.find().populate("addedBy", "name email").sort({ createdAt: -1 });

        return res.status(200).json({ books });
    } catch (error) {
        return next(error);
    }
};

/**
 * GET /api/books/:id
 *
 * WHAT: Ek specific book uski id se return karta hai — yeh bhi public hai.
 */
const getBookById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const book = await bookModel.findById(req.params.id).populate("addedBy", "name email");
        if (!book) {
            return next(createHttpError(404, "Book not found."));
        }

        return res.status(200).json({ book });
    } catch (error) {
        return next(error);
    }
};

/**
 * PATCH /api/books/:id
 *
 * WHAT: Book ke fields update karta hai — sirf wahi field update hote hain
 * jo request body me bheje gaye hon.
 *
 * WHY ownership check: Sirf wahi user jisne book add ki thi (`addedBy`)
 * usse update kar sake — warna koi bhi logged-in user kisi bhi doosre ki
 * daali hui book edit kar deta.
 */
const updateBook = async (req: Request, res: Response, next: NextFunction) => {
    const { title, author, description, genre, isbn, publishedYear, coverImage } = req.body;

    if (!req.userId) {
        return next(createHttpError(401, "Authentication required."));
    }

    try {
        const book = await bookModel.findById(req.params.id);
        if (!book) {
            return next(createHttpError(404, "Book not found."));
        }

        if (book.addedBy.toString() !== req.userId) {
            return next(createHttpError(403, "You are not allowed to update this book."));
        }

        if (title !== undefined) book.title = title;
        if (author !== undefined) book.author = author;
        if (description !== undefined) book.description = description;
        if (genre !== undefined) book.genre = genre;
        if (isbn !== undefined) book.isbn = isbn;
        if (publishedYear !== undefined) book.publishedYear = publishedYear;
        if (coverImage !== undefined) book.coverImage = coverImage;

        await book.save();

        return res.status(200).json({
            message: "Book updated successfully.",
            book,
        });
    } catch (error) {
        return next(error);
    }
};

/**
 * DELETE /api/books/:id
 *
 * WHAT: Book ko delete karta hai — bilkul updateBook jaisa hi ownership
 * check lagta hai, sirf book add karne wala hi usse delete kar sakta hai.
 */
const deleteBook = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId) {
        return next(createHttpError(401, "Authentication required."));
    }

    try {
        const book = await bookModel.findById(req.params.id);
        if (!book) {
            return next(createHttpError(404, "Book not found."));
        }

        if (book.addedBy.toString() !== req.userId) {
            return next(createHttpError(403, "You are not allowed to delete this book."));
        }

        await book.deleteOne();

        return res.status(200).json({ message: "Book deleted successfully." });
    } catch (error) {
        return next(error);
    }
};

export { createBook, getBooks, getBookById, updateBook, deleteBook };
