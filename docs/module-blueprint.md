# ZODO CRM Module Blueprint

This document is a product and UI blueprint of the current ZODO CRM module structure based on the live frontend routes and page composition in the codebase.

It is intended to answer:
- what modules exist
- how they are grouped in the workspace
- what sub-pages belong to each module
- how a module page is structured
- how the Clients module is built in detail

## 1. Workspace Module Map

| Section | Module | Sub-pages / Sub-modules | Primary Route |
| --- | --- | --- | --- |
| Main | Dashboard | Overview dashboard | `/dashboard` |
| Main | Calendar | Calendar workspace | `/calendar` |
| Main | Tasks | Task workspace | `/tasks` |
| CRM | Leads | All Leads, Pipeline, Lead Sources | `/leads`, `/leads/pipeline`, `/leads/sources` |
| CRM | Clients | Client List, Client Contacts, Client Groups | `/client-list`, `/contacts`, `/clients/groups` |
| Jobs | All Jobs | Active Jobs, Archived, Templates | `/projects` |
| Jobs | Kanban Board | Job board | `/kanban` |
| Jobs | File Manager | File repository | `/filemanager` |
| Finance | Invoices | All Invoices, Create Invoice, Recurring | `/invoice`, `/invoice/create` |
| Finance | Quotes | Quote / estimate workspace | `/quotes` |
| Finance | Payments | All Payments, Payment Methods, Transactions | placeholder / coming later |
| Business | AI Roof Estimator | Estimator dashboard | `/roof-estimator` |
| Business | Inspections | Inspection workspace | `/inspections` |
| Business | Insurance Claims | Coming soon | placeholder |
| Communication | Letter Box | Mailbox | `/letterbox` |
| Communication | Chats | Internal chat | `/chats` |
| Communication | Support | Tickets, Knowledge Base, FAQ | `/support/tickets`, `/support/knowledge-base`, `/support/faq` |
| Communication | Notifications | Notification center | `/notifications` |
| Team | Employees | All Employees, Departments, Attendance, Leave Requests | `/employees`, `/employees/departments`, `/employees/attendance`, `/employees/leave-requests` |
| Team | Users | Workspace users | `/users` |
| Team | Roles & Permissions | Role management | `/roles` |
| Analytics | Reports | Coming soon in sidebar | placeholder |
| Analytics | Analytics | Coming soon in sidebar | placeholder |
| Settings | Settings | General, Company Profile, Billing, Email Settings, Security, Integrations | `/settings/general`, `/settings/company`, `/settings/billing`, `/settings/email`, `/settings/security`, `/settings/integrations/whatsapp` |
| Settings | Integrations | Integration hub | `/integrations` |
| Settings | Help Center | Help docs and support entry | `/help` |

## 2. Shared Module Page Blueprint Pattern

Most major CRM modules follow this UI architecture:

| Layer | Purpose | Typical Contents |
| --- | --- | --- |
| Sticky module header | Fast orientation and quick actions | Breadcrumb, primary CTA, notification bell, current user chip |
| Hero / intro block | Explain the module and summarize volume | Module label, big title, short description, quick actions like export/import |
| KPI cards | Immediate status snapshot | 4 to 5 metric cards tied to the module |
| Toolbar | Working controls for list management | Search, filters, clear, bulk actions, column toggle, view toggle, refresh |
| Main content | Core data interaction area | Table view, grid view, empty state, loading state |
| Pagination / footer tools | Navigation through larger datasets | Result counts, page size, page controls |
| Dialogs / drawers | Create, edit, confirm, inspect | Form dialogs, detail dialogs, delete confirmations, member management |

## 3. Detailed Blueprint: Clients Module

### 3.1 Module Goal

The Clients module is the customer relationship area for existing customers and related people/grouping.

It is split into 3 parts:
- Client List
- Client Contacts
- Client Groups

These three pages work as one connected module:
- Client List manages company/customer records
- Client Contacts manages people attached to clients or lead/client entities
- Client Groups segments clients for organization and targeting

### 3.2 Route Map

| Page | Route | Purpose |
| --- | --- | --- |
| Client List | `/client-list` | Main client directory |
| Add Client | `/client-list/add` | New client creation |
| Client Detail | `/client-list/:id` | Single client detail page |
| Edit Client | `/client-list/:id/edit` | Update an existing client |
| Client Contacts | `/contacts` | Contact directory tied to client ecosystem |
| Client Groups | `/clients/groups` | Grouping and segmentation of clients |

### 3.3 Module Relationships

| Source Page | Action | Destination |
| --- | --- | --- |
| Client List | Add Client | `/client-list/add` |
| Client List | View client | `/client-list/:id` |
| Client List | Edit client | `/client-list/:id/edit` |
| Client Contacts | View related client | `/client-list/:clientId` |
| Client Groups | Manage members | Group member management dialog |
| Client Groups | View group | Group detail dialog |

## 4. Client List Blueprint

Source page: `frontend/src/pages/ClientList.tsx`

### 4.1 Page Structure

| Zone | Contents |
| --- | --- |
| Sticky header | Breadcrumb `Dashboard > Clients`, `Add Client` CTA, notification bell, signed-in user identity block |
| Hero block | `Client Management` label, `Client Directory` title, client count summary, Export and Import actions |
| KPI row | Total Clients, Active Clients, Total Revenue, Outstanding |
| Toolbar | Search, Status filter, Category filter, advanced filter toggle, clear filters, bulk delete, column visibility, table/grid toggle, refresh |
| Data view | Table view or Grid view |
| States | Loading state, empty state, filtered-empty state |
| Footer | Result count, page size selector, pagination controls |

### 4.2 Header Blueprint

| Element | Behavior |
| --- | --- |
| Dashboard breadcrumb | Returns to dashboard |
| Add Client | Opens create-client flow |
| Notification bell | Global notifications entry |
| User identity block | Shows current workspace user name and avatar initials |

### 4.3 Hero Blueprint

| Element | Purpose |
| --- | --- |
| `Client Management` eyebrow | Module context label |
| `Client Directory` title | Main page title |
| Database count sentence | Reinforces total client volume |
| Export dropdown | CSV, Excel, PDF export actions |
| Import button | Entry point for imports |

### 4.4 KPI Cards

| Card | Meaning |
| --- | --- |
| Total Clients | All registered clients |
| Active Clients | Active client count and ratio |
| Total Revenue | Lifetime earnings tied to clients |
| Outstanding | Pending unpaid balance |

### 4.5 Toolbar Blueprint

| Control | Function |
| --- | --- |
| Search clients | Text search across client records |
| Status filter | Filter clients by status |
| Category filter | Filter clients by category |
| Filters button | Shows active filter count and expands advanced filtering behavior |
| Clear button | Resets search and filters |
| Bulk selection chip | Appears when rows are selected |
| Bulk Delete | Deletes selected clients |
| Columns | Toggle visible columns in table view |
| Table/Grid toggle | Swap between table and card layout |
| Refresh | Re-fetch client list |

### 4.6 Content Blueprint

| Mode | Behavior |
| --- | --- |
| Loading | Spinner-centered loading state |
| Empty | Prompts user to add first client |
| Filtered empty | Prompts user to clear filters |
| Table view | Selectable rows, sortable columns, row actions |
| Grid view | Card layout with selection and actions |

### 4.7 Table/Grid Actions

| Action | Purpose |
| --- | --- |
| Select row/card | Enables bulk actions |
| Toggle favorite | Marks client as favorite |
| View | Opens client detail |
| Edit | Opens edit screen |
| Delete | Opens delete confirmation |

## 5. Client Contacts Blueprint

Source page: `frontend/src/pages/ClientContactList.tsx`

### 5.1 Page Structure

| Zone | Contents |
| --- | --- |
| Sticky header | Breadcrumb `Dashboard > Contacts`, `Add Contact` CTA, notification bell, user identity block |
| Hero block | `Contact Management` label, `Client Contacts` title, contact count summary, Export and Import actions |
| KPI row | Total Contacts, Client Contacts, Lead Contacts, Primary Contacts |
| Toolbar | Search, Type filter, clear, bulk actions, columns, table/grid toggle, refresh |
| Data view | Table view or Grid view |
| States | Loading, empty, filtered-empty |
| Footer | Result count, page size, pagination |

### 5.2 KPI Cards

| Card | Meaning |
| --- | --- |
| Total Contacts | Total contact records |
| Client Contacts | Contacts tied to clients |
| Lead Contacts | Contacts tied to leads / prospects |
| Primary Contacts | Main contact people |

### 5.3 Contact Actions

| Action | Purpose |
| --- | --- |
| Add Contact | Open create dialog |
| Edit Contact | Open edit dialog |
| Delete Contact | Open delete confirmation |
| View Related Client | Open linked client detail |
| Send Email | Open mailto flow |
| Call | Open tel flow |
| Toggle favorite | Mark contact as favorite |

### 5.4 Dialog Blueprint

| Dialog | Purpose |
| --- | --- |
| Contact form dialog | Create or edit contact |
| Delete dialog | Confirm removal |

## 6. Client Groups Blueprint

Source page: `frontend/src/pages/ClientGroups.tsx`

### 6.1 Page Structure

| Zone | Contents |
| --- | --- |
| Sticky header | Breadcrumb `Dashboard > Clients > Groups`, Import, Export, Create Group |
| KPI row | Total Groups, Total Clients, Avg Group Size, Total Revenue, Top Group |
| Filter bar | Search groups, Type filter, Sort dropdown, Clear, Grid/List toggle |
| Content | Group grid cards or list table |
| States | Empty state or populated view |
| Footer | Result count summary |
| Dialog stack | Group form, group detail, manage members, delete confirmation |

### 6.2 KPI Cards

| Card | Meaning |
| --- | --- |
| Total Groups | Number of client groups |
| Total Clients | Clients assigned across groups |
| Avg Group Size | Average members per group |
| Total Revenue | Revenue represented by grouped clients |
| Top Group | Highest-performing group |

### 6.3 Group Actions

| Action | Purpose |
| --- | --- |
| Create Group | Open group form |
| Edit Group | Update existing group |
| Delete Group | Remove group while preserving clients |
| Manage Members | Assign or remove clients from a group |
| View Group | Open details dialog |
| Import / Export | Bulk operations for group data |

### 6.4 Dialog Blueprint

| Dialog | Purpose |
| --- | --- |
| GroupFormDialog | Create or edit a group |
| GroupDetailsDialog | Inspect group summary and next actions |
| ManageMembersDialog | Manage client membership |
| Delete confirmation | Confirm destructive delete |

## 7. Clients Module Information Architecture

```text
Clients
├── Client List
│   ├── Add Client
│   ├── Client Detail
│   └── Edit Client
├── Client Contacts
│   ├── Add Contact
│   ├── Edit Contact
│   ├── Call Contact
│   └── Email Contact
└── Client Groups
    ├── Create Group
    ├── Group Details
    ├── Manage Members
    └── Delete Group
```

## 8. Blueprint Rules for Future Module Docs

Use this same breakdown for every other module:

| Step | What to document |
| --- | --- |
| 1 | Module purpose |
| 2 | Routes and sub-pages |
| 3 | Header actions |
| 4 | Hero / summary section |
| 5 | KPI cards |
| 6 | Toolbar controls |
| 7 | Main content states |
| 8 | Primary actions and dialogs |
| 9 | Cross-links to other modules |

## 9. Source Files Used

| Area | Source File |
| --- | --- |
| Sidebar module tree | `frontend/src/components/Sidebar.tsx` |
| Route map | `frontend/src/App.tsx` |
| Client List blueprint | `frontend/src/pages/ClientList.tsx` |
| Client Contacts blueprint | `frontend/src/pages/ClientContactList.tsx` |
| Client Groups blueprint | `frontend/src/pages/ClientGroups.tsx` |

