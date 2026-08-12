import mongoose from "mongoose";

// User document ki shape — TypeScript ko pata rahe ki ek User object me
// kya-kya fields hongi (id apne aap Mongoose se milta hai, isliye separate
// nahi likha).
export interface User {
    name: string;
    email: string;
    password: string;
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
