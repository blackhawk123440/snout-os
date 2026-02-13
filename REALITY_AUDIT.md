# Reality Audit - Current State of Web Routes and API Endpoints

## Phase 1: Route Inventory

### Web Routes (Next.js Pages)

#### Authentication Routes
- **`/login`** → `src/app/login/page.tsx`
  - Status: ✅ EXISTS
  - Role enforcement: Client-side redirect based on role
  - Redirects: Owner → `/`, Sitter → `/sitter/inbox`
  - Logout: ❌ NO LOGOUT BUTTON VISIBLE

#### Owner Dashboard Routes
- **`/` (root)** → `src/app/page.tsx`
  - Status: ✅ EXISTS
  - Role enforcement: Client-side check, redirects sitters to `/sitter/inbox`
  - API calls: `/api/bookings`, `/api/sitters` (legacy, return empty arrays)
  - Wired to: ❌ STUBS (returns empty arrays)

- **`/dashboard`** → `src/app/dashboard/page.tsx`
  - Status: ✅ EXISTS (redirects to `/`)
  - Role enforcement: Client-side

- **`/messages`** → `src/app/messages/page.tsx`
  - Status: ✅ EXISTS
  - Role enforcement: ❌ CLIENT-SIDE ONLY (no server protection)
  - API calls: `/api/messages/threads` (via BFF proxy)
  - Wired to: ✅ REAL API (`GET /api/messages/threads`)

- **`/numbers`** → `src/app/numbers/page.tsx`
  - Status: ✅ EXISTS
  - Role enforcement: ❌ CLIENT-SIDE ONLY
  - API calls: `/api/numbers/*` (via BFF proxy)
  - Wired to: ✅ REAL API

- **`/assignments`** → `src/app/assignments/page.tsx`
  - Status: ✅ EXISTS
  - Role enforcement: ❌ CLIENT-SIDE ONLY
  - API calls: `/api/assignments/*` (via BFF proxy)
  - Wired to: ✅ REAL API

- **`/setup`** → `src/app/setup/page.tsx`
  - Status: ✅ EXISTS
  - Role enforcement: ❌ CLIENT-SIDE ONLY
  - API calls: Various setup endpoints
  - Wired to: ✅ REAL API

#### Sitter Routes
- **`/sitter/inbox`** → `src/app/sitter/inbox/page.tsx`
  - Status: ✅ EXISTS
  - Role enforcement: ❌ CLIENT-SIDE ONLY (redirects non-sitters to `/messages`)
  - API calls: `/api/sitter/threads`, `/api/sitter/threads/:id/messages`, `/api/sitter/threads/:id/messages` (POST)
  - Wired to: ✅ REAL API

### API Routes (BFF Proxy)

#### Messages API
- **`GET /api/messages/threads`** → `src/app/api/messages/threads/route.ts`
  - Proxies to: `GET ${API_BASE_URL}/api/messages/threads`
  - Response shape: `{ threads: Thread[] }` (transformed from array)
  - Status: ✅ EXISTS

- **`GET /api/messages/threads/:id/messages`** → ❌ MISSING
  - Should proxy to: `GET ${API_BASE_URL}/api/messages/threads/:threadId`
  - Status: ❌ NOT IMPLEMENTED

- **`POST /api/messages/threads/:id/messages`** → ❌ MISSING
  - Should proxy to: `POST ${API_BASE_URL}/api/messages/send`
  - Status: ❌ NOT IMPLEMENTED

- **`POST /api/messages/:id/retry`** → ❌ MISSING
  - Should proxy to: `POST ${API_BASE_URL}/api/messages/:messageId/retry`
  - Status: ❌ NOT IMPLEMENTED

- **`GET /api/routing/threads/:id/history`** → ❌ MISSING
  - Should proxy to: `GET ${API_BASE_URL}/api/routing/threads/:id/history`
  - Status: ❌ NOT IMPLEMENTED

#### Sitter API
- **`GET /api/sitter/threads`** → ❌ MISSING
  - Should proxy to: `GET ${API_BASE_URL}/api/sitter/threads`
  - Status: ❌ NOT IMPLEMENTED

- **`GET /api/sitter/threads/:id/messages`** → ❌ MISSING
  - Should proxy to: `GET ${API_BASE_URL}/api/sitter/threads/:id/messages`
  - Status: ❌ NOT IMPLEMENTED

- **`POST /api/sitter/threads/:id/messages`** → ❌ MISSING
  - Should proxy to: `POST ${API_BASE_URL}/api/sitter/threads/:id/messages`
  - Status: ❌ NOT IMPLEMENTED

### NestJS API Endpoints (Real Backend)

#### Messages Endpoints
- **`GET /api/messages/threads`** → `apps/api/src/messaging/messaging.controller.ts:17`
  - Response: `Thread[]` (array of threads)
  - Status: ✅ EXISTS

- **`GET /api/messages/threads/:threadId`** → `apps/api/src/messaging/messaging.controller.ts:22`
  - Response: Messages array
  - Status: ✅ EXISTS

- **`POST /api/messages/send`** → `apps/api/src/messaging/messaging.controller.ts:27`
  - Body: `{ threadId: string, body: string, forceSend?: boolean }`
  - Response: Message object
  - Status: ✅ EXISTS

- **`POST /api/messages/:messageId/retry`** → `apps/api/src/messaging/messaging.controller.ts:41`
  - Response: Retry result
  - Status: ✅ EXISTS

#### Sitter Endpoints
- **`GET /api/sitter/threads`** → `apps/api/src/sitter/sitter.controller.ts:20`
  - Response: Array of threads with assignment windows
  - Status: ✅ EXISTS

- **`GET /api/sitter/threads/:id`** → `apps/api/src/sitter/sitter.controller.ts:30`
  - Response: Thread detail
  - Status: ✅ EXISTS

- **`GET /api/sitter/threads/:id/messages`** → `apps/api/src/sitter/sitter.controller.ts:39`
  - Response: Messages array (redacted)
  - Status: ✅ EXISTS

- **`POST /api/sitter/threads/:id/messages`** → `apps/api/src/sitter/sitter.controller.ts:48`
  - Body: `{ body: string }`
  - Response: Message object
  - Status: ✅ EXISTS

#### Routing Endpoints
- **`GET /api/routing/threads/:id/history`** → ❓ NEED TO CHECK
  - Status: ❓ UNKNOWN

## Phase 1 Issues Found

### ❌ CRITICAL MISSING ROUTES
1. `GET /api/messages/threads/:id/messages` - BFF proxy missing
2. `POST /api/messages/threads/:id/messages` - BFF proxy missing
3. `POST /api/messages/:id/retry` - BFF proxy missing
4. `GET /api/routing/threads/:id/history` - BFF proxy missing
5. `GET /api/sitter/threads` - BFF proxy missing
6. `GET /api/sitter/threads/:id/messages` - BFF proxy missing
7. `POST /api/sitter/threads/:id/messages` - BFF proxy missing

### ❌ ROLE ENFORCEMENT ISSUES
1. All routes use CLIENT-SIDE ONLY protection
2. No server-side middleware protection for role-based access
3. Sitter can access `/messages` if they bypass client redirect
4. Owner can access `/sitter/*` if they bypass client redirect

### ❌ LOGOUT BUTTON
1. No visible logout button in AppShell
2. Logout route exists at `/api/auth/logout` but not accessible from UI

## Next Steps
1. Create missing BFF proxy routes
2. Add server-side role protection middleware
3. Add logout button to AppShell
4. Fix quarantine restore functionality
5. Create seed data for proof scenarios
