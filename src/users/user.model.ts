import mongoose from "mongoose";

// User document ki shape — TypeScript ko pata rahe ki ek User object me
// kya-kya fields hongi (id apne aap Mongoose se milta hai, isliye separate
// nahi likha).
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

const userSchema = new mongoose.Schema<User>(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
            unique: true, // DB level par duplicate email allow nahi karega
        },
        password: {
            type: String,
            required: true,
            // Yaha hamesha PLAIN password nahi, HASHED password store hoga —
            // hashing controller me (bcrypt se) register ke time hoti hai.
        },
        resetPasswordToken: {
            type: String,
            required: false,
        },
        resetPasswordExpires: {
            type: Date,
            required: false,
        },
    },
    {
        // createdAt/updatedAt fields automatically add ho jayengi.
        timestamps: true,
    },
);

// Mongoose model create kar rahe hain — isse hum DB me CRUD operations kar sakte hain.
// "User" model ka naam singular form me diya hai (Mongoose automatically pluralize karke "users" collection me store karega).
// TypeScript ko bhi pata rahe ki "userModel" ek Mongoose model hai jo "User" interface ke shape ka document handle karega.
// agar hm kisi dusare name se apna document banana chahte hai to third argument me collection ka name de sakte hai jaise "authors" ya "registeredUsers" etc.
export default mongoose.model<User>("User", userSchema);
