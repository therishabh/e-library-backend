# e-library-backend

E-Library ka backend — Node.js + Express + TypeScript + MongoDB (Mongoose) se bana hai. Neeche wahi steps hain jo is project ko banane mein commit-by-commit follow kiye gaye hain.

## Tech Stack

- **Node.js + TypeScript** — `tsx` se dev mein direct `.ts` files run hoti hain (koi separate build step nahi chahiye dev ke liye).
- **Express 5** — HTTP server aur routing ke liye.
- **MongoDB + Mongoose** — database aur ODM.
- **bcrypt** — password hashing.
- **jsonwebtoken (JWT)** — login ke baad auth token issue karne ke liye.
- **Passport.js (`passport-local`)** — login ke waqt email/password verify karne ke liye ek standardized strategy-based approach.
- **multer** — book cover images ka actual file upload handle karne ke liye.
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

### 8. User module — profile, password change, forgot/reset password, account delete
- `src/middlewares/authenticate.ts` — naya middleware jo `Authorization: Bearer <token>` header se JWT verify karta hai aur valid hone par `req.userId` set kar deta hai. Har "current logged-in user" wale route ke aage yehi middleware lagta hai.
- `src/types/express.d.ts` — Express ke `Request` type ko augment kiya taki TypeScript ko `req.userId` ka pata rahe (ambient module declaration merging).
- `src/users/user.model.ts` mein `resetPasswordToken` aur `resetPasswordExpires` (dono optional) fields add kiye — forgot-password flow ke liye.
- `src/users/users.controller.ts` mein naye controllers add kiye:
  - `getMe` — logged-in user ki profile return karta hai (`req.userId` se, password field query level pe hi exclude karke).
  - `updateMe` — name/email update karta hai (dono optional), email change karne par duplicate-email check bhi karta hai (khud ko exclude karke, `$ne`).
  - `changePassword` — current password verify karke naya password hash karta hai. Sirf JWT token hone se allow nahi karte — current password bhi maangte hain, taki leaked token se koi account "takeover" na kar sake.
  - `forgotPassword` — email se user dhoondta hai, ek random reset token generate karta hai, uska **hash (SHA-256)** DB mein expiry (15 min) ke saath save karta hai. Abhi real email service wire nahi hai, isliye raw token console mein log hota hai (production ke liye TODO). Response hamesha same generic message deta hai — chahe email registered ho ya na ho, taki email enumeration na ho sake.
  - `resetPassword` — raw token ko dobara hash karke DB ke stored hash se match karta hai; match aur unexpired hone par hi naya password set karta hai, aur token ko use ke baad turant clear kar deta hai (replay attack se bachne ke liye).
  - `deleteMe` — logged-in user ka account permanently delete karta hai.
- `src/users/users.validator.ts` mein naye validation rules add kiye: `updateProfileValidationRules`, `changePasswordValidationRules`, `forgotPasswordValidationRules`, `resetPasswordValidationRules`.
- `src/users/users.route.ts` mein naye routes wire kiye — `/me` wale saare routes `authenticate` middleware se protected hain.

### 9. Books module — full CRUD
- `src/books/books.types.ts` — `Book` interface (`title`, `author`, optional `description`/`genre`/`isbn`/`publishedYear`/`coverImage`, aur `addedBy` — jisne book add ki thi uski user id). `coverImage` ek URL (string) hai — ya to koi bahar ki hosted image ka URL, ya humare apne multer upload se generate hua URL (Step 11 dekho).
- `src/books/books.model.ts` — Mongoose schema. `isbn` par `unique: true` ke saath `sparse: true` bhi lagaya hai — isse bina isbn wali kitni bhi books allow rehti hain (sirf jinke paas actual isbn value hai, unhi ke beech duplicate check hota hai). `addedBy` field `User` model ka reference hai (`populate()` se book ke saath uske creator ka naam/email bhi mil jata hai).
- `src/books/books.validator.ts` — create ke liye `title`/`author` required, baaki sab optional; update ke liye sab kuch optional. `bookIdParamValidationRules` route ke `:id` param ko `isMongoId()` se validate karta hai, taki galat-format id par Mongoose ka raw `CastError` (jo 500 ban jata) na aakar clean `400` mile.
- `src/books/books.controller.ts` mein controllers:
  - `createBook` — `addedBy` hamesha `req.userId` se set karta hai, request body se kabhi nahi (warna koi user apne aap ko kisi aur ke naam se book add karwa sakta).
  - `getBooks` / `getBookById` — public routes, login zaroori nahi.
  - `updateBook` / `deleteBook` — ownership-checked: sirf wahi user jisne book add ki thi, usse update/delete kar sakta hai (`403` warna).
- `app.ts` mein `/api/books` prefix pe naya router mount kiya.
- `.env.example` ko actual use ho rahe env vars (`MONGO_URI`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`) ke saath sync kiya — pehle sirf `PORT` tha.

### 10. `coverImage` field books mein add kiya
- `Book` type/schema/validator/controller sabme optional `coverImage` (URL string) field add kiya, taki book ke saath uska cover image bhi save ho sake.

### 11. Multer — actual cover image file upload
- `src/config/multer.ts` — multer ka configuration: `diskStorage` (files `uploads/covers/` folder mein, har file ka naam ek random `crypto.randomUUID()` se generate hota hai taki naam collide na karein), `fileFilter` (sirf JPEG/PNG/WEBP/GIF allow, SVG jaan-boojh kar block kyunki usme script chal sakti hai), aur `limits.fileSize` (5 MB cap, DoS se bachne ke liye).
- `src/middlewares/uploadCoverImage.ts` — `upload.single("coverImage")` ko wrap karta hai taki multer ki apni `MulterError` (jaise file-size-limit) ko humare consistent `createHttpError`-based `400` response mein convert kar sake, warna wo `statusCode` na hone ki wajah se galti se `500` ban jati.
- `src/books/books.controller.ts` mein `resolveCoverImage()` helper add kiya — agar client ne actual file upload ki hai (`req.file`), to uska public URL khud construct karta hai; warna client ke bheje hue `coverImage` URL string ko as-is use karta hai. Dono tareeke (file upload ya direct URL) supported hain.
- `src/app.ts` mein `express.static` se `/uploads` folder ko publicly serve kiya, taki generated cover image URLs browser mein directly khul sakein.
- `src/books/books.route.ts` mein `POST`/`PATCH` books routes par `uploadCoverImage` middleware add kiya — `authenticate` ke turant baad, validation rules se PEHLE (order zaroori hai: multer hi multipart body ko parse karke `req.body`/`req.file` populate karta hai, uske bina validator ko `req.body` khaali milega).
- `uploads/` folder ko `.gitignore` mein add kiya — yeh runtime-generated data hai, repo mein commit nahi hota.

### 12. Passport.js — "local" strategy se login
- `src/config/passport.ts` — `passport-local` strategy register ki (`usernameField: "email"`). Verify callback wahi logic karta hai jo pehle `loginUser` controller ke andar tha (email se user dhoondna, `bcrypt.compare` se password verify karna), bas ab ek reusable Passport strategy ke andar hai.
- `src/users/user.model.ts` mein `UserDocument` type export kiya (`HydratedDocument<User>`) — Passport ke `req.user` ko sahi type dene ke liye.
- `src/types/express.d.ts` mein `Express.User` interface ko `UserDocument` se extend kiya (declaration merging) — isse `req.user` poore app mein type-safe ban gaya.
- `src/middlewares/authenticateLocal.ts` — `passport.authenticate("local", { session: false }, callback)` ko wrap karta hai. `session: false` isliye kyuki app stateless hai (cookies/sessions use nahi karta, sirf JWT). Custom `callback` isliye diya taki Passport ka default `401` response na aakar, humara consistent `createHttpError`-based JSON error format use ho.
- `src/users/users.controller.ts` ka `loginUser` ab simplify ho gaya — credential-verification logic hata diya (wo ab Passport strategy mein hai), controller sirf `req.user` (jo `authenticateLocal` ne set kiya) se JWT token generate karke bhejta hai.
- `src/users/users.route.ts` mein `POST /login` route mein `authenticateLocal` middleware add kiya (`validateRequest` ke baad, `loginUser` se pehle).
- `src/app.ts` mein `app.use(passport.initialize())` add kiya — Passport ke internal helpers (jaise `req.login`) ke liye zaroori, `passport.session()` NAHI (jo cookie-based sessions ke liye hota, humein nahi chahiye).

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

| Method | Route                          | Auth required | Description              |
|--------|----------------------------------|:---:|---------------------------|
| GET    | `/`                              | ❌ | Welcome message           |
| POST   | `/api/users/register`            | ❌ | Naya user register karta hai, JWT token deta hai |
| POST   | `/api/users/login`               | ❌ | Existing user login karta hai, JWT token deta hai |
| POST   | `/api/users/forgot-password`     | ❌ | Reset token generate karta hai (email/console) |
| POST   | `/api/users/reset-password`      | ❌ | Token ke saath naya password set karta hai |
| GET    | `/api/users/me`                  | ✅ | Logged-in user ki profile deta hai |
| PATCH  | `/api/users/me`                  | ✅ | Logged-in user ka name/email update karta hai |
| PATCH  | `/api/users/me/password`         | ✅ | Logged-in user ka password change karta hai |
| DELETE | `/api/users/me`                  | ✅ | Logged-in user ka account delete karta hai |
| GET    | `/api/books`                     | ❌ | Sabhi books ki list deta hai |
| GET    | `/api/books/:id`                 | ❌ | Ek specific book uski id se deta hai |
| POST   | `/api/books`                     | ✅ | Naya book add karta hai (`addedBy` = logged-in user) |
| PATCH  | `/api/books/:id`                 | ✅ | Book update karta hai (sirf jisne add ki thi) |
| DELETE | `/api/books/:id`                 | ✅ | Book delete karta hai (sirf jisne add ki thi) |

`✅` wale routes ke liye `Authorization: Bearer <token>` header bhejna zaroori hai (login/register se mila token). Books ke PATCH/DELETE mein login ke alawa yeh bhi zaroori hai ki request bhejne wala wahi user ho jisne wo book add ki thi.
