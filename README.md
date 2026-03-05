# ONGC FMS Track - Production Parity Full Stack

This implementation is aligned to the target production stack from the project document:
- React (Vite) frontend
- Node.js/Express API
- PostgreSQL + Prisma ORM
- MinIO (S3-compatible) for document storage
- Nginx as web entrypoint/reverse proxy
- Docker Compose deployment

## Implemented Scope
- Full CRUD: `services`, `installations`, `instruments`
- Full CRUD: `contract personnel`, `ONGC personnel`, `installation managers`
- Work Request workflow:
  - Installation Managers create requests
  - Instrument Engineers/Admin convert requests to Work Orders
- Auto-generation endpoint for overdue-calibration requests:
  - `POST /api/work-requests/auto-generate`
- Request origin tracking in API responses:
  - `requestOrigin`: `INSTALLATION_MANAGER | AUTO_GENERATED | MANUAL`
- Manager request creation is now restricted to manager-assigned installation(s)
- Full CRUD: work orders with contract-personnel assignment
- Attendance APIs + summary
- Document upload/status/download APIs (MinIO-backed)
- Dashboard + audit logs
- Seed from provided Excel workbook:
  - `seed-data/all-instruments-isg-2025.xlsx`

## Default Accounts
- `admin / admin123` (ONGC_ADMIN)
- `engineer / engineer123` (ONGC_ENGINEER)
- `coordinator / coord123` (CMS_COORDINATOR)
- `tech / tech123` (CMS_TECHNICIAN)
- `viewer / viewer123` (READ_ONLY)
- `manager01 / manager123` (INSTALLATION_MANAGER)
- `manager02 / manager123` (INSTALLATION_MANAGER)
- `manager03 / manager123` (INSTALLATION_MANAGER)
- `manager04 / manager123` (INSTALLATION_MANAGER)

## Docker Deployment (Recommended)
```bash
docker compose up -d --build
```

Services:
- Web (Nginx + frontend): `http://localhost:4000`
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`

Stop:
```bash
docker compose down
```

Logs:
```bash
docker compose logs -f web api db minio
```

## Local Development (without Docker)
Prerequisites:
- PostgreSQL running locally
- MinIO (or set `STORAGE_MODE=local`)

Setup:
```bash
cp .env.example .env
# update DATABASE_URL and storage settings
npm install
npm run prisma:generate
npm run prisma:push
npm run db:seed -- --reset
npm run dev
```

## Key Scripts
- `npm run dev` - API + frontend
- `npm run prisma:generate` - generate Prisma client
- `npm run prisma:push` - sync schema to DB
- `npm run db:seed -- --reset` - seed from Excel + defaults
- `npm run lint` - lint
- `npm run build` - frontend production build

## Notes
- API runs on `/api/*` and is proxied by Nginx in Docker.
- Seed script skips reseed if data exists; use `--reset` for full reseed.
- Calibration report naming rule enforced:
  `CAL-RPT-{JOB-ID}_{TAG}_{SITE}.pdf`
- Frontend is role-organized:
  - Installation Manager: My Requests + Calibration (default filtered to assigned installations)
  - ONGC Instrumentation: Request Desk defaults to IM + Auto generated requests
  - CMS Team: My Assignments defaults to own active tasks with in-app report submission
  - Rarely changed master-data CRUD pages are grouped under `Settings`
