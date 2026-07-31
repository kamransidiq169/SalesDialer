# SalesDialer — Complete Technical Documentation

> **Project:** Mini Sales Dialer CRM
> **Type:** Full-stack monorepo (Node.js/Express + React/Vite)
> **Database:** SQLite (file-based, via Sequelize ORM)
> **Purpose:** Internal sales tool for managing contacts, making/triaging calls, capturing notes with mock AI summaries, and tracking activity via a dashboard.
> **Repository layout:** `~/sales-dialer/` → `/backend` (REST API + WebSocket) + `/frontend` (SPA)

---

## 1. PROJECT OVERVIEW

SalesDialer is a single-tenant, role-aware CRM/dialer for sales agents. The product surface covers:

- **Authentication** — JWT (Bearer) login, 7-day token expiry, hashed passwords (bcryptjs).
- **Contact management** — CRUD, search, status filters, CSV bulk import.
- **Sales dialer workflow** — start → calling → connected → ended state machine (UI only; backend just records the row).
- **Call logging** — list with pagination/filter/sort; per-call notes with mock AI summary + sentiment.
- **Dashboard** — totals, breakdown by status, calls-today, 7-day activity, conversion rate, recent calls.
- **Admin** — system stats and user list (admin role only).
- **WebSocket** — `/ws` channel with handshake/`ping`/`subscribe` (defined but not consumed by the frontend).
- **OpenAPI** — Swagger UI served at `/api/docs`.
- **Dark mode** — class-based, persisted to `localStorage`.

### 1.1 Tech stack

| Layer       | Technology                                                                |
|-------------|---------------------------------------------------------------------------|
| Frontend    | React 18, Vite 5, React Router 6, TanStack Query 5, React Hook Form 7, Zod, Axios, Lucide React, Tailwind 3 |
| Backend     | Node.js (CommonJS), Express 4, Sequelize 6, SQLite 5, jsonwebtoken, bcryptjs, helmet, cors, morgan, express-rate-limit, express-validator, multer, csv-parser, ws, winston, swagger-jsdoc, swagger-ui-express |
| Database    | SQLite (file at `backend/database.sqlite`) via Sequelize ORM              |
| Realtime    | `ws` WebSocket server mounted at `/ws`                                    |
| Tooling     | nodemon, jest, supertest, eslint-less (no eslint config)                  |
| Container   | Dockerfiles + docker-compose for both services                            |

### 1.2 Architecture pattern

A classic **layered / service-oriented monolith**:

```
HTTP request
  → Express router (with swagger JSDoc comments)
  → Middleware (helmet, cors, requestId, morgan, rate limiter, body parsing)
  → Auth middleware (JWT) + role gate
  → express-validator chains (via validate.js runner)
  → Service layer (contacts.service.js, calls.service.js, ai.service.js, auth.service.js, dashboard.service.js)
  → Sequelize models
  → SQLite
  ← Response wrapped by ApiResponse helper (success/paginated/error)
  ← Centralized errorHandler (ApiError, Sequelize errors, JWT errors, Multer errors, SyntaxError)
```

**Architectural observations:**

- The backend ships **both** thin controllers (e.g. `authController.js`, `callController.js`, `contactController.js`, `dashboardController.js`) **and** a service layer (`*.service.js`). The routes consistently call the **services** (not the controllers) — see `routes/contacts.js:147`, `routes/calls.js:94,130,171,199`, `routes/dashboard.js:50`, `routes/auth.js:58,122`. The legacy controllers in `controllers/` are therefore effectively dead code in the request path; they're kept in the repo for reference.
- A residual `users_backup` table exists in the live DB (a Sequelise `alter:true` artifact from seed runs).
- The frontend uses a hybrid of TanStack Query (server state) + local `useState` (UI state) + React Hook Form + Zod (form state). No global state library beyond `AuthContext`.

---

## 2. FRONTEND ANALYSIS (`/Users/user/sales-dialer/frontend/src/`)

### 2.1 Entry / shell

#### `main.jsx`
- **Purpose:** Mount the React 18 root and load global CSS.
- **Renders:** `<App />` inside `<React.StrictMode>`.
- **Dependencies:** `react`, `react-dom/client`, `./App`, `./index.css`.

#### `App.jsx`
- **Purpose:** Wires the providers and the route tree.
- **State management:** Creates a single `QueryClient` with `refetchOnWindowFocus: false`, `retry: 1`.
- **Components rendered (routes):**
  - `/login` → `<Login />` (public)
  - `/dashboard`, `/contacts`, `/dialer`, `/call-logs` → wrapped in `<ProtectedRoute>`
  - `/` and `*` → `<Navigate to="/dashboard" replace />`
- **Imports:** `BrowserRouter`, `Routes`, `Route`, `Navigate` from `react-router-dom`; `QueryClient`, `QueryClientProvider` from `@tanstack/react-query`; `AuthProvider`; `ProtectedRoute`; the 5 page components.

#### `index.css`
- Tailwind base/components/utilities.
- Custom design tokens via `@layer components`: `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.card`, `.card-glass`, `.card-gradient`, `.input-glow`, `.status-dot-*`, `.pulse-ring`, `.call-pulse`, `.ring-pulse`, `.slide-in`, `.floating-label`, `.skeleton`, `.badge-glow-*`, `.nav-indicator`, `.sidebar-glass`, `.divider-glow`, `.avatar-gradient`, `.success-glow`, `.danger-glow`.
- Utility classes: `.scrollbar-hide`, `.no-scrollbar`, `.bg-blur`, `.text-balance`.

### 2.2 API client

#### `api/axios.js`
- **Purpose:** Single configured `axios` instance.
- **Base URL:** `import.meta.env.VITE_API_URL` falling back to `http://localhost:5001/api`.
- **Request interceptor:** Reads `localStorage.token`; if present, sets `Authorization: Bearer <token>`.
- **Response interceptor:** On any `401`, clears `localStorage` and hard-redirects to `/login` via `window.location.href = '/login'`.
- **Exports:** default `api` instance.
- **Dependencies:** `axios`.

### 2.3 Context (auth)

#### `context/AuthContext.jsx`
- **Purpose:** Auth state container exposing `{ user, token, isAuthenticated, isLoading, login, logout }`.
- **State:**
  - `user` — current user object (or `null`)
  - `token` — JWT (synced with `localStorage.token`)
  - `isAuthenticated` — boolean
  - `isLoading` — true while verifying stored token
- **Effect on mount:** If a token is in localStorage, calls `GET /auth/me` to validate. On failure, clears storage and resets state.
- **`login(email, password)`:** calls `POST /auth/login`, persists token + user, returns the response.
- **`logout()`:** clears storage + state, hard-redirects to `/login`.
- **Exports:** `AuthContext` and the provider component (also re-exports `useAuth` here, but the canonical hook lives in `hooks/useAuth.js`).
- **Dependencies:** `react`, `../api/axios`.

### 2.4 Hooks

#### `hooks/useAuth.js`
- **Purpose:** Thin re-export wrapper around the context — throws if used outside `<AuthProvider>`.
- **Dependencies:** `react`, `../context/AuthContext`.

#### `hooks/useContacts.js`
- **Purpose:** Reusable data hooks for contacts.
- **`useContacts({ page, limit, search, status })`:** TanStack Query against `GET /contacts`, `keepPreviousData: true`.
- **`useContact(id)`:** TanStack Query against `GET /contacts/:id`, `enabled: !!id`.
- **Dependencies:** `@tanstack/react-query`, `../api/axios`.

> Note: hooks for `useCalls`, `useDashboard`, and `useCallNotes` are **not** present — pages call `useQuery` inline.

### 2.5 Components

#### `components/Layout.jsx`
- **Purpose:** Authenticated shell — fixed decorative gradient blobs + `<Sidebar />` + padded `<main>`.
- **Props:** `children`.
- **Dependencies:** `./Sidebar`.

#### `components/Sidebar.jsx`
- **Purpose:** Left navigation. Items: Dashboard, Contacts, Dialer, Call Logs.
- **State:** `isOpen` (mobile drawer), `isDark` (initialized from `localStorage.theme` or system `prefers-color-scheme`).
- **Calls:** None directly. On logout, calls `useAuth().logout()` and `navigate('/login')`.
- **Dependencies:** `react-router-dom`, `lucide-react`, `useAuth`.

#### `components/ProtectedRoute.jsx`
- **Purpose:** Auth gate. Renders `<Spinner size="lg" />` while `isLoading`, otherwise `<Navigate to="/login" state={{ from: location }} replace />` when not authenticated.
- **Props:** `children`.
- **Dependencies:** `react-router-dom`, `useAuth`, `./ui/Spinner`.

#### `components/ui/Button.jsx`
- **Purpose:** Forwarded-ref button with `variant` (primary, secondary, danger, ghost, success), `size` (sm/md/lg/xl), `loading` (renders `Loader2` spinner).
- **Props:** standard button props + `variant`, `size`, `loading`, `className`.
- **Dependencies:** `react`, `lucide-react`.

#### `components/ui/Input.jsx`
- **Purpose:** Floating-label input with prefix/suffix icon, error message, helper text.
- **Props:** `label`, `error`, `helperText`, `prefixIcon`, `suffixIcon`, `className`, plus any input prop. Forwards ref.
- **Dependencies:** `react`.

#### `components/ui/Modal.jsx`
- **Purpose:** Generic modal with backdrop, escape-to-close, scroll lock.
- **Props:** `isOpen`, `onClose`, `title`, `children`, `footer`, `size` (sm/md/lg/xl).
- **Dependencies:** `react`, `lucide-react`.

#### `components/ui/Badge.jsx`
- **Purpose:** Status pill (animated dot + label) for contact & call statuses.
- **Status variants:** `new`, `contacted`, `interested`, `not_interested`, `initiated`, `calling`, `connected`, `ended`, `missed`.
- **Props:** `status`, optional `children` overriding label, `className`.
- **Dependencies:** none beyond React.

#### `components/ui/Spinner.jsx`
- **Purpose:** Pure SVG spinner.
- **Props:** `size` (sm/md/lg), `className`.

#### `components/ui/Pagination.jsx`
- **Purpose:** Numbered pagination with ellipsis, returns `null` if `totalPages <= 1`.
- **Props:** `currentPage`, `totalPages`, `onPageChange`, `className`.
- **Dependencies:** `lucide-react`.

> Empty placeholder dirs exist: `components/contacts/`, `components/dashboard/`, `components/dialer/`, `components/layout/` — currently unused.

### 2.6 Pages

#### `pages/Login.jsx`
- **Renders:** Two-pane layout — branded gradient left panel, form right panel; demo-credentials card.
- **State:** local `error`, `isLoading`.
- **Form:** `react-hook-form` + Zod schema (`email` required + valid; `password` ≥ 6).
- **API calls:** `useAuth().login(email, password)` → `POST /auth/login`. On success, navigates to `location.state.from?.pathname || '/dashboard'` with `replace: true`.
- **Props:** none. **Imports:** `useForm`, `zodResolver`, `z`, `useNavigate`, `useLocation`, `useAuth`, `Input`, `Button`, `Spinner`, lucide icons.

#### `pages/Dashboard.jsx`
- **Renders:** Header, 4 `StatCard`s (Total Contacts, Calls Today, Interested Leads, Not Interested), Recent Calls list, Contact Status breakdown with bars.
- **State:** none (everything from query).
- **API calls:** `GET /dashboard` via `useQuery({ queryKey: ['dashboard'] })`.
- **Dependencies:** `useQuery`, `Link`, `Layout`, `Badge`, `Spinner`, `formatters.formatDateTime`, `formatters.formatDuration`.

#### `pages/Contacts.jsx`
- **Renders:** Header with total count, Add / Import-CSV buttons, search + status filter bar, table (avatar, name, phone, email, company, status, action buttons), pagination, Add/Edit modal, Delete confirm modal, Import modal.
- **State:** `page`, `search`, `debouncedSearch` (300 ms debounce), `statusFilter`, `isModalOpen`, `isDeleteModalOpen`, `isImportModalOpen`, `selectedContact`, `contactToDelete`, `importResult`.
- **Form:** `react-hook-form` + Zod (`name ≥ 2`, `phone` regex, optional email/company/notes, status enum).
- **Mutations:**
  - `POST /contacts` (create)
  - `PUT /contacts/:id` (update)
  - `DELETE /contacts/:id` (delete)
  - `POST /contacts/import` (multipart, `Content-Type: multipart/form-data`)
- **Query:** `GET /contacts?page&limit&search&status` keyed by `['contacts', page, debouncedSearch, statusFilter]`. Invalidates `['contacts']` and `['dashboard']` after mutations.
- **Navigation:** "Call" button → `navigate('/dialer?contactId=' + id)`.
- **Dependencies:** `useState/useEffect/useCallback`, `useQuery/useMutation/useQueryClient`, `useForm`, `zodResolver`, `z`, `useNavigate`, lucide icons, `Layout`, `Input`, `Button`, `Modal`, `Badge`, `Spinner`, `Pagination`.

#### `pages/Dialer.jsx`
- **Renders:** Contact search/select, selected-contact card, animated call interface (idle / calling / connected / ended), end-call button, note form, post-note confirmation card.
- **State machine (UI only):** `IDLE → CALLING → CONNECTED → ENDED`. After 3 s of CALLING, the client flips to CONNECTED on a `setTimeout`.
- **State:** `selectedContactId`, `callState`, `currentCall`, `connectedTime` (local tick counter), `contactSearch`, `showContactDropdown`, `noteSubmitted`, refs for interval + dropdown click-outside.
- **Form:** `useForm()` (no schema) for the note textarea.
- **API calls:**
  - `GET /contacts?limit=100` (contact list, query key `['contacts-list']`)
  - `GET /contacts/:id` (selected contact, query key `['contact', selectedContactId]`)
  - `POST /calls/start` body `{ contactId }`
  - `POST /calls/end` body `{ callId }`
  - `POST /calls/:id/notes` body `{ content }`
- **Dependencies:** `useState/useEffect/useCallback/useRef`, `useQuery/useMutation/useQueryClient`, `useForm`, `useSearchParams`, `useNavigate`, `Layout`, `Badge`, `Button`, `Spinner`, `formatters.formatTime`.

#### `pages/CallLogs.jsx`
- **Renders:** Header, contact filter, sort selector, timeline of call cards (expandable to show notes), pagination.
- **State:** `page`, `contactFilter`, `sortBy` (`'startTime' | 'duration'`), `sortOrder` (`'asc' | 'desc'`), `expandedCall`.
- **API calls:**
  - `GET /contacts?limit=100` (to populate the contact filter dropdown)
  - `GET /calls?page&limit&sortBy&order&contactId` keyed by `['calls', page, contactFilter, sortBy, sortOrder]`
  - `GET /calls/:id/notes` (lazy, when `expandedCall` is set)
- **Dependencies:** `useState`, `useQuery`, `Layout`, `Badge`, `Spinner`, `Pagination`, `formatters.formatDateTime`, `formatters.formatDuration`.

### 2.7 Utils

#### `utils/formatters.js`
- `formatDuration(seconds)` → `"1h 5m 12s" | "5m 30s" | "30s"` or `"0s"`.
- `formatDateTime(dateString)` → `Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })`.
- `formatPhone(phone)` → returns the input as-is (placeholder for future formatting).
- `formatTime(seconds)` → `MM:SS` or `HH:MM:SS` (zero-padded), used by the live call timer.

### 2.8 Build/config

- `vite.config.js` — Vite + React plugin; dev server `http://localhost:5173` with proxy `/api → http://localhost:5001` (note: 5001, the local backend port).
- `tailwind.config.js` — custom palettes `brand` (indigo ramp), `surface` (slate ramp), `accent` (cyan); custom shadows, animations, keyframes; `darkMode: 'class'`.
- `package.json` scripts: `dev`, `build`, `preview`.
- `frontend/index.html` — single root mount point; ships the bundled app via Vite.

---

## 3. BACKEND ANALYSIS (`/Users/user/sales-dialer/backend/src/`)

### 3.1 Server entry

#### `server.js`
- Loads `dotenv`, creates Express app.
- Security: `helmet` (custom CSP for fonts.googleapis + googleapis), `cors` (origin list from `CORS_ORIGIN` env, default `localhost:5173` + `localhost:3000`), body parsers (10 MB), `morgan` logging via Winston stream, request-id middleware.
- Creates `uploads/` dir, serves `/uploads` as static.
- Mounts `apiLimiter` on `/api`, then routes: `/api/health`, `/api/auth`, `/api/contacts`, `/api/calls`, `/api/dashboard`, `/api/admin`.
- Mounts Swagger UI at `/api/docs` and raw spec at `/api/docs.json`.
- Final middlewares: 404 + global error handler.
- Listens on `process.env.PORT || 5000`; attaches `setupWebSocket(server)`.
- Graceful shutdown on `SIGTERM`/`SIGINT`; `uncaughtException` → exit 1; `unhandledRejection` → log.
- `startServer()` → `connectDatabase()` + `sequelize.sync({ force: false })`. Exported for tests.

### 3.2 Config

#### `config/database.js`
- Sequelize instance with `dialect: 'sqlite'`, `storage: process.env.DB_PATH || './database.sqlite'`, `logging: false`.
- `connectDatabase()` calls `sequelize.authenticate()`.

#### `config/logger.js`
- Winston logger with: console (colorized, debug in dev / info in prod), `error.log` (5 MB × 5), `combined.log` (5 MB × 5), `http.log` (3 MB × 3) JSON files.
- `stream` object for Morgan → `logger.http(message.trim())`.
- `asyncLocalStorage` request-id tracking; `addRequestId` middleware stamps `req.requestId` and sets `X-Request-ID` header.

#### `config/swagger.js`
- OpenAPI 3 definition served at `/api/docs`. JSDoc comments in `routes/*.js` provide endpoints.

### 3.3 Middleware

#### `middleware/auth.js`
- `auth` — verifies `Authorization: Bearer <jwt>`, attaches `req.user = { id, email, role }`. Catches `TokenExpiredError` vs other JWT errors separately.
- `optionalAuth` — same as `auth` but does not block.
- `requireRole(...allowedRoles)` — returns a middleware; throws 401/403 ApiError.
- `adminOnly` — pre-bound to `requireRole('admin')`.

#### `middleware/validate.js`
- Generic runner: `await Promise.all(validations.map(v => v.run(req)))`, then `validationResult(req)` → 422 `ApiError.validation(formattedErrors)` on failure.

#### `middleware/rateLimiter.js`
- `authLimiter` — 5 / 15 min (for `/auth/login`).
- `apiLimiter` — 100 / 15 min, key = `req.user?.id || req.ip`.
- `uploadLimiter` — 10 / hour.
- `strictLimiter` — 10 / min.
- Custom `rateLimitHandler` writes `{ success: false, message, retryAfter, timestamp }`.

#### `middleware/errorHandler.js`
- Logs server (5xx, uncaught) at `error` and 4xx at `warn` (skipped in test).
- Branches: `ApiError`, `SequelizeValidationError` (400), `SequelizeUniqueConstraintError` (409), `SequelizeDatabaseError` (400), `JsonWebTokenError` (401), `TokenExpiredError` (401), `MulterError` (400 with code-specific messages), JSON `SyntaxError` (400), CORS (403), fallback 500.
- `notFoundHandler` — 404 with the method + URL.

### 3.4 Models (`models/`)

| Model    | File              | Table      | Columns (Sequelize types)                                                                                                     | Associations (defined in `models/index.js`)                                      |
|----------|-------------------|------------|--------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------|
| `User`   | `User.js`         | `Users`    | `id` UUID PK · `name` STRING NN · `email` STRING UNIQUE NN · `password` STRING NN (bcrypt) · `role` ENUM(`admin`,`agent`) default `agent` · `lastLoginAt` DATE NULL · `createdAt/updatedAt` | `hasMany(Contact, { as: 'contacts', foreignKey: 'userId' })`                    |
| `Contact`| `Contact.js`      | `Contacts` | `id` UUID PK · `userId` UUID NN FK→`Users.id` · `name` STRING NN · `phone` STRING NN · `email` STRING NULL (isEmail) · `company` STRING NULL · `status` ENUM(`new`,`contacted`,`interested`,`not_interested`) default `new` · `notes` TEXT NULL · timestamps | `belongsTo(User, { as: 'user' })` · `hasMany(Call, { as: 'calls' })`             |
| `Call`   | `Call.js`         | `Calls`    | `id` UUID PK · `contactId` UUID NN FK→`Contacts.id` · `userId` UUID NN FK→`Users.id` · `startTime` DATE NULL · `endTime` DATE NULL · `duration` INTEGER NULL (seconds) · `status` ENUM(`initiated`,`calling`,`connected`,`ended`,`missed`) default `initiated` · timestamps | `belongsTo(Contact, { as: 'contact' })` · `belongsTo(User, { as: 'user' })` · `hasMany(CallNote, { as: 'notes' })` |
| `CallNote` | `CallNote.js`   | `CallNotes`| `id` UUID PK · `callId` UUID NN FK→`Calls.id` · `userId` UUID NN FK→`Users.id` · `content` TEXT NN · `aiSummary` TEXT NULL · `sentiment` VARCHAR NULL · timestamps | `belongsTo(Call, { as: 'call' })` · `belongsTo(User, { as: 'user' })`            |

`models/index.js` imports all four, defines the associations, and re-exports `{ sequelize, User, Contact, Call, CallNote }`.

> The `User` model has `beforeCreate` and `beforeUpdate` hooks that bcrypt-hash the password (cost factor 10). `User.prototype.validatePassword` does the `bcrypt.compare`. `User.prototype.toJSON` strips the `password` field.

### 3.5 Validators (`validators/`)

#### `auth.validators.js`
- `loginValidators`: `email` isEmail + normalizeEmail; `password` length ≥ 6.
- `registerValidators`: `name` 2–100, email as above, `password` ≥ 6 + regex (uppercase + lowercase + digit).

#### `contacts.validators.js`
- `createContactValidators`: `name` 2–100 + escape, `phone` matches `^[+]?[\d\s\-().]{7,20}$`, `email` optional + isEmail + normalizeEmail, `company` optional ≤ 100, `status` optional enum.
- `updateContactValidators`: same as create but every field `.optional()`.
- `queryValidators`: `page` ≥ 1 int, `limit` 1–100 int, `search` optional trimmed/escaped ≤ 200, `status` optional enum, `sortBy` enum `['name','createdAt','lastContactedAt','status']`, `order` enum `['ASC','DESC','asc','desc']`.

#### `calls.validators.js`
- `startCallValidators`: `contactId` notEmpty + isUUID.
- `endCallValidators`: `callId` notEmpty + isUUID.
- `noteValidators`: `content` 1–5000 + escape.
- `callQueryValidators`: `page`/`limit` ints, `contactId` optional UUID, `sortBy` enum `['startTime','duration','createdAt','date']`, `order` enum.

### 3.6 Services (`services/`)

#### `services/auth.service.js`
- `AuthService.login(email, password)` — finds user by email, checks `user.isActive === false` → 401 (note: `isActive` is **not** a column on `User`!), calls `user.validatePassword`, updates `lastLoginAt`, signs JWT.
- `AuthService.getMe(userId)` — finds by PK, returns `toJSON()` (no password).
- `AuthService.register(userData)` — uniqueness check, `User.create` (auto-hashes via hook), signs JWT.

#### `services/contacts.service.js`
- `list(userId, params)` — pagination, search across `name/email/company/phone`, status filter, sort.
- `create(userId, data)` — `Contact.create`.
- `findOne(id, userId)` — throws `ApiError.notFound` if missing.
- `update(id, userId, data)` — partial update via field loop.
- `delete(id, userId)` — destroys contact. **Does not cascade to calls/notes** (no DB-level FK cascade configured; will likely leave orphan rows).
- `bulkImport(userId, records)` — per-row validation (name/phone required, phone regex, email regex, status enum), counts `imported` / `skipped`, collects per-row errors.
- `getStaleContacts(userId, days)` — uses `lastContactedAt` (a column referenced in code but **not defined on the `Contact` model**; see Bugs).
- `getStatusBreakdown(userId)` — `GROUP BY status` count, but references `sequelize` without importing it (would throw `sequelize is not defined`).

#### `services/calls.service.js`
- `startCall(userId, contactId)` — verifies contact ownership, creates call with `status: 'calling'`, sets `contact.lastContactedAt = new Date()` (writes only that column — again, **not on the model**), re-fetches call with `Contact` include.
- `endCall(callId, userId)` — finds, rejects if already `ended` (400), computes `duration = floor((endTime - startTime)/1000)`, updates to `ended`.
- `listCalls(userId, params)` — pagination, contact filter, sort, joins `contact` and `notes`. `distinct: true` to avoid the include inflating the count.
- `addNote(callId, userId, noteData)` — verifies call, generates AI summary, sets `sentiment`, creates note, optionally updates `Contact.status` to `noteData.contactStatus`.
- `getNotes(callId, userId)` — verifies call, returns notes.
- `getStats(userId, dateRange)` — counts total/connected/missed and sums duration; uses `Op` but it is **not imported** in this file.

#### `services/dashboard.service.js`
- `getStats(userId)` — runs 9 parallel queries: totalContacts, callsToday, interested/notInterested/new/contacted leads, recentCalls, statusBreakdown, callActivityLast7Days. Computes `contactBreakdown`, `callActivity` (7-day array with zero-fill), `conversionRate = interested / totalLeads * 100`. Uses `Op` from sequelize.
- `processCallActivity(rawData)` — last 7 days with default-zero entries.
- `getTeamStats()` — admin stats; uses `User.count({ where: { isActive: true } })` (the `isActive` column is **not** defined on the model).

#### `services/ai.service.js`
- Mocked AI. Public methods:
  - `generateSummary(content)` — keyword classifier → positive/negative/followup/meeting/generic template (random pick), suffixed with `[AI Generated - <date>]`.
  - `analyzeSentiment(content)` — counts positive vs negative words (with negation pattern handling) → `'positive' | 'neutral' | 'negative'`.
  - `extractTopics(content)` — returns array of topic keys (`pricing`, `features`, `timeline`, `competition`, `implementation`, `demo`).
- Private template helpers return the canned strings.

### 3.7 Controllers (`controllers/`)

> These exist but are **not** wired into the routes. The routes call the services directly.

- `authController.js` — `login`, `logout`, `me` (uses `jsonwebtoken` directly to sign, also `require('dotenv').config()` at top, mixed with the service file).
- `contactController.js` — `getContacts`, `createContact`, `getContact`, `updateContact`, `deleteContact`, `importContacts` (parses CSV with `csv-parser`, calls `Contact.create` per row).
- `callController.js` — `startCall`, `endCall`, `getCalls`, `addNote`, `getNotes`. **Bug:** `getNotes` references `User` without importing it.
- `dashboardController.js` — `getDashboard` returning `{ totalContacts, callsToday, interestedLeads, notInterestedLeads, recentCalls, statusBreakdown }`.

### 3.8 Routes (`routes/`)

#### `routes/auth.js`
- `POST /login` — chain: `authLimiter` → `validate(loginValidators)` → `AuthService.login`. Returns `{ success, message, data: { token, user } }`.
- `POST /logout` — `auth` only, returns success (stateless).
- `GET /me` — `auth` → `AuthService.getMe`.

#### `routes/contacts.js`
- All routes behind `auth`.
- `GET /` — `validate(queryValidators)` → `ContactsService.list` → `ApiResponse.paginated`.
- `POST /` — `validate(createContactValidators)` → `ContactsService.create`.
- `GET /:id` → `ContactsService.findOne`.
- `PUT /:id` — `validate(updateContactValidators)` → `ContactsService.update`.
- `DELETE /:id` → `ContactsService.delete`.
- `POST /import` — `uploadLimiter` → `multer` disk storage (`uploads/`, 5 MB max, CSV mimetype check) → stream-parse with `csv-parser` → `ContactsService.bulkImport` → unlink uploaded file.
- Note: `:id` routes are listed **after** `/import`, so `import` is correctly matched first.

#### `routes/calls.js`
- All routes behind `auth`.
- `GET /` — `validate(callQueryValidators)` → `CallsService.listCalls` → `ApiResponse.paginated`.
- `POST /start` — `validate(startCallValidators)` → `CallsService.startCall`.
- `POST /end` — `validate(endCallValidators)` → `CallsService.endCall`.
- `POST /:id/notes` — `validate(noteValidators)` → `CallsService.addNote`.
- `GET /:id/notes` → `CallsService.getNotes`.

#### `routes/dashboard.js`
- All routes behind `auth`.
- `GET /` → `DashboardService.getStats` → `ApiResponse.success`.

#### `routes/admin.js`
- All routes behind `auth`.
- `GET /stats` — `requireRole('admin')` → returns `{ users, contacts, calls }` counts.
- `GET /users` — `requireRole('admin')` → paginated list (excludes password).
- `DELETE /users/:id` — `requireRole('admin')` → prevents self-deletion, destroys user.

### 3.9 Utils (`utils/`)

- `ApiError.js` — custom error class with static factories `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict`, `validation`, `tooManyRequests`.
- `ApiResponse.js` — `success`, `paginated`, `error` static methods. `paginated` builds `{ total, page, limit, totalPages, hasNext, hasPrev }`.
- `pagination.js` — `buildPaginationMeta`, `calculateOffset`, `sanitizePaginationParams({ page, limit }, defaults)` (clamps `limit ≤ 100`).

### 3.10 Seeders (`seeders/`)

#### `seeders/seed.js`
- Runs `sequelize.sync({ alter: true })` (creates a `Users_backup` table — see Bugs).
- Idempotent: if `demo@dialer.com` exists, exits early.
- Creates 1 demo user (`Demo Agent`, `password123`, `agent`), 15 contacts (mix of statuses), 10 calls, 10 call notes (with hand-written `aiSummary`).
- `npm run seed`.

### 3.11 WebSocket (`websocket.js`)

- `setupWebSocket(server)` mounts a `ws` server at `/ws`.
- Per-connection: assigns `clientId`, tracks in a `Map`, sends `{ type: 'connected', clientId, timestamp }`.
- Message handlers: `auth` (stores `userId`), `ping` (replies `pong`), `subscribe` (replies `subscribed`).
- Helpers: `broadcast`, `sendToUser`, `sendToClient`, `notifyNewCall`, `notifyCallStatusChange`, `notifyNewContact`, `getClientCount`, `getClients`, `closeAll`.
- **Not currently used by the frontend.**

### 3.12 Uploads

- `backend/uploads/` — created at runtime if missing; CSV import temp files are written here and unlinked after processing.

---

## 4. API DOCUMENTATION

All responses (success/paginated/error) follow:

```json
{ "success": true, "message": "...", "data": {...}, "timestamp": "..." }
{ "success": false, "message": "...", "errors": [...], "timestamp": "..." }
```

> **Auth header for protected routes:** `Authorization: Bearer <jwt>`.

### 4.1 Health

| Method | URL              | Auth | Purpose |
|--------|------------------|------|---------|
| GET    | `/api/health`    | no   | `{ success, status: 'ok', uptime, timestamp, version }` |

### 4.2 Auth (`/api/auth`)

| Method | URL                  | Auth | Body / Query                                          | Response                                                                 | Caller       |
|--------|----------------------|------|-------------------------------------------------------|--------------------------------------------------------------------------|--------------|
| POST   | `/api/auth/login`    | no   | `{ email, password }`                                 | `{ success, message, data: { token, user } }` — 400/401 on failure       | `Login.jsx` → `AuthContext.login` |
| POST   | `/api/auth/logout`   | yes  | —                                                     | `{ success, message: 'Logged out successfully' }`                        | (none — stateless) |
| GET    | `/api/auth/me`       | yes  | —                                                     | `{ success, message, data: { id, name, email, role, createdAt } }`       | `AuthContext.verifyToken` on mount |

### 4.3 Contacts (`/api/contacts`)

| Method | URL                  | Auth | Body / Query                                                                                              | Response                                                              | Caller |
|--------|----------------------|------|-----------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------|--------|
| GET    | `/api/contacts`      | yes  | Query: `page=1`, `limit=10`, `search`, `status=new|contacted|interested|not_interested`, `sortBy`, `order` | `ApiResponse.paginated` → `data: [Contact]`, `pagination: {...}`        | `Contacts.jsx` `useQuery`, `Dialer.jsx` contacts list, `CallLogs.jsx` filter dropdown |
| POST   | `/api/contacts`      | yes  | `{ name, phone, email?, company?, status?, notes? }`                                                       | 201 → `data: Contact`                                                   | `Contacts.jsx` `createMutation` |
| GET    | `/api/contacts/:id`  | yes  | —                                                                                                         | 200 → `data: Contact`                                                   | `Dialer.jsx` selected contact query |
| PUT    | `/api/contacts/:id`  | yes  | Partial `{ name?, phone?, email?, company?, status?, notes? }`                                            | 200 → `data: Contact`                                                   | `Contacts.jsx` `updateMutation` |
| DELETE | `/api/contacts/:id`  | yes  | —                                                                                                         | 200 → `{ message: 'Contact deleted' }`                                  | `Contacts.jsx` `deleteMutation` |
| POST   | `/api/contacts/import` | yes  | `multipart/form-data` field `file` (≤ 5 MB, CSV)                                                          | 200 → `data: { imported, skipped, errors: [...] }`                     | `Contacts.jsx` `importMutation` |

### 4.4 Calls (`/api/calls`)

| Method | URL                       | Auth | Body / Query                                                                                  | Response                                                                       | Caller |
|--------|---------------------------|------|-----------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------|--------|
| GET    | `/api/calls`              | yes  | `page=1`, `limit=10`, `contactId?`, `sortBy=startTime\|duration\|createdAt\|date`, `order=ASC\|DESC` | `ApiResponse.paginated` → `data: [Call]` (includes `contact` + `notes`)         | `CallLogs.jsx` `useQuery` |
| POST   | `/api/calls/start`        | yes  | `{ contactId }` (UUID)                                                                        | 201 → `data: Call` (status `'calling'`, `startTime` set)                       | `Dialer.jsx` `startCallMutation` |
| POST   | `/api/calls/end`          | yes  | `{ callId }` (UUID)                                                                           | 200 → `data: Call` (status `'ended'`, `endTime`, `duration` set)              | `Dialer.jsx` `endCallMutation` |
| POST   | `/api/calls/:id/notes`    | yes  | `{ content, contactStatus? }`                                                                | 201 → `data: CallNote` (`aiSummary`, `sentiment` auto-generated)              | `Dialer.jsx` `addNoteMutation` |
| GET    | `/api/calls/:id/notes`    | yes  | —                                                                                             | 200 → `data: [CallNote]`                                                       | `CallLogs.jsx` `expandedNotes` query |

### 4.5 Dashboard (`/api/dashboard`)

| Method | URL                | Auth | Body / Query | Response                                                                                                                                                                  | Caller |
|--------|--------------------|------|--------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|--------|
| GET    | `/api/dashboard`   | yes  | —            | `{ success, message, data: { totalContacts, contactBreakdown: { new, contacted, interested, notInterested }, statusBreakdown: {...}, callsToday, recentCalls, callActivity: [7 entries with {date,dateFormatted,calls,duration}], conversionRate, totalLeads } }` | `Dashboard.jsx` `useQuery` |

### 4.6 Admin (`/api/admin`) — `admin` role only

| Method | URL                       | Auth         | Body / Query      | Response                                                                 | Caller |
|--------|---------------------------|--------------|-------------------|--------------------------------------------------------------------------|--------|
| GET    | `/api/admin/stats`        | admin        | —                 | `{ success, message, data: { users, contacts, calls } }`                 | (none in frontend) |
| GET    | `/api/admin/users`        | admin        | `page=1`, `limit=10` | `ApiResponse.paginated` → `data: [User]` (no password)                  | (none in frontend) |
| DELETE | `/api/admin/users/:id`    | admin        | —                 | 200 → success / 400 on self-deletion / 404 if missing                    | (none in frontend) |

### 4.7 WebSocket

- `ws://<host>/ws` — emits `{ type: 'connected', clientId, timestamp }` on connect. Server handles `auth`, `ping`, `subscribe` messages. The frontend does not currently open a socket.

### 4.8 Standard error shapes

- 400 Validation: `{ success: false, message: 'Validation failed', errors: [{ field, message, value }] }` (from `validate.js`) or `{ success: false, message: 'Validation error', errors: [...] }` (from Sequelize).
- 401: `{ success: false, message: 'Invalid credentials' | 'Token expired' | 'Invalid token' | 'Access denied. No token provided.' }`.
- 403: `{ success: false, message: 'You do not have permission...' }` (or `'Cross-origin request blocked'`).
- 404: `{ success: false, message: '...not found' }`.
- 409: `{ success: false, message: 'Duplicate entry', errors: [...] }`.
- 422 (rare): `{ success: false, message: 'Validation failed', errors: [...] }` from `ApiError.validation`.
- 429: `{ success: false, message, retryAfter, timestamp }`.
- 500: `{ success: false, message: 'Internal server error' }` (or the actual message in dev).

---

## 5. DATABASE SCHEMA (live SQLite)

```
$ sqlite3 backend/database.sqlite ".tables"
CallNotes  Calls  Contacts  Users  Users_backup
```

### 5.1 `Users`
| Column       | Type            | Constraints                                                  |
|--------------|-----------------|--------------------------------------------------------------|
| `id`         | UUID            | PRIMARY KEY, UNIQUE, auto-generated (UUID v4)                |
| `name`       | VARCHAR(255)    | NOT NULL                                                     |
| `email`      | VARCHAR(255)    | NOT NULL, UNIQUE                                             |
| `password`   | VARCHAR(255)    | NOT NULL (bcrypt hash)                                       |
| `role`       | TEXT (ENUM)     | DEFAULT `'agent'`, values `admin|agent`                      |
| `lastLoginAt`| DATETIME        | NULL                                                         |
| `createdAt`  | DATETIME        | NOT NULL (Sequelize)                                         |
| `updatedAt`  | DATETIME        | NOT NULL (Sequelize)                                         |

### 5.2 `Contacts`
| Column      | Type           | Constraints                                                                                  |
|-------------|----------------|----------------------------------------------------------------------------------------------|
| `id`        | UUID           | PRIMARY KEY, UNIQUE                                                                          |
| `userId`    | UUID           | NOT NULL, FK → `Users(id)`                                                                   |
| `name`      | VARCHAR(255)   | NOT NULL                                                                                     |
| `phone`     | VARCHAR(255)   | NOT NULL                                                                                     |
| `email`     | VARCHAR(255)   | NULL, isEmail (model-level)                                                                  |
| `company`   | VARCHAR(255)   | NULL                                                                                         |
| `status`    | TEXT (ENUM)    | DEFAULT `'new'`, values `new|contacted|interested|not_interested`                            |
| `notes`     | TEXT           | NULL                                                                                         |
| `createdAt` | DATETIME       | NOT NULL                                                                                     |
| `updatedAt` | DATETIME       | NOT NULL                                                                                     |

### 5.3 `Calls`
| Column      | Type            | Constraints                                                                                  |
|-------------|-----------------|----------------------------------------------------------------------------------------------|
| `id`        | UUID            | PRIMARY KEY, UNIQUE                                                                          |
| `contactId` | UUID            | NOT NULL, FK → `Contacts(id)`                                                                |
| `userId`    | UUID            | NOT NULL, FK → `Users(id)`                                                                   |
| `startTime` | DATETIME        | NULL                                                                                         |
| `endTime`   | DATETIME        | NULL                                                                                         |
| `duration`  | INTEGER         | NULL (seconds)                                                                               |
| `status`    | TEXT (ENUM)     | DEFAULT `'initiated'`, values `initiated|calling|connected|ended|missed`                     |
| `createdAt` | DATETIME        | NOT NULL                                                                                     |
| `updatedAt` | DATETIME        | NOT NULL                                                                                     |

### 5.4 `CallNotes`
| Column      | Type            | Constraints                                  |
|-------------|-----------------|----------------------------------------------|
| `id`        | UUID            | PRIMARY KEY, UNIQUE                          |
| `callId`    | UUID            | NOT NULL, FK → `Calls(id)`                   |
| `userId`    | UUID            | NOT NULL, FK → `Users(id)`                   |
| `content`   | TEXT            | NOT NULL                                     |
| `aiSummary` | TEXT            | NULL                                         |
| `sentiment` | VARCHAR(255)    | NULL                                         |
| `createdAt` | DATETIME        | NOT NULL                                     |
| `updatedAt` | DATETIME        | NOT NULL                                     |

### 5.5 `Users_backup` (artifact)
- Mirror of `Users` produced by `seed.js` calling `sequelize.sync({ alter: true })`. Safe to `DROP TABLE Users_backup;`.

### 5.6 Row counts (live)

| Table       | Rows |
|-------------|------|
| `Users`     | 2 (`Demo Agent` agent, `Admin User` admin) |
| `Contacts`  | 7 |
| `Calls`     | 6 |
| `CallNotes` | 5 |
| `Users_backup` | mirror (count not queried) |

### 5.7 Cascade / FK behavior
- **No `onDelete` is set** on any FK. SQLite defaults to `NO ACTION`, so deleting a `Contact` or `User` while related `Calls` / `CallNotes` exist will throw a `FOREIGN KEY constraint failed` error. (See Bugs.)

---

## 6. DATA FLOW MAP

### 6.1 Login
```
Login.jsx
  onSubmit({email, password})
    → AuthContext.login(email, password)               (context/AuthContext.jsx)
        → api.post('/auth/login', {email, password})   (api/axios.js, baseURL → /api)
            POST /api/auth/login                        (routes/auth.js)
              authLimiter → validate(loginValidators) → AuthService.login
                → User.findOne({where:{email}}) → user.validatePassword(password) [bcrypt]
                → user.save({fields:['lastLoginAt']})
                → jwt.sign({id,email,role}, JWT_SECRET, {expiresIn:'7d'})
                → ApiResponse.success(res,{token,user})
            ← {data:{token,user}}
        → localStorage.setItem('token'), localStorage.setItem('user', JSON.stringify(user))
        → setUser/setToken/setIsAuthenticated
    navigate(from || '/dashboard', {replace:true})
```

### 6.2 View Contacts
```
Contacts.jsx (mount / search change / page change)
  useQuery(['contacts', page, debouncedSearch, statusFilter], fetch)
    → api.get('/contacts', {params:{page, limit:10, search, status}})
        GET /api/contacts                               (routes/contacts.js)
          auth → validate(queryValidators) → ContactsService.list(req.user.id, params)
            → Contact.findAndCountAll({where,limit,offset,order})
            → buildPaginationMeta(count, page, limit)
            → ApiResponse.paginated(res, rows, pagination)
        ← {data:[Contact], pagination}
    render table
```

### 6.3 Add Contact
```
Contacts.jsx
  Add → openAddModal() → fill form (react-hook-form + zod) → submit
  createMutation.mutate(formData)
    → api.post('/contacts', formData)
        POST /api/contacts                               (routes/contacts.js)
          auth → validate(createContactValidators) → ContactsService.create(userId, body)
            → Contact.create({userId, name, phone, email?, company?, status?, notes?})
            → ApiResponse.success(res, contact, 'Contact created', 201)
        ← 201 data:Contact
    onSuccess → queryClient.invalidateQueries(['contacts']), (['dashboard'])
               → close modal, reset form
```

### 6.4 Make a Call
```
Dialer.jsx
  Select contact (or arrive via ?contactId=…)
    useQuery(['contact', id]) → GET /api/contacts/:id → ContactsService.findOne
  handleStartCall() → startCallMutation.mutate(selectedContactId)
    → api.post('/calls/start', {contactId})
        POST /api/calls/start                           (routes/calls.js)
          auth → validate(startCallValidators) → CallsService.startCall(userId, contactId)
            → Contact.findOne({id, userId}) [ownership check, 404 if missing]
            → Call.create({contactId, userId, startTime: new Date(), status:'calling'})
            → contact.lastContactedAt = new Date(); contact.save({fields:['lastContactedAt']})
              [⚠ column not on model — would error if not already in DB]
            → Call.findByPk(call.id, {include:[{model:Contact,as:'contact'}]})
            → ApiResponse.success(res, call, 'Call started', 201)
        ← 201 data:Call
    onSuccess → setCurrentCall(call); setCallState('calling')
              → setTimeout 3 s → setCallState('connected'), start 1 s interval
```

### 6.5 End Call + Save Note
```
Dialer.jsx
  handleEndCall() → endCallMutation.mutate(currentCall.id)
    → api.post('/calls/end', {callId})
        POST /api/calls/end                             (routes/calls.js)
          auth → validate(endCallValidators) → CallsService.endCall(callId, userId)
            → Call.findOne({id: callId, userId}) → 404 if missing
            → reject 400 if call.status === 'ended'
            → endTime = new Date(); duration = floor((endTime - startTime)/1000)
            → call.update({endTime, duration, status:'ended'})
            → ApiResponse.success(res, call, 'Call ended')
        ← 200 data:Call
    onSuccess → clearInterval(connectedTimeRef); setCallState('ended')
  (User fills textarea) handleAddNote({content})
    → addNoteMutation.mutate({callId, content})
        POST /api/calls/:id/notes                        (routes/calls.js)
          auth → validate(noteValidators) → CallsService.addNote(callId, userId, body)
            → verify call ownership (404 if missing)
            → aiSummary = AIService.generateSummary(content) [keyword classifier]
            → sentiment  = AIService.analyzeSentiment(content)
            → CallNote.create({callId, userId, content, aiSummary, sentiment})
            → if body.contactStatus → Contact.update({status}, {where:{id:call.contactId}})
            → ApiResponse.success(res, note, 'Note added', 201)
        ← 201 data:CallNote
    onSuccess → setNoteSubmitted(true); reset form
```

### 6.6 View Call Logs
```
CallLogs.jsx
  useQuery(['calls', page, contactFilter, sortBy, sortOrder])
    → api.get('/calls', {params:{page, limit:10, sortBy, order, contactId?}})
        GET /api/calls                                  (routes/calls.js)
          auth → validate(callQueryValidators) → CallsService.listCalls
            → Call.findAndCountAll({where:{userId, contactId?}, include:[Contact, CallNote], order, limit, offset, distinct:true})
            → ApiResponse.paginated
        ← {data:[Call], pagination}
  (Click row) toggleExpand(callId)
    useQuery(['call-notes', expandedCall], enabled:!!expandedCall)
      → api.get('/calls/:id/notes') → CallsService.getNotes → CallNote.findAll
      render notes with aiSummary pill
```

### 6.7 View Dashboard
```
Dashboard.jsx
  useQuery(['dashboard'])
    → api.get('/dashboard')
        GET /api/dashboard                              (routes/dashboard.js)
          auth → DashboardService.getStats(userId)
            Promise.all([
              Contact.count, Call.count(where startTime >= today), 4 Contact counts by status,
              Call.findAll recent 5 (with Contact include),
              Contact.findAll GROUP BY status,
              Call.findAll grouped by DATE(startTime) for 7 days
            ])
            → build statusBreakdown {new,contacted,interested,not_interested}
            → processCallActivity (zero-filled 7-day array)
            → conversionRate = interested/totalLeads*100
            → ApiResponse.success
        ← data:{totalContacts, contactBreakdown, statusBreakdown, callsToday, recentCalls, callActivity, conversionRate, totalLeads}
```

---

## 7. BUGS & ISSUES FOUND

### 7.1 Backend bugs

1. **`ContactsService.getStatusBreakdown` references undefined `sequelize`.**
   `services/contacts.service.js:240` uses `sequelize.fn('COUNT', sequelize.col('status'))` but `sequelize` is never imported in this file. Calling this method throws `sequelize is not defined`. (`getStatusBreakdown` is currently unused by routes/controllers but is exported.)

2. **`CallsService.getStats` references undefined `Op`.**
   `services/calls.service.js:197-201` uses `[Op.gte]` / `[Op.lte]` but `Op` is not imported. (Currently unused by routes.)

3. **`Contact` model has no `lastContactedAt` column, but it's written to.**
   `services/calls.service.js:35-36` sets `contact.lastContactedAt = new Date()` and `contact.save({fields:['lastContactedAt']})`. The model (`models/Contact.js`) doesn't define this column. Under `force: false` sync, the DB has no such column — the call would throw `Unknown column 'lastContactedAt'`. The contact-query validator also references `lastContactedAt` in the `sortBy` enum.

4. **`Contact.getStaleContacts` uses `NULLS FIRST`** (a Postgres/SQLite-3.30+ syntax). The Sequelize `order: [['lastContactedAt', 'ASC NULLS FIRST']]` is not portable and may not work on older SQLite (Sequelize turns this into raw SQL).

5. **No FK cascade. Orphan rows on delete.**
   `ContactsService.delete` calls `contact.destroy()` with no cascade. SQLite will reject the delete with a `FOREIGN KEY constraint failed` if the contact has any `Calls` (and those in turn have `CallNotes`). The `Call` model also has no `onDelete` for its `CallNote` association. None of the FKs declare `onDelete: 'CASCADE'` or `SET NULL`. Practical impact: **a contact with call history cannot be deleted** through the API.

6. **Cascade behavior also missing for user deletion.** `admin.js` `DELETE /users/:id` will fail for the same reason if the user has any contacts.

7. **`callController.getNotes` references undefined `User`.**
   `controllers/callController.js:230` includes `{ model: User, as: 'user' }` without importing it. The route doesn't use this controller (it calls `CallsService.getNotes` instead), so it's latent — but the dead controller would crash on the include.

8. **`authController.logout` is `async (req, res)` with no `next`**, and `authController.js` requires `'../models'` for `User` but never uses it. Not wired in routes; safe to delete.

9. **`authService.login` checks `user.isActive === false`** — `isActive` is not a column on `User`. This branch is unreachable, but the falsey check is correct enough to not throw (undefined !== false).

10. **`dashboardService.getTeamStats` filters `User.count({ where: { isActive: true } })`** — same issue, `isActive` is not a column, so it always returns 0.

11. **CSV import — file is read from `req.file.path` but the route never registers a `multer` upload middleware at the router level before the inline `upload.single('file')` call is correct** — verified, that's fine. But the controller fallback path `controllers/contactController.js` (dead code) parses the CSV inline rather than delegating, and silently re-defines the multer config. Keeping both creates drift risk.

12. **`contacts.validators.js` `queryValidators.sortBy` enum includes `'lastContactedAt'`** which is not a valid column on the model (see #3).

13. **`callQueryValidators.sortBy` allows `'date'`** but `CallsService.listCalls` only handles `sortBy === 'duration'` (falls through to `startTime`). The validator passes `'date'` to the service which silently sorts by `startTime`. Not a crash, but misleading.

14. **`seeder` runs `sequelize.sync({ alter: true })`**, which created a `Users_backup` table on the live DB (a SQLite 5/6 alter-table artifact). Safe to drop, but it's evidence of schema drift.

15. **`req.file.path` is `unlinkSync`'d** in `routes/contacts.js` after success **and** on error. If the file is removed before the next request, OK — but `unlinkSync` on a missing file throws. Wrapped in `try/catch` only on the error path, **not** on the success path → a race or repeated imports on the same filename could crash the success branch. (Low likelihood given unique suffix.)

16. **CORS origin parsing is naive.** `process.env.CORS_ORIGIN?.split(',')` works, but the default list still includes `http://localhost:3000` even though the live backend `.env` declares `CORS_ORIGIN=http://localhost:5174,http://localhost:3000` and the actual frontend port is `5173` (vite default) or `5174` (when 5173 is busy). Likely a stale default causing intermittent 403s in dev.

17. **Port mismatch between env files.** `backend/.env` is set to `PORT=5001` but `frontend/vite.config.js` proxies to `http://localhost:5001`, and `frontend/src/api/axios.js` falls back to `http://localhost:5001/api`. So the configured `5001` is correct, but `docker-compose.yml` and `Dockerfile.backend` assume `5000` — anyone running via Compose will see a port mismatch with the frontend (and `frontend/index.html` lives at `5173` in dev, `3000` in Docker). Documented in README but easy to trip over.

18. **`winston` import in `config/logger.js` uses deprecated `substr`.** `Math.random().toString(36).substr(2, 9)` — still works in Node 18 but flagged in some linters; same pattern in `websocket.js` (`generateClientId`).

19. **Auth `POST /auth/logout` route body is empty but the handler does `next(error)` on the catch** — there is no catch possible since the body is constant. Harmless.

20. **`server.js` `app.use('/api', apiLimiter)`** means even `/api/health` is rate-limited (the limiter has `skip: req.path === '/api/health'`, but `req.path` is the suffix — for `app.use('/api', ...)` it resolves to `/health`, not `/api/health`, so the skip is **incorrect**). The health check is still being counted toward the 100-req/15-min limit (it counts once at startup per compose healthcheck, so practically negligible — but the `skip` is dead code).

21. **`/api/health` handler reads `process.env.npm_package_version`** — will be `undefined` when launched outside `npm` (e.g. `node server.js` directly) and the docstring claim `version: '1.0.0'` will fall through. Cosmetic.

22. **Swagger servers hardcode `http://localhost:5000`** but the live backend listens on `5001`. Cosmetic.

23. **WebSocket message handlers (`auth`, `subscribe`) are stubs** — they reply OK but do not actually do anything. A real client would receive no data from `subscribe` calls.

24. **`CallsService.startCall` does not check whether the user already has an active call**, so it's possible to start two calls back-to-back without ending the first.

### 7.2 Frontend bugs / UX issues

25. **`CallLogs.jsx` reads `data.data || data.calls`.** The backend `GET /calls` returns `data: [Call]` (no `calls` key), so the `data?.data` branch is the one that fires — but the `data?.calls` fallback is dead code and indicates confusion.

26. **`Contacts.jsx` uses `data?.data`** for the contacts array, while the live backend returns `{ data: [...], pagination: {...} }` — which is what `ApiResponse.paginated` sends (`{ success, message, data, pagination, timestamp }`). Correct. (No bug, just a comment.)

27. **Dialer state machine doesn't survive a refresh.** If the user refreshes `/dialer?contactId=…` mid-call, `currentCall` is lost; there's no resume logic. Acceptable for a mock dialer, but worth noting.

28. **`useContacts` hook passes `page, limit, search, status` as separate arguments** but only `page` and `status` are documented for the hook signature. The destructured `limit` and `search` are used in the `queryKey` even when not passed — would create a `[contacts, 1, 10, '', '']` cache that can clash with components that pass nothing. In practice the inline `useQuery` in `Contacts.jsx` is the only caller and constructs its own key, so the hook is effectively unused.

29. **`axios.js` 401 handler** clears `localStorage` and uses `window.location.href = '/login'` — a full page reload that drops any in-memory state and any pending TanStack Query requests. Replacing with a `navigate` would be smoother, but the full reload is also intentional to reset React tree.

30. **`Sidebar.jsx` is registered inside `Layout.jsx`**, but the Login page does not use `<Layout />` and therefore has no sidebar. Good. However, `<ProtectedRoute>` returns a full-screen spinner that does **not** use the sidebar layout — short flash on every hard reload when token is still valid. Acceptable.

31. **Date filter / range missing on `CallLogs.jsx`.** The `sortBy` selector hard-codes four options; no way to view only "this week" or "today".

32. **`Badge` component does not handle `status="new"` for calls consistently.** `Call` status uses `initiated/calling/connected/ended/missed`; `Contact` status uses `new/contacted/interested/not_interested`. The Badge covers both correctly. ✓

33. **No `Register` route.** `Register` validators and `AuthService.register` exist on the backend but no frontend page exposes them. The Login page says "Contact support" for sign-up.

34. **`ProtectedRoute` uses `<Navigate to="/login" state={{ from: location }} replace />`**, but the Login page reads `location.state?.from?.pathname` only — if a `from` is set with no `pathname`, navigation defaults to `/dashboard`. ✓

35. **`Dialer.jsx` simulates a 3-second "ringing" delay** via `setTimeout`. If the user navigates away before the timeout fires, `setCallState(CALL_STATES.CONNECTED)` runs on an unmounted component (the cleanup effect clears the interval but not the pending timeout). Minor — React 18 swallows the warning in StrictMode.

36. **`CallLogs.jsx` loads up to 100 contacts for the filter dropdown via `useQuery`** on every CallLogs mount — fine at this scale, but not paginated, so a user with thousands of contacts would lag.

37. **`Dashboard.jsx` shows hard-coded `trend={12}` and `trend={8}`** for "Calls Today" and "Interested Leads". There is no historical comparison; the numbers are decorative.

38. **No tests** — `backend/tests/` is empty; `npm test` will fail (the script invokes `jest` but no specs exist).

39. **`useContacts` hook is unused** by any component (the pages call `useQuery` directly with the same URL). Dead code.

40. **No CSRF protection.** Cookie-based auth isn't used (JWT in `localStorage` instead), so CSRF risk is low — but `cors` allows `credentials: true`, which is meaningful only if cookies are exchanged. There are no cookie credentials, so this is benign.

41. **The frontend `package.json` does not include `test` script** (no testing lib installed), but the README documents `npm test`. The backend `package.json` includes `test` → jest, with no specs.

### 7.3 Data / consistency issues

42. **`CallNote` has a `sentiment` column** that is only written by `CallsService.addNote` (when called from the service path) — the legacy `callController.addNote` does not write it.

43. **Contact `email` is unique-by-(not enforced)** — there's no DB-level unique index on `Contacts.email` (only on `Users.email`). A user can have duplicate emails across contacts.

44. **No soft-delete** — destroy is permanent; no `deletedAt` or status flag. Recycle bin cannot be implemented without schema change.

45. **`CallsService.startCall` writes to `Contact.lastContactedAt` immediately on `startCall`** (even though the call is still `calling`/`connected`). This advances the "last contacted" timestamp before the call is even connected.

46. **`CallsService.addNote` accepts `contactStatus`** to update the related contact's status, but the frontend never sends it (note mutation in `Dialer.jsx` only sends `{ content }`). The field is therefore dead from the UI.

---

## 8. ENVIRONMENT & CONFIG

### 8.1 Environment variables

#### Backend (`backend/.env` — live; differs from `backend/.env.example`)

| Key             | Live (`.env`)                          | Example (`.env.example`)                 | Purpose                                       |
|-----------------|----------------------------------------|------------------------------------------|-----------------------------------------------|
| `PORT`          | `5001`                                 | `5000`                                   | Express listen port                           |
| `CORS_ORIGIN`   | `http://localhost:5174,http://localhost:3000` | (not set)                          | Comma-separated allowed origins               |
| `JWT_SECRET`    | `super_secret_jwt_key_change_in_production` | `your_secret_jwt_key_here`         | HMAC secret for JWT signing                   |
| `JWT_EXPIRES_IN`| `7d`                                   | `7d`                                     | Token lifetime                                |
| `DB_PATH`       | `./database.sqlite`                    | `./database.sqlite`                      | SQLite file path                              |
| `NODE_ENV`      | `development`                          | `development`                            | Toggles logging level + error messages        |

> **Mismatch warning:** `frontend/vite.config.js` proxies `/api → http://localhost:5001`, and `frontend/src/api/axios.js` defaults to `http://localhost:5001/api`. The README says backend runs on `5000`. If you start the backend on `5000` (e.g. via Docker), the frontend cannot reach it without rebuilding the proxy or setting `VITE_API_URL`.

#### Frontend

| Key            | Set where?          | Value used                                                |
|----------------|---------------------|-----------------------------------------------------------|
| `VITE_API_URL` | `docker-compose.yml` | `/api` (only used in Docker; dev reads from axios fallback `http://localhost:5001/api`) |

### 8.2 `package.json` scripts

#### Backend (`backend/package.json`)
- `start` → `node server.js`
- `dev` → `nodemon server.js`
- `seed` → `node src/seeders/seed.js`
- `test` → `NODE_ENV=test jest --runInBand --detectOpenHandles --forceExit` (no specs shipped)
- `test:coverage` → jest with coverage

#### Frontend (`frontend/package.json`)
- `dev` → `vite`
- `build` → `vite build`
- `preview` → `vite preview`
- (`test` is documented in README but not declared here.)

### 8.3 Dependencies (versions)

#### Backend (`package.json`)

| Package               | Version          | Purpose                          |
|-----------------------|------------------|----------------------------------|
| `bcryptjs`            | ^2.4.3           | Password hashing                 |
| `cors`                | ^2.8.5           | CORS middleware                  |
| `csv-parser`          | ^3.0.0           | CSV parsing                      |
| `dotenv`              | ^16.3.1          | Env loading                      |
| `express`             | ^4.18.2          | HTTP framework                   |
| `express-rate-limit`  | ^7.1.5           | Rate limiting                    |
| `express-validator`   | ^7.0.1           | Request validation               |
| `helmet`              | ^7.1.0           | Security headers                 |
| `jsonwebtoken`        | ^9.0.2           | JWT signing/verifying            |
| `morgan`              | ^1.10.0          | HTTP access logs                 |
| `multer`              | ^1.4.5-lts.1     | `multipart/form-data` parsing    |
| `sequelize`           | ^6.35.2          | ORM                              |
| `sqlite3`             | ^5.1.7           | SQLite driver                    |
| `swagger-jsdoc`       | ^6.2.8           | OpenAPI spec from JSDoc          |
| `swagger-ui-express`  | ^5.0.0           | Swagger UI                       |
| `uuid`                | ^9.0.1           | UUID generation                  |
| `winston`             | ^3.19.0          | Logger                           |
| `ws`                  | ^8.16.0          | WebSocket                        |
| `nodemon` (dev)       | ^3.0.2           | Dev autoreload                   |
| `jest` (dev)          | ^29.7.0          | Test runner                      |
| `supertest` (dev)     | ^6.3.4           | HTTP assertions                  |
| `@types/jest` (dev)   | ^29.5.11         | Jest types                       |

#### Frontend (`package.json`)

| Package                       | Version     | Purpose                       |
|-------------------------------|-------------|-------------------------------|
| `react`                       | ^18.2.0     | UI                            |
| `react-dom`                   | ^18.2.0     | React renderer                |
| `react-router-dom`            | ^6.21.1     | Routing                       |
| `@tanstack/react-query`       | ^5.17.0     | Server state                  |
| `axios`                       | ^1.6.3      | HTTP client                   |
| `react-hook-form`             | ^7.49.2     | Forms                         |
| `@hookform/resolvers`         | ^3.3.3      | Zod ↔ RHF adapter             |
| `zod`                         | ^3.22.4     | Schema validation             |
| `lucide-react`                | ^0.303.0    | Icons                         |
| `@vitejs/plugin-react` (dev)  | ^4.2.1      | Vite React plugin             |
| `vite` (dev)                  | ^5.0.10     | Build / dev server            |
| `tailwindcss` (dev)           | ^3.4.0      | CSS framework                 |
| `postcss` (dev)               | ^8.4.33     | CSS pipeline                  |
| `autoprefixer` (dev)          | ^10.4.16    | Vendor prefixes               |

### 8.4 Default credentials (seeded)

- **Demo agent:** `demo@dialer.com` / `password123`
- **Admin (created externally):** `admin@dialer.com` / (password set by the user who created it; not part of the seed script)

### 8.5 Useful entry points

- Frontend dev: `http://localhost:5173`
- Backend dev: `http://localhost:5001` (or `5000` if you revert `.env`)
- Health: `GET /api/health`
- Swagger: `GET /api/docs` (JSON: `/api/docs.json`)
- WebSocket: `ws://localhost:5001/ws`
- Default uploads dir: `backend/uploads/`
- Logs: `backend/logs/{error,combined,http}.log` (5 MB rotation × 5 files for error/combined, × 3 for http)

---

## Appendix A — File map (quick lookup)

### Backend (`backend/src/`)
```
config/        database.js · logger.js · swagger.js
middleware/    auth.js · errorHandler.js · rateLimiter.js · validate.js
models/        User.js · Contact.js · Call.js · CallNote.js · index.js
validators/    auth.validators.js · contacts.validators.js · calls.validators.js
services/      auth.service.js · contacts.service.js · calls.service.js ·
               ai.service.js · dashboard.service.js
controllers/   authController.js · contactController.js · callController.js ·
               dashboardController.js   (legacy; not in route paths)
routes/        auth.js · contacts.js · calls.js · dashboard.js · admin.js
utils/         ApiError.js · ApiResponse.js · pagination.js
seeders/       seed.js
websocket.js   (top-level under src/)
```

### Frontend (`frontend/src/`)
```
api/         axios.js
components/  Layout.jsx · Sidebar.jsx · ProtectedRoute.jsx · ui/{Button,Input,Modal,Badge,Spinner,Pagination}.jsx
context/     AuthContext.jsx
hooks/       useAuth.js · useContacts.js
pages/       Login.jsx · Dashboard.jsx · Contacts.jsx · Dialer.jsx · CallLogs.jsx
utils/       formatters.js
App.jsx · main.jsx · index.css
```

---

## Appendix B — End-to-end smoke test (manual)

1. `cd backend && npm install && npm run seed && npm run dev` — backend on `:5001`, demo user + 15 contacts + 10 calls + 10 notes.
2. `cd frontend && npm install && npm run dev` — Vite on `:5173`.
3. Open `http://localhost:5173`, log in with `demo@dialer.com` / `password123`.
4. Dashboard renders 4 stat cards and "Recent Calls".
5. Navigate to **Contacts** → Add Contact "Test User" → row appears → click phone icon → Dialer opens with that contact.
6. Click **Start Call** → 3 s "Calling…" → "Connected" with live timer → **End Call** → form appears → type a note → **Save Note** → success card with "AI Summary Generated".
7. **Call Logs** → row appears at top → expand → note with AI summary visible.
8. Refresh the page → still authenticated (token in localStorage; `AuthContext` calls `/auth/me` on mount).
9. Toggle dark mode (sidebar) — persists across reloads.
10. `GET /api/docs` — Swagger UI renders the auth/contacts/calls/dashboard routes.

---

*End of report.*
