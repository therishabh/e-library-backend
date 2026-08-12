import express from "express";
import { createBook, getBooks, getBookById, updateBook, deleteBook } from "./books.controller";
import { createBookValidationRules, updateBookValidationRules, bookIdParamValidationRules } from "./books.validator";
import validateRequest from "../middlewares/validateRequest";
import authenticate from "../middlewares/authenticate";

const bookRouter = express.Router();

// List/get ek public catalog hai — login zaroori nahi. Create/update/
// delete "authenticate" se protected hain, aur update/delete par ownership
// bhi check hoti hai (controller me — sirf wahi user jisne book add ki
// thi usse edit/delete kar sake).
bookRouter.get("/", getBooks);
bookRouter.get("/:id", bookIdParamValidationRules, validateRequest, getBookById);

bookRouter.post("/", authenticate, createBookValidationRules, validateRequest, createBook);
bookRouter.patch("/:id", authenticate, bookIdParamValidationRules, updateBookValidationRules, validateRequest, updateBook);
bookRouter.delete("/:id", authenticate, bookIdParamValidationRules, validateRequest, deleteBook);

export default bookRouter;
