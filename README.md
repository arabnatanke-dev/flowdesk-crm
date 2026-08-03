# FlowDesk CRM

Интерактивный фундамент мультитенантной CRM для сервисных компаний по техническому заданию FlowDesk. Текущая версия реализует адаптивный RU/EN интерфейс и демонстрационный доменный поток заявок; production-бэкенд, постоянное хранилище, полноценная identity/tenancy модель и интеграции ещё не реализованы.

Interactive foundation for the multi-tenant field-service CRM described in the FlowDesk specification. The current version provides a responsive RU/EN interface and a demo work-order domain flow; the production backend, persistent storage, complete identity/tenancy model, and integrations are not implemented yet.

## Реализовано / Implemented

- RU/EN localization with a shared language switch.
- Login, dashboard, work orders, dispatch, clients, team, catalog, finance, reports, and settings.
- Mobile technician route with work-order status transitions.
- Responsive office and mobile layouts.
- Strict TypeScript, ESLint, production build, and rendered HTML tests.
- Private Sites deployment configuration in `.openai/hosting.json`.
- English and Russian comments for named functions.

## Маршруты / Routes

- `/` — authentication demo.
- `/app/horizon/dashboard` — office dashboard.
- `/app/horizon/work-orders` — work-order list, board, map, and details.
- `/app/horizon/dispatch` — dispatcher workspace.
- `/app/horizon/clients`, `/team`, `/catalog`, `/finance`, `/reports`, `/settings` — business modules under `/app/horizon`.
- `/m/horizon` — technician mobile workspace.

## Локальный запуск / Local development

Requires Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

## Проверка / Verification

```bash
npm run lint
npx tsc --noEmit
npm test
```

`npm test` performs a production build and runs the rendered HTML checks.

## Текущая стадия / Current stage

Roadmap stage 1, Foundation. The UI and frontend architecture are substantially established; production data, APIs, authentication, tenant isolation, observability, audit, security hardening, and CI/database verification remain future work.
