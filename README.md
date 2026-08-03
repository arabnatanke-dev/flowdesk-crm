# FlowDesk CRM

**Version 0.1.1**

FlowDesk CRM is a bilingual field-service operations workspace for managing customers, work orders, dispatch, technicians, service catalogs, finance, and reporting from one responsive application.

[Open the live demo](https://flowdesk-crm-horizon.rosie-che-1327.chatgpt.site)

## Features

- Russian and English localization with a shared language switch.
- Office dashboard with operational metrics, attention queue, schedule, and activity feed.
- Work-order list, Kanban board, map view, details, priorities, and status transitions.
- Dispatcher workspace with technician capacity and scheduling context.
- Customer, team, service catalog, finance, reporting, and organization settings modules.
- Responsive technician workspace with job actions, checklist, materials, photos, and time tracking.
- Responsive layouts for desktop, tablet, and mobile screens.
- Strict TypeScript, ESLint, production builds, and rendered HTML tests.
- English and Russian documentation comments for named functions.

## Application Routes

- `/` — workspace sign-in screen.
- `/app/horizon/dashboard` — office dashboard.
- `/app/horizon/work-orders` — work-order workspace.
- `/app/horizon/dispatch` — dispatcher workspace.
- `/app/horizon/clients` — customer database.
- `/app/horizon/team` — team and availability.
- `/app/horizon/catalog` — service catalog.
- `/app/horizon/finance` — finance center.
- `/app/horizon/reports` — reporting center.
- `/app/horizon/settings` — organization settings.
- `/m/horizon` — mobile technician workspace.

## Technology

- Next.js-compatible App Router powered by Vinext.
- React 19 and TypeScript.
- Tailwind CSS and product-specific responsive styling.
- Drizzle ORM foundation for future persistence.
- Cloudflare Workers-compatible production output.

## Local Development

Node.js `>=22.13.0` is required.

```bash
npm install
npm run dev
```

## Verification

```bash
npm run lint
npx tsc --noEmit
npm test
```

`npm test` creates a production build and runs the rendered HTML test suite.

## Release Status

Version `0.1.1` establishes the FlowDesk CRM application foundation, bilingual product interface, primary office modules, and mobile technician experience.
