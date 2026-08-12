// User document ki shape — TypeScript ko pata rahe ki ek User object me
// kya-kya fields hongi (id apne aap Mongoose se milta hai, isliye separate
// nahi likha).
//
// WHY isse "user.model.ts" se alag file me rakha: Yeh sirf ek "shape"
// (type) hai, koi runtime logic nahi — isse alag rakhne se jis bhi file ko
// sirf "User ka shape kya hai" jaanna hai (jaise controllers, future
// services, DTOs), use poora mongoose model (aur uske saath aane wala DB
// connection/side-effects wala code) import nahi karna padta, sirf yeh
// halka-sa types file import karni padti hai.
export interface User {
    name: string;
    email: string;
    password: string;
    // "forgot password" flow ke liye — hamesha HASHED token store karte hain
    // (raw token sirf email me jata hai), taki DB leak hone par bhi koi
    // active reset token use na kar sake. Dono fields optional hain kyuki
    // zyadatar users ke liye yeh kabhi set hi nahi hongi.
    // "| undefined" explicitly likha hai (sirf "?" kaafi nahi) kyuki
    // tsconfig me "exactOptionalPropertyTypes" on hai — reset flow complete
    // hone ke baad hum yeh fields explicitly `undefined` set karke clear
    // karte hain (dekho resetPassword controller), aur us assignment ko
    // valid banane ke liye type me `| undefined` hona zaroori hai.
    resetPasswordToken?: string | undefined;
    resetPasswordExpires?: Date | undefined;
}
