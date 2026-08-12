import { body, param } from "express-validator";

// "param('id').isMongoId()" — route ke ":id" segment ko controller tak
// pahunchne se pehle hi validate kar dete hain ki yeh ek valid Mongo
// ObjectId format ka string hai. Isके bina, agar koi random string (jaise
// "/api/books/abc") bheje, to Mongoose khud CastError throw karta jo ek
// generic 500 ban jata — is validator se aisi requests ko clean 400 milta
// hai.
export const bookIdParamValidationRules = [param("id").isMongoId().withMessage("Invalid book id.")];

export const createBookValidationRules = [
    body("title").trim().notEmpty().withMessage("Title is required.").isLength({ min: 1 }).withMessage("Title cannot be empty."),

    body("author").trim().notEmpty().withMessage("Author is required."),

    body("description").optional().trim().isLength({ max: 2000 }).withMessage("Description must be at most 2000 characters long."),

    body("genre").optional().trim(),

    body("isbn").optional().trim().isISBN().withMessage("Please provide a valid ISBN."),

    body("publishedYear")
        .optional()
        .isInt({ min: 1000, max: new Date().getFullYear() })
        .withMessage(`Published year must be between 1000 and ${new Date().getFullYear()}.`),
];

// PATCH ke liye sab fields optional hain — jo bheja gaya hai sirf wahi
// update hoga (controller me dekho).
export const updateBookValidationRules = [
    body("title").optional().trim().notEmpty().withMessage("Title cannot be empty."),

    body("author").optional().trim().notEmpty().withMessage("Author cannot be empty."),

    body("description").optional().trim().isLength({ max: 2000 }).withMessage("Description must be at most 2000 characters long."),

    body("genre").optional().trim(),

    body("isbn").optional().trim().isISBN().withMessage("Please provide a valid ISBN."),

    body("publishedYear")
        .optional()
        .isInt({ min: 1000, max: new Date().getFullYear() })
        .withMessage(`Published year must be between 1000 and ${new Date().getFullYear()}.`),
];
