# Code Flow Diagram

This document outlines the high-level code flow and architecture of the YoursoftdigitalCRM application.

## Architecture Overview

```mermaid
graph TB
    A[User] --> B[Frontend (React/TypeScript)]
    B --> C[Backend API (ASP.NET Core)]
    C --> D[Database (SQLite)]
    B --> E[Browser Router]
    E --> F[Pages: Login, Dashboard, Clients, etc.]
    C --> G[Controllers: Auth, Clients, Projects, etc.]
    G --> H[Services]
    G --> I[Models]
    I --> J[Entity Framework DbContext]
    J --> D
```

## Login Flow Sequence Diagram

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (LoginPage)
    participant B as Backend (AuthController)
    participant DB as Database

    U->>F: Enter email/password
    F->>B: POST /api/auth/login
    B->>DB: Query User by email
    DB-->>B: Return user data
    B->>B: Verify password hash
    B-->>F: Return success/user info
    F->>F: Navigate to /dashboard
    F->>U: Show dashboard
```

## Dashboard Data Fetching Flow

```mermaid
sequenceDiagram
    participant F as Frontend (Index Page)
    participant B as Backend
    participant DB as Database

    F->>B: GET /api/projects
    B->>DB: Fetch projects
    DB-->>B: Projects data
    B-->>F: Projects JSON

    F->>B: GET /api/clients
    B->>DB: Fetch clients
    DB-->>B: Clients data
    B-->>F: Clients JSON

    F->>B: GET /api/invoices
    B->>DB: Fetch invoices
    DB-->>B: Invoices data
    B-->>F: Invoices JSON

    F->>F: Calculate stats and render dashboard
```

## Client Management Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend (ClientListPage)
    participant B as Backend (ClientsController)
    participant DB as Database

    U->>F: Navigate to /client-list
    F->>B: GET /api/clients
    B->>DB: Fetch all clients
    DB-->>B: Clients list
    B-->>F: Clients JSON
    F->>U: Display client list

    U->>F: Click Add Client
    F->>F: Show AddClientPage form
    U->>F: Fill form and submit
    F->>B: POST /api/clients
    B->>B: Validate model
    B->>DB: Insert new client
    DB-->>B: Success
    B-->>F: Created response
    F->>F: Navigate back to list
    F->>B: GET /api/clients (refresh)
    B->>DB: Fetch updated clients
    DB-->>B: Updated list
    B-->>F: Updated JSON
    F->>U: Show updated list
```

## Key Components

- **Frontend**: Built with React, TypeScript, Vite, Tailwind CSS
- **Backend**: ASP.NET Core Web API with Entity Framework Core
- **Database**: SQLite for development
- **Authentication**: Custom implementation with password hashing
- **Routing**: React Router for frontend navigation
- **State Management**: React Query for API state
- **UI Components**: Shadcn/ui components

## Data Models

- User: Authentication and user management
- Client: Customer information
- Project: Project tracking
- Invoice: Billing and payments
- Task: Kanban tasks
- And more...

This diagram provides a high-level view of the application's code flow. For detailed implementation, refer to the source code in the respective directories.