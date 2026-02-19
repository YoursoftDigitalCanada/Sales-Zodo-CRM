# ZODO CRM — System Design, Data Flow & Workflow

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser["🌐 Browser"]
        Mobile["📱 Mobile Browser"]
    end

    subgraph "Frontend — Vite + React"
        SPA["Single Page App"]
        Router["React Router DOM"]
        Pages["30+ Pages"]
        Components["Shared Components"]
        AI["AI Layer<br/>Copilot, Badges, FAB"]
        Axios["Axios HTTP Client"]
    end

    subgraph "Backend — Express.js"
        MW["Middleware Pipeline"]
        API["REST API v1<br/>/api/v1/*"]
        Modules["28 Feature Modules"]
        Guards["Auth + RBAC Guards"]
    end

    subgraph "Data Layer"
        PG["PostgreSQL<br/>47 Models via Prisma"]
        Redis["Redis<br/>Sessions · Rate Limits · Cache"]
    end

    subgraph "External Services"
        SMTP["Email / SMTP"]
        Storage["File Storage"]
    end

    Browser --> SPA
    Mobile --> SPA
    SPA --> Router --> Pages
    Pages --> Components
    Pages --> AI
    Pages --> Axios
    Axios -->|"HTTPS"| MW
    MW --> API --> Guards --> Modules
    Modules --> PG
    Modules --> Redis
    Modules --> SMTP
    Modules --> Storage
```

---

## 2. Backend Architecture

### 2.1 Middleware Pipeline (Request Lifecycle)

Every HTTP request passes through this ordered pipeline:

```mermaid
graph LR
    REQ["Incoming Request"] --> Helmet["🛡 Helmet<br/>Security Headers"]
    Helmet --> CORS["🔗 CORS<br/>Origin Validation"]
    CORS --> Parse["📦 Body Parser<br/>JSON · URL-encoded"]
    Parse --> Compress["📐 Compression<br/>gzip"]
    Compress --> ReqID["🏷 Request ID<br/>UUID Tracking"]
    ReqID --> Timer["⏱ Request Timing"]
    Timer --> Logger["📝 Request Logger"]
    Logger --> RateLimit["🚦 Rate Limiter"]
    RateLimit --> Route["🛣 Route Handler"]
    Route --> Error["❗ Error Handler"]
    Error --> RES["Response"]

    style Helmet fill:#1e293b,stroke:#22d3ee,color:#fff
    style CORS fill:#1e293b,stroke:#22d3ee,color:#fff
    style RateLimit fill:#1e293b,stroke:#f97316,color:#fff
    style Route fill:#0891b2,stroke:#22d3ee,color:#fff
```

### 2.2 Module Architecture (Layered Pattern)

Each of the 28 modules follows a consistent 5-layer pattern:

```mermaid
graph TB
    Routes["routes.ts<br/>Express Router · Validation"] --> Controller["controller.ts<br/>HTTP I/O · Status Codes"]
    Controller --> Manager["manager.ts<br/>Business Logic · Orchestration"]
    Manager --> Service["service.ts<br/>Data Transformation"]
    Service --> Repository["repository.ts<br/>Prisma Queries · DB Access"]

    Validators["validators.ts<br/>Zod Schemas"] -.->|"validates"| Routes
    DTO["dto.ts<br/>Type Definitions"] -.->|"shapes"| Controller

    style Routes fill:#0891b2,stroke:#22d3ee,color:#fff
    style Controller fill:#0e7490,stroke:#22d3ee,color:#fff
    style Manager fill:#155e75,stroke:#22d3ee,color:#fff
    style Service fill:#164e63,stroke:#22d3ee,color:#fff
    style Repository fill:#1e293b,stroke:#22d3ee,color:#fff
```

### 2.3 All 28 Backend Modules

| Domain | Modules |
|--------|---------|
| **Core** | `auth` |
| **CRM** | `leads`, `lead-sources`, `clients`, `contacts`, `groups` |
| **Users & Access** | `users`, `employees`, `roles`, `permissions`, `tenants` |
| **Operations** | `tasks`, `projects`, `calendar` |
| **Finance** | `invoices`, `expenses`, `bookings` |
| **Files** | `files`, `folders` |
| **Communication** | `emails`, `chat` |
| **Applications** | `applications` |
| **E-commerce** | `ecommerce` |
| **System** | `settings`, `analytics`, `notifications`, `tags`, `audit` |

---

## 3. Authentication & Authorization Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Frontend (React)
    participant MW as Middleware
    participant Auth as Auth Module
    participant DB as PostgreSQL
    participant R as Redis

    U->>FE: Enter credentials
    FE->>MW: POST /api/v1/auth/login
    MW->>MW: Rate Limit Check
    MW->>Auth: Forward to Controller
    Auth->>DB: Validate credentials (bcrypt)
    DB-->>Auth: User + Tenant + Role
    Auth->>Auth: Generate JWT (access + refresh)
    Auth->>R: Store refresh token
    Auth-->>FE: { tokens, user, permissions }
    FE->>FE: Store in localStorage
    
    Note over FE,MW: Subsequent Requests
    FE->>MW: GET /api/v1/leads (+ Bearer token)
    MW->>MW: 1. Auth Guard → Verify JWT
    MW->>MW: 2. Tenant Guard → Extract tenant
    MW->>MW: 3. Permission Guard → Check RBAC
    MW->>Auth: Authorized ✅
    Auth-->>FE: Response data
```

### Guard Chain (per request)

```
Request → Auth Guard → Tenant Guard → Permission Guard → Route Handler
           │               │                │
           ▼               ▼                ▼
        Verify JWT    Extract tenant    Check role has
        from header   from token        required permission
```

---

## 4. Data Model (Entity Relationship)

### 4.1 Core Entity Relationships

```mermaid
erDiagram
    Tenant ||--o{ User : "has many"
    Tenant ||--o{ Client : "has many"
    Tenant ||--o{ Lead : "has many"
    Tenant ||--o{ Project : "has many"
    Tenant ||--o{ Invoice : "has many"

    User ||--o{ Task : "assigned"
    User ||--o{ Lead : "owns"
    User ||--o{ Employee : "profile"
    User }o--|| Role : "has"
    Role ||--o{ RolePermission : "grants"
    RolePermission }o--|| Permission : "references"

    Client ||--o{ Invoice : "billed"
    Client ||--o{ Project : "owns"
    Client ||--o{ Contact : "has"
    Client ||--o{ ClientGroupMember : "belongs to"

    Lead ||--o{ LeadActivity : "timeline"
    Lead ||--o{ LeadTag : "tagged"
    Lead }o--|| LeadSource : "from"

    Project ||--o{ Task : "contains"
    Project ||--o{ ProjectMember : "team"

    Task ||--o{ TaskTag : "tagged"

    Invoice ||--o{ InvoiceItem : "line items"
    Invoice ||--o{ InvoicePayment : "payments"
```

### 4.2 All 47 Database Models

| Category | Models |
|----------|--------|
| **Multi-Tenancy** | `Tenant`, `TenantSettings` |
| **Identity** | `User`, `RefreshToken`, `Employee`, `UserPreferences` |
| **Access Control** | `Role`, `Permission`, `RolePermission` |
| **CRM** | `Lead`, `LeadSource`, `LeadTag`, `LeadActivity`, `Client`, `Contact`, `ClientGroup`, `ClientGroupMember`, `Application` |
| **Operations** | `Task`, `TaskTag`, `Project`, `ProjectMember`, `CalendarEvent`, `CalendarEventAttendee` |
| **Finance** | `Invoice`, `InvoiceItem`, `InvoicePayment`, `Expense`, `ExpenseBudget`, `Booking` |
| **Files** | `Folder`, `File`, `FileTag` |
| **E-commerce** | `ProductCategory`, `Product`, `Order`, `OrderItem` |
| **Communication** | `Email`, `EmailLabel`, `EmailLabelAssignment`, `EmailAttachment`, `ChatRoom`, `ChatParticipant`, `ChatMessage` |
| **System** | `Notification`, `AuditLog`, `Tag` |

---

## 5. Frontend Architecture

### 5.1 Component Hierarchy

```mermaid
graph TB
    App["App.tsx<br/>QueryClient · Router · Toasts"]
    App --> Routes["Routes"]
    App --> FAB["GlobalAiFloatingButton<br/>AI Copilot (all pages)"]

    Routes --> Public["Public Routes"]
    Routes --> Protected["Protected Routes"]

    Public --> Landing["LandingPage"]
    Public --> Login["LoginPage"]
    Public --> Signup["SignupPage"]

    Protected --> Dashboard["Dashboard<br/>Stats · AI Summary · Quick Actions"]
    Protected --> LeadsPage["Leads<br/>Pipeline · Cards · Table"]
    Protected --> ClientsPage["Clients<br/>List · Detail · Groups"]
    Protected --> TasksPage["Tasks<br/>List · Kanban · Calendar"]
    Protected --> ProjectsPage["Projects<br/>Board · Detail · Add"]
    Protected --> More["+ 20 more pages..."]

    Dashboard --> Sidebar["Sidebar<br/>Navigation · 28 Menu Items"]
    Dashboard --> StatCard["StatCards<br/>AI Insights"]
    Dashboard --> Copilot["AiCopilotPanel<br/>Chat · Quick Prompts"]

    style App fill:#0891b2,stroke:#22d3ee,color:#fff
    style FAB fill:#155e75,stroke:#22d3ee,color:#fff
    style Copilot fill:#155e75,stroke:#22d3ee,color:#fff
```

### 5.2 AI Layer Architecture

```mermaid
graph TB
    subgraph "AI Components"
        FAB["GlobalAiFloatingButton<br/>Bottom-right FAB"]
        Panel["AiCopilotPanel<br/>Slide-out Chat"]
        Badge["AiInsightBadge<br/>Inline Insight Pills"]
        Summary["AiSummaryCard<br/>AI Summary Block"]
    end

    subgraph "AI Insight Functions"
        LeadFn["getLeadInsights()"]
        ClientFn["getClientInsights()"]
        TaskFn["getTaskInsights()"]
    end

    subgraph "Integrated Pages"
        Dash["Dashboard"]
        Leads["Leads"]
        Clients["Clients"]
        Tasks["Tasks"]
    end

    FAB --> Panel
    Dash --> Panel
    Dash --> Summary

    Leads --> Badge
    Clients --> Badge
    Tasks --> Badge

    Badge --> LeadFn
    Badge --> ClientFn
    Badge --> TaskFn

    style FAB fill:#0891b2,stroke:#22d3ee,color:#fff
    style Panel fill:#0891b2,stroke:#22d3ee,color:#fff
    style Badge fill:#155e75,stroke:#22d3ee,color:#fff
```

---

## 6. Key Workflows

### 6.1 Lead-to-Client Conversion

```mermaid
stateDiagram-v2
    [*] --> New: Lead Created
    New --> Contacted: First Outreach
    Contacted --> Qualified: Meets Criteria
    Qualified --> Proposal: Send Proposal
    Proposal --> Negotiation: Client Interested
    Negotiation --> Won: Deal Closed ✅
    Negotiation --> Lost: Deal Lost ❌
    Won --> [*]: Convert to Client

    note right of Qualified
        AI Badge: "Hot Lead" 
        if score >= 80
    end note

    note right of Won
        Auto-create Client
        Attach Invoices
    end note
```

### 6.2 Task Lifecycle

```mermaid
stateDiagram-v2
    [*] --> TODO: Task Created
    TODO --> IN_PROGRESS: Start Work
    IN_PROGRESS --> REVIEW: Submit for Review
    REVIEW --> DONE: Approved ✅
    REVIEW --> IN_PROGRESS: Needs Changes
    DONE --> [*]

    note right of TODO
        AI Badge: "Overdue"
        if past due date
    end note

    note right of IN_PROGRESS
        Assignees fetched
        from /users API
    end note
```

### 6.3 Invoice Workflow

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Create Invoice
    DRAFT --> SENT: Send to Client
    SENT --> VIEWED: Client Opens
    VIEWED --> PARTIALLY_PAID: Partial Payment
    PARTIALLY_PAID --> PAID: Full Payment ✅
    VIEWED --> PAID: Full Payment ✅
    SENT --> OVERDUE: Past Due Date ⚠️
    OVERDUE --> PAID: Late Payment

    note right of DRAFT
        Line items, taxes,
        discounts added
    end note
```

### 6.4 Project Workflow

```mermaid
stateDiagram-v2
    [*] --> PLANNING: Project Created
    PLANNING --> ACTIVE: Kickoff
    ACTIVE --> ON_HOLD: Paused
    ON_HOLD --> ACTIVE: Resume
    ACTIVE --> COMPLETED: All Tasks Done ✅
    COMPLETED --> ARCHIVED: Archive
    ACTIVE --> CANCELLED: Cancelled ❌
```

---

## 7. Data Flow Diagram

### 7.1 Request/Response Flow

```mermaid
flowchart LR
    subgraph "Browser"
        UI["React UI"]
    end

    subgraph "Network"
        HTTPS["HTTPS / TLS"]
    end

    subgraph "Express Server"
        direction TB
        MW1["Security<br/>Helmet · CORS"]
        MW2["Parsing<br/>JSON · Compression"]
        MW3["Tracking<br/>Request ID · Logger"]
        MW4["Protection<br/>Rate Limiter"]
        MW5["Auth<br/>JWT Verify · Tenant · RBAC"]
        Handler["Route Handler"]
    end

    subgraph "Data"
        PG["PostgreSQL"]
        RD["Redis"]
    end

    UI -->|"API Call"| HTTPS
    HTTPS --> MW1 --> MW2 --> MW3 --> MW4 --> MW5 --> Handler
    Handler <--> PG
    Handler <--> RD
    Handler -->|"JSON Response"| UI
```

### 7.2 Multi-Tenant Data Isolation

```mermaid
flowchart TB
    Request["API Request + JWT"] --> Extract["Extract tenantId from token"]
    Extract --> Filter["Prisma: WHERE tenantId = ?"]
    Filter --> Result["Only tenant's data returned"]

    style Filter fill:#dc2626,stroke:#fca5a5,color:#fff
```

Every database query is automatically scoped to the authenticated user's tenant, ensuring complete data isolation between organizations.

---

## 8. Deployment Architecture

```mermaid
graph TB
    subgraph "DNS — Cloudflare"
        DNS["zodo.ca<br/>crm.zodo.ca<br/>api.zodo.ca"]
    end

    subgraph "VPS"
        Nginx["Nginx<br/>Reverse Proxy · SSL"]

        subgraph "Applications"
            FE_App["Frontend<br/>:8080<br/>Vite Dev / Static Build"]
            BE_App["Backend<br/>:3000<br/>Express.js"]
        end

        subgraph "Services"
            PG_DB["PostgreSQL<br/>:5432"]
            Redis_DB["Redis<br/>:6379"]
        end
    end

    DNS --> Nginx
    Nginx -->|"crm.zodo.ca"| FE_App
    Nginx -->|"api.zodo.ca"| BE_App
    BE_App --> PG_DB
    BE_App --> Redis_DB
```

---

## 9. Tech Stack Summary

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vite, React 18, TypeScript, TailwindCSS, shadcn/ui, Framer Motion |
| **State Management** | React Query (TanStack), React Hooks |
| **HTTP Client** | Axios (with interceptors for auth) |
| **Backend** | Node.js, Express.js, TypeScript |
| **ORM** | Prisma (type-safe queries, migrations) |
| **Database** | PostgreSQL |
| **Caching** | Redis |
| **Authentication** | JWT (access + refresh tokens), bcrypt |
| **Authorization** | RBAC (Role-Based Access Control) with permission guards |
| **Multi-Tenancy** | Tenant ID in JWT, row-level data isolation |
| **Validation** | Zod (backend), HTML5 + React state (frontend) |
| **Security** | Helmet, CORS, Rate Limiting, Request ID tracking |
| **API Docs** | Swagger / OpenAPI (dev only) |
| **Deployment** | VPS, Nginx, SSL via Let's Encrypt |
| **AI Layer** | Client-side heuristics (future: LLM integration) |
