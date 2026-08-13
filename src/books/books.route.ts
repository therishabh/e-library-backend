import express from "express";
import { createBook, getBooks, getBookById, updateBook, deleteBook } from "./books.controller";
import { createBookValidationRules, updateBookValidationRules, bookIdParamValidationRules } from "./books.validator";
import validateRequest from "../middlewares/validateRequest";
import authenticate from "../middlewares/authenticate";
import uploadCoverImage from "../middlewares/uploadCoverImage";

const bookRouter = express.Router();

// List/get ek public catalog hai — login zaroori nahi. Create/update/
// delete "authenticate" se protected hain, aur update/delete par ownership
// bhi check hoti hai (controller me — sirf wahi user jisne book add ki
// thi usse edit/delete kar sake).
bookRouter.get("/", getBooks);
bookRouter.get("/:id", bookIdParamValidationRules, validateRequest, getBookById);

// MIDDLEWARE ORDER YAHA IMPORTANT HAI:
//   authenticate       -> pehle confirm karo user logged-in hai.
//   uploadCoverImage    -> multipart/form-data parse karo (yeh req.body ke
//                          text fields aur req.file dono ko populate karta
//                          hai) — express-validator ke rules ko chalne se
//                          PEHLE yeh ho jana chahiye, warna req.body abhi
//                          empty hoga (multer se pehle Express multipart
//                          body ko parse hi nahi kar sakta).
//   validation rules    -> ab req.body populated hai, isliye field checks
//                          (title/author/etc.) sahi se chal sakte hain.
//   validateRequest     -> upar wali rules ke errors collect karke 400 dena.
bookRouter.post("/", authenticate, uploadCoverImage, createBookValidationRules, validateRequest, createBook);
bookRouter.patch(
    "/:id",
    authenticate,
    uploadCoverImage,
    bookIdParamValidationRules,
    updateBookValidationRules,
    validateRequest,
    updateBook,
);
bookRouter.delete("/:id", authenticate, bookIdParamValidationRules, validateRequest, deleteBook);

export default bookRouter;
