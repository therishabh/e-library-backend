// Yeh "import" statement kisi value/function ko use karne ke liye NAHI hai
// — sirf isliye hai taki TypeScript is file ko ek "module" maane, script
// nahi. Agar yeh line hata di jaye, to file "script" ban jayegi aur uske
// andar likha "declare global" apna scope-merging sahi tarike se nahi kar
// payega.
//
// WHY isko kahi bhi "import { ... } from './express'" karke use nahi kiya
// gaya: Is file mein koi normal export (interface/type/function) nahi hai
// jise import kiya ja sake — yeh sirf Express ke already-existing "Request"
// interface ko "declare global { namespace Express { ... } }" ke through
// AUGMENT (extend) kar rahi hai. TypeScript ki "declaration merging"
// feature ki wajah se, sirf project ke compile-scope mein file ka hona hi
// kaafi hota hai — jaise hi TypeScript is file ko "dekhta" hai (kyunki
// tsconfig.json mein koi "include" restriction nahi hai, sabhi .ts/.d.ts
// files by default scope mein aati hain), yeh global augmentation apne aap
// poore project mein har jagah `Request` type par apply ho jaati hai.
// Isliye har controller/middleware mein `req.userId` bina kisi import ke
// hi type-safe tarike se available hai.
import "express";

// "authenticate" middleware JWT verify karne ke baad user ki id yahi
// property par attach karta hai, taki protected route handlers (jaise
// getMe/updateMe) seedha `req.userId` use kar sakein, bina dobara token
// decode kiye.
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}
