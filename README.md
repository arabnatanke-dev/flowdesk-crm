# FlowDesk CRM

**Version 0.1.1**

FlowDesk CRM is a bilingual field-service CRM foundation for office operators and mobile technicians. Version 0.1.1 includes a real PostgreSQL-backed security and work-order core; several surrounding business modules remain interface previews and are identified below.

## Implemented

- Russian and English UI with document-language synchronization.
- Password authentication using salted PBKDF2-HMAC-SHA-256 hashes.
- Rotating opaque server-side sessions with a 60-second concurrent-request grace period, `__Host-`, `HttpOnly`, `Secure`, `SameSite=Lax`, absolute and idle expiry, cleanup, active-session listing and revocation.
- Organizations, users and memberships with tenant access resolved from both the session user and URL `orgSlug`.
- Read and write RBAC for office modules, work-order data, mobile assignments, status transitions and organization settings.
- PostgreSQL/Neon persistence through Drizzle ORM and a committed SQL migration.
- Tenant-scoped work-order reads and writes, assigned-only technician reads, collision-free organization sequences and optimistic versions.
- Server-owned work-order creation, content editing, assignment, scheduling and status transitions with prerequisite checks and transactional audit records.
- Persisted organization locale, timezone, currency and tax settings with optimistic concurrency.
- Atomic account/network login throttling, a configurable trusted-proxy address header, same-origin mutation checks and baseline browser security headers.
- Responsive office and technician routes, including work-order deep links.
- Unit tests plus isolated PostgreSQL integration tests for tenant isolation, role reads, session expiry/revocation/rotation, parallel throttling, workflow commands, stale versions and audit commits.
- GitHub Actions checks for dependency audit, lint, TypeScript, migration drift, production build and all tests.
- English and Russian comments inside named functions.

## Foundation / preview modules

Dashboard, dispatch, clients, team, catalog, finance and reports currently demonstrate the intended product interface with sample read-only data. They do not yet provide complete production CRUD, accounting, scheduling, file uploads, notifications or analytics pipelines. Technician checklists, materials, photos and time tracking are also local UI previews; technician work-order status commands use the real protected API.

Password recovery, email delivery, MFA, member invitations and a production background-job system are not included in version 0.1.1.

## Routes

- `/` — sign-in.
- `/app/:orgSlug/dashboard` — office dashboard.
- `/app/:orgSlug/work-orders` — persisted work-order workspace.
- `/app/:orgSlug/dispatch` — dispatch interface preview.
- `/app/:orgSlug/clients` — client interface preview.
- `/app/:orgSlug/team` — team interface preview.
- `/app/:orgSlug/catalog` — catalog interface preview.
- `/app/:orgSlug/finance` — finance interface preview.
- `/app/:orgSlug/reports` — reporting interface preview.
- `/app/:orgSlug/settings` — persisted organization settings.
- `/m/:orgSlug` — protected mobile technician workspace.

All `/app/*`, `/m/*` and organization API routes require an active session and an active membership in the requested organization. Office navigation and route access are role-specific:

- `OWNER` / `ADMIN` — all office work-order reads and commands.
- `DISPATCHER` — operational modules and all organization work orders.
- `TECHNICIAN` — mobile workspace and only work orders assigned to that user.
- `ACCOUNTANT` — finance and reporting modules; no operational work-order endpoint.
- `VIEWER` — explicitly allowed reporting module only; no work-order endpoint or mutations.

## Technology

- Next.js-compatible App Router powered by Vinext.
- React 19 and strict TypeScript.
- PostgreSQL or Neon with Drizzle ORM.
- Cloudflare Workers-compatible production output.
- Node.js `>=22.13.0`.

## Local setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with a real PostgreSQL/Neon connection string, a random `SECURITY_PEPPER` of at least 32 characters, the exact trusted proxy header and a strong bootstrap password. Never commit `.env`.

```bash
npm run db:migrate
npm run db:bootstrap
npm run dev
```

`db:bootstrap` creates missing organization, owner and membership records but never changes an existing password or reactivates an existing account. The login screen intentionally contains no public default password; use the values you set in `.env`.

Optional demonstration records are isolated behind a separate command:

```bash
npm run db:seed-demo
```

An administrator password changes only through the explicit reset command, which also revokes that user's sessions:

```bash
npm run admin:reset-password
```

## Deployment

1. Create an empty PostgreSQL/Neon database.
2. Configure `DATABASE_URL`, `SECURITY_PEPPER` and `TRUSTED_PROXY_HEADER` in the server environment. Production requests fail closed when the variable or its configured proxy header is missing.
3. Run `npm run db:migrate` against that database.
4. Set the `SEED_*` variables and run `npm run db:bootstrap` once from a trusted deployment environment.
5. Build and deploy with `npm run build` using a host that supports the generated Vinext/Cloudflare output and server environment variables.

Rotate or remove seed credentials from the deployment environment after provisioning. TLS must terminate before the application in production so the session cookie is sent only over HTTPS.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm test
npm audit
```

`npm test` creates a production build and runs rendered HTML, security/domain and PostgreSQL integration tests. The integration suite uses an isolated PGlite PostgreSQL engine and applies the committed migration chain from an empty database.

## Release status

Version 0.1.1 is a deployable authenticated CRM foundation, not a completed commercial field-service suite. The authoritative persisted scope is authentication, tenant membership, work orders, status commands, audit records and organization settings. Preview modules should be connected to tenant-scoped server services before production use.
