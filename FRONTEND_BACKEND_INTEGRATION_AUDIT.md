# FRONTEND-BACKEND INTEGRATION AUDIT

Date: 2026-03-11  
Scope: CRM workflow integration verification (frontend vs backend APIs, DTOs, transitions, automation visibility)

## Results

### Forms
Status: **FAIL**

- Stage 2 CONTACTED capture is not fully wired from UI to a dedicated backend transition payload.
- Backend DTO exists: `backend/src/modules/leads/leads.dto.ts` (`MarkLeadContactedDto`).
- Lead status routes exist, but no complete CONTACTED data collection flow was verified in UI.

### API Payloads
Status: **FAIL**

- Task status mismatch:
  - Frontend sends transformed statuses like `IN_REVIEW`: `frontend/src/pages/Tasks.tsx`.
  - Backend validator allows only `TODO | IN_PROGRESS | REVIEW | DONE`: `backend/src/modules/tasks/tasks.validators.ts`.
- Quote status mismatch:
  - Frontend uses `CONVERTED`: `frontend/src/pages/Quotes.tsx`.
  - Prisma enum does not include `CONVERTED`: `backend/prisma/schema.prisma` (`QuoteStatus`).
- Projects draft endpoint mismatch:
  - Frontend calls `/projects/draft`: `frontend/src/features/projects/services/projects-service.ts`.
  - Backend routes do not expose `/draft`: `backend/src/modules/projects/projects.routes.ts`.

### Pipeline Transitions
Status: **PARTIAL**

- Lead pipeline UI drag/drop calls backend status update and updates UI optimistically: `frontend/src/pages/Leads/Pipeline.tsx`.
- Backend status endpoint exists: `backend/src/modules/leads/leads.routes.ts`.
- PARTIAL because CONTACTED-specific transition payload + validation flow is not fully verified in frontend.

### Automation Triggers
Status: **PARTIAL**

- Backend lead-created automations are implemented and comprehensive:
  - `lead.created` emitted in `backend/src/modules/leads/leads.service.ts`.
  - Handled in `backend/src/modules/automation/automation.service.ts` (task, calendar with reminder, notifications, push, email, SMS, folder).
- Frontend trigger for lead creation exists: `frontend/src/features/leads/services/leads-service.ts`.
- PARTIAL because frontend verification of downstream automation visibility is incomplete across modules.

### Documents
Status: **FAIL**

- Frontend documents page is primarily local/mock-driven, not verified as fully API-backed:
  - `frontend/src/pages/Documents.tsx`.

### Tasks & Calendar
Status: **PARTIAL**

- Backend automation creates tasks/events on lead creation.
- Frontend task/calendar end-to-end consistency has mismatches and was not fully validated for all generated records.

### Communication
Status: **FAIL**

- Letter Box UI is using static/dummy data:
  - `frontend/src/pages/LetterBoxPage.tsx`.
- Communication logging exists in backend service:
  - `backend/src/modules/communication-logs/communication-log.service.ts`.
- No mounted API routes for communication logs were verified in global routes:
  - `backend/src/routes/index.ts`.

### Projects
Status: **FAIL**

- Project Kanban drag-to-stage backend update was not verified as functional.
- Stage source endpoint mismatch previously observed (`/project-stages` not found).
- Frontend uses fallback stage data when stage API is unavailable:
  - `frontend/src/features/projects/services/projects-service.ts`.

### Invoices
Status: **FAIL**

- Core invoice creation paths exist, but frontend has key gaps:
  - Partial-payment path marked TODO in UI logic: `frontend/src/pages/Invoice.tsx`.
  - Send-invoice action includes local optimistic behavior without complete backend confirmation flow in all branches.

### Error Handling
Status: **PARTIAL**

- Good usage of try/catch, toasts, and loading states in multiple areas.
- PARTIAL due to unresolved endpoint mismatches and integration failures not consistently surfaced with actionable recovery flows.

## Summary

Frontend aligned with backend: **NO**

## High-Impact Mismatches To Fix First

1. Align task status enums between frontend and backend.
2. Align quote status contract (`CONVERTED` vs Prisma enum values).
3. Implement or remove `/api/v1/projects/draft` mismatch.
4. Expose and integrate project stage API (`/api/v1/project-stages` or frontend endpoint update).
5. Replace Letter Box dummy data with backend communication log API and mount routes.
6. Implement full CONTACTED stage submission flow (UI form + DTO mapping + transition API).
