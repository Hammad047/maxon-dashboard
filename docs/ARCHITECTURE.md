# PRM Dashboard – Architecture

- **No AI at runtime.** All logic is deterministic (frontend + backend).
- **Auth:** JWT access + refresh; signup always creates **VIEWER** (backend-enforced; `SignupRequest` has no `role`).
- **RBAC:** Roles `admin` / `editor` / `viewer` / `external_viewer`. Path-based access via `allowed_path_prefix` (e.g. `dawarc/circuit/ampere`, `prm/...`). Admin has full access.
- **Activity Trend:** Data from fixed S3 path `prm/vault/mi-data-bank/MI Data Bank - PRM.xlsx`. Single-column dropdown; default chart **bar/line**; **pie** only when selected column has ≤4 distinct values. Tooltips: light background, dark text.
- **Admin panel:** User list, edit (role, path prefix, active), stats, path discovery. Admin-only routes return 403 for non-admins.
- **Errors:** 401 → refresh or redirect to sign-in; 403 → reject (caller shows message). Invalid/empty PRM data → 400; missing file → 404. PRM response capped at 10k rows.
- **Structure:** `frontend/` (Vite + React, `src/pages/`, `src/lib/`, `src/contexts/`, `src/components/ui/`), `backend/` (FastAPI, `app/api/v1/`, `app/core/`, `app/services/`, `app/models/`), `shared/` constants, `docs/` for architecture. API under `/api/v1/`.
