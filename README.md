# FlowDesk CRM

**Version 0.1.1**

FlowDesk CRM is a bilingual field-service CRM foundation for office operators and mobile technicians. Version 0.1.1 includes a real PostgreSQL-backed security and work-order core; several surrounding business modules remain interface previews and are identified below.

## Implemented

- Russian and English UI with document-language synchronization.
- Password authentication using salted PBKDF2-HMAC-SHA-256 hashes.
- Opaque server-side sessions with `HttpOnly`, `SameSite=Lax`, expiring cookies and logout revocation.
- Organizations, users and memberships with tenant access resolved from both the session user and URL `orgSlug`.
- Role checks for work-order creation, status transitions and organization settings.
- PostgreSQL/Neon persistence through Drizzle ORM and a committed SQL migration.
- Tenant-scoped work-order reads and writes, collision-free organization sequences and optimistic versions.
- Server-owned work-order state transitions with assignment/prerequisite checks and audit records.
- Persisted organization locale, timezone, currency and tax settings with optimistic concurrency.
- Login throttling, same-origin mutation checks and baseline browser security headers.
- Responsive office and technician routes, including work-order deep links.
- Unit tests for password security, permissions and work-order transition policy, plus production-build HTML tests.
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

All `/app/*`, `/m/*` and organization API routes require an active session and an active membership in the requested organization.

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

Edit `.env` with a real PostgreSQL/Neon connection string, a random `SECURITY_PEPPER` of at least 32 characters and a strong seed password. Never commit `.env`.

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

The seed command is idempotent. It creates or updates the configured owner account and organization. The login screen intentionally contains no public default password; use the values you set in `.env`.

## Deployment

1. Create an empty PostgreSQL/Neon database.
2. Configure `DATABASE_URL` and `SECURITY_PEPPER` in the server environment.
3. Run `npm run db:migrate` against that database.
4. Set the `SEED_*` variables and run `npm run db:seed` once from a trusted deployment environment.
5. Build and deploy with `npm run build` using a host that supports the generated Vinext/Cloudflare output and server environment variables.

Rotate or remove seed credentials from the deployment environment after provisioning. TLS must terminate before the application in production so the session cookie is sent only over HTTPS.

## Verification

```bash
npm run lint
npx tsc --noEmit
npm test
npm audit
```

`npm test` creates a production build, runs rendered HTML checks and executes the security/domain unit tests.

## Release status

Version 0.1.1 is a deployable authenticated CRM foundation, not a completed commercial field-service suite. The authoritative persisted scope is authentication, tenant membership, work orders, status commands, audit records and organization settings. Preview modules should be connected to tenant-scoped server services before production use.
