# e-library-backend

E-Library ka backend — Node.js + Express + TypeScript + MongoDB (Mongoose) se bana hai. Neeche wahi steps hain jo is project ko banane mein commit-by-commit follow kiye gaye hain.

## Tech Stack

- **Node.js + TypeScript** — `tsx` se dev mein direct `.ts` files run hoti hain (koi separate build step nahi chahiye dev ke liye).
- **Express 5** — HTTP server aur routing ke liye.
- **MongoDB + Mongoose** — database aur ODM.
- **bcrypt** — password hashing.
- **jsonwebtoken (JWT)** — login ke baad auth token issue karne ke liye.
- **express-validator** — request body validation.
- **http-errors** — consistent HTTP errors banane ke liye (`createHttpError(404, "message")`).
- **dotenv** — `.env` file se environment variables load karne ke liye.
- **ESLint + Prettier** — linting aur code formatting.

## Steps jo follow kiye (commit sequence ke hisaab se)

### 1. Project setup
- `package.json`, `tsconfig.json` bana kar TypeScript project initialize kiya.
- `.gitignore` add kiya (`node_modules`, `.env`, `dist`, logs waghera commit na ho).

### 2. Basic Express server
- `server.ts` (entry point) aur `src/app.ts` (Express app) alag-alag rakhe — taki app aur server-start logic separate rahe.
- Ek starting route `GET /` add kiya jo simple welcome JSON message deta hai.
- `.prettierrc.json` add kiya code formatting consistent rakhne ke liye.
- ESLint config (`eslint.config.mjs`) add kiya.

### 3. Environment variables (dotenv)
- `dotenv` install karke `src/config/config.ts` banaya — sabhi env variables (PORT, NODE_ENV, etc.) ek hi jagah se read hote hain, taki `process.env.X` pura codebase mein bikhra na ho.
- `.env.example` add kiya taki pata chale kaunse env variables chahiye, bina actual secrets commit kiye.
- `server.ts` ko update kiya taki `config.port` se server start ho, hardcoded port se nahi.

### 4. MongoDB connection (Mongoose)
- `src/config/db.ts` banaya — `connectDB()` function jo Mongoose se MongoDB se connect karta hai.
- Connection ke error/disconnected/reconnected/connected events pe proper logging add ki, aur disconnect hone pe auto-reconnect try karta hai.
- `config.ts` mein `databaseURL` (from `MONGO_URI`) add kiya.
- `server.ts` mein server start hone se pehle `await connectDB()` call kiya — matlab DB connect hue bina server request handle nahi karega.

### 5. Global Error Handler middleware
- `src/middlewares/globalErrorHandler.ts` banaya — Express ka special 4-argument `(err, req, res, next)` wala error-handling middleware.
- Isse pura app ek hi consistent JSON error format return karta hai (`error`, `message`, `statusCode`, aur dev mode mein `errorStack`), Express ke default HTML error page ke bajaye.
- `res.headersSent` ka guard add kiya taki response already bhej diya gaya ho to dobara bhejne ki koshish na ho (crash se bachne ke liye).
- Isse `app.ts` mein sabse LAST middleware ke roop mein register kiya (sabhi routes ke baad).

### 6. User Register/Login (Auth) — bcrypt + JWT + express-validator
- `src/users/user.model.ts` — Mongoose schema/model banaya (`name`, `email` unique, `password`).
- `src/users/users.controller.ts` — do controllers likhe:
  - `registerUser` — duplicate email check karta hai, password ko **bcrypt** se hash karta hai (10 salt rounds), user ko DB mein save karta hai, aur ek **JWT token** generate karke response mein bhejta hai.
  - `loginUser` — email se user dhoondta hai, `bcrypt.compare` se password verify karta hai, match hone par naya JWT token deta hai. Security ke liye "user not found" aur "wrong password" dono ka same generic error message rakha (`"Invalid email or password."`) — taki email enumeration attack na ho sake.
- `src/users/users.validator.ts` — **express-validator** se register/login ke liye validation rules (name/email/password required, email format valid, password min length + strength check).
- `src/middlewares/validateRequest.ts` — generic middleware jo validation rules ke errors collect karke ek single `400` response bhejta hai (field-wise `details` ke saath).
- `src/users/users.route.ts` — route define kiye: `POST /register` aur `POST /login`, jisme pehle validation rules, phir `validateRequest`, phir controller chalta hai.
- `app.ts` mein `express.json()` middleware add kiya (isके bina `req.body` hamesha `undefined` aata), aur user routes ko `/api/users` prefix pe mount kiya.
- `config.ts` mein `jwtSecret` aur `jwtExpiresIn` add kiye.

### 7. Fixes & hardening
- `config.ts` mein `requireEnv()` helper add kiya — agar `MONGO_URI` ya `JWT_SECRET` env mein set nahi hai, to app **startup pe hi turant fail** ho jata hai (baad mein request ke time silently fail hone ke bajaye).
- `db.ts` mein ab zaroorat nahi rahi `as string` type-cast lagane ki, kyuki `config.databaseURL` guaranteed string hai.
- `app.ts` mein ek catch-all 404 handler add kiya — jo bhi route match na ho, uske liye bhi consistent JSON error (`404 Route not found`) milta hai, Express ke default HTML 404 page ke bajaye.
- `users.validator.ts` mein password strength wali regex ka bug fix kiya — pehle wali regex (`/[A-Z][a-z][0-9]/`) sirf tabhi pass hoti thi jab uppercase-lowercase-digit **ek ke baad ek continuous sequence** mein ho. Ab lookahead-based regex use ki hai jo check karti hai ki teeno cheezein (uppercase, lowercase, digit) password mein **kahin bhi, kisi bhi order mein** hon.

## Environment Variables

`.env` file mein yeh variables chahiye (`.env.example` dekho):

```
PORT=8080
MONGO_URI=<your-mongodb-connection-string>
NODE_ENV=development
JWT_SECRET=<a-long-random-secret>
JWT_EXPIRES_IN=7d
```

## Available Scripts

```bash
npm run dev   # tsx watch mode se dev server start karta hai
```

## API Endpoints (abhi tak)

| Method | Route                | Description              |
|--------|-----------------------|---------------------------|
| GET    | `/`                    | Welcome message           |
| POST   | `/api/users/register`  | Naya user register karta hai, JWT token deta hai |
| POST   | `/api/users/login`     | Existing user login karta hai, JWT token deta hai |
