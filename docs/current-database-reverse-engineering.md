# Current CRM Database Reverse Engineering

## 1. DATABASE OVERVIEW

This is a multi-tenant SaaS CRM with strong roofing / field-service customization layered on top of a general CRM core. It combines classic CRM entities (tenants, users, employees, leads, clients, contacts, tasks, quotes, invoices) with roofing-specific operational modules (roof estimates, inspections, project photos, insurance-claim fields, crew/time tracking, job completion, materials, labor, construction estimating).

Architecturally it is a relational PostgreSQL schema with selective hybrid patterns: high-value entities are normalized and connected through foreign keys, while several workflow-heavy areas store flexible data in Json / array columns (preferences, settings, attachments, tags, contractSnapshot, auditTrail, responses, photos, sharedWith, etc.). That makes it a relational core with app-level document-style extensions.

Live production signal from the current database shows the busiest tables are Notification (11688 rows), AuditLog (3688), RefreshToken (628), Task (3104), Lead (67), InvoiceItem (134), RolePermission (5200), and tenant config tables such as TenantSettings (14). This tells us the system is actively used as a CRM + workflow + notification engine, not just a static admin panel.

Core entities:
- Tenant: the workspace / company boundary
- User: login identity
- Employee: tenant-scoped staff persona attached to a user
- Role / Permission: tenant RBAC
- Lead, Client, Project: customer lifecycle spine
- Task, CalendarEvent, Notification, AuditLog: execution + operational visibility
- Quote, Invoice, Payment, Contract: revenue pipeline
- RoofEstimate, LeadInspection, ConstructionEstimate: roofing specialization

## 2. TABLE-BY-TABLE BREAKDOWN

### Table: Tenant

Live production rows (approx): 14

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- slug (String) -> application data field
- domain (String?) -> application data field
- status (TenantStatus) -> lifecycle or workflow status
- logo (String?) -> application data field
- settings (Json) -> Settings stored as JSON for flexibility
- fileStorageQuota (BigInt) -> Storage quotas 5GB
- fileStorageUsed (BigInt) -> application data field
- emailStorageQuota (BigInt) -> 1GB
- emailStorageUsed (BigInt) -> application data field
- subscriptionTier (String) -> Subscription info (basic - extend as needed)
- subscriptionExpiresAt (DateTime?) -> application data field
- onboardingCompleted (Boolean) -> Onboarding lifecycle flag — set TRUE only after seedTenant() completes
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- users (User[]) -> Relations
- employees (Employee[]) -> array field
- roles (Role[]) -> array field
- leads (Lead[]) -> array field
- clients (Client[]) -> array field
- contacts (Contact[]) -> array field
- clientGroups (ClientGroup[]) -> array field
- applications (Application[]) -> array field
- tasks (Task[]) -> array field
- taskTags (TaskTag[]) -> array field
- projects (Project[]) -> array field
- calendarEvents (CalendarEvent[]) -> array field
- calendarEventAttendees (CalendarEventAttendee[]) -> array field
- files (File[]) -> array field
- folders (Folder[]) -> array field
- invoices (Invoice[]) -> array field
- invoiceItems (InvoiceItem[]) -> array field
- expenses (Expense[]) -> array field
- expenseBudgets (ExpenseBudget[]) -> array field
- bookings (Booking[]) -> array field
- services (Service[]) -> array field
- products (Product[]) -> array field
- productCategories (ProductCategory[]) -> array field
- orders (Order[]) -> array field
- emails (Email[]) -> array field
- communicationLogs (CommunicationLog[]) -> array field
- emailLabels (EmailLabel[]) -> array field
- chatRooms (ChatRoom[]) -> array field
- notifications (Notification[]) -> array field
- auditLogs (AuditLog[]) -> array field
- leadSources (LeadSource[]) -> array field
- tags (Tag[]) -> array field
- roofEstimates (RoofEstimate[]) -> array field
- roofData (RoofData[]) -> array field
- solarRoofData (SolarRoofData[]) -> array field
- roofMaterials (RoofMaterial[]) -> array field
- roofTakeoffs (RoofTakeoff[]) -> array field
- roofLaborRates (RoofLaborRate[]) -> array field
- payments (InvoicePayment[]) -> array field
- quotes (Quote[]) -> array field
- quoteItems (QuoteItem[]) -> array field
- contracts (Contract[]) -> array field
- leadInspections (LeadInspection[]) -> array field
- leadInsuranceClaims (LeadInsuranceClaim[]) -> array field
- leadContactedDetails (LeadContactedDetails[]) -> array field
- userAccesses (UserAccess[]) -> array field
- timeEntries (TimeEntry[]) -> array field
- jobNotes (JobNote[]) -> array field
- crewNotifications (CrewNotification[]) -> array field
- checklistTemplates (ChecklistTemplate[]) -> array field
- checklistSubmissions (ChecklistSubmission[]) -> array field
- jobPhotos (JobPhoto[]) -> array field
- jobMessages (JobMessage[]) -> array field
- equipment (Equipment[]) -> array field
- materialRequests (MaterialRequest[]) -> array field
- incidentReports (IncidentReport[]) -> array field
- leaveRequests (LeaveRequest[]) -> array field
- employeeDocuments (EmployeeDocument[]) -> array field
- jobCompletions (JobCompletion[]) -> array field
- proposals (Proposal[]) -> array field
- signedContracts (SignedContract[]) -> array field
- constructionEstimates (ConstructionEstimate[]) -> array field
- supportTickets (SupportTicket[]) -> array field
- wallets (Wallet[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- None detected

### Table: User

Live production rows (approx): 24

Columns:
- id (String) -> primary identifier
- email (String) -> email address
- passwordHash (String) -> application data field
- firstName (String) -> application data field
- lastName (String) -> application data field
- avatar (String?) -> application data field
- phone (String?) -> phone number
- status (UserStatus) -> lifecycle or workflow status
- emailVerified (Boolean) -> application data field
- emailVerifiedAt (DateTime?) -> application data field
- lastLoginAt (DateTime?) -> application data field
- passwordChangedAt (DateTime?) -> application data field
- preferences (Json) -> Preferences stored as JSON
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- tenantId (String?) -> Tenant relation (optional - user can exist without tenant initially)
- refreshTokens (RefreshToken[]) -> Relations
- employees (Employee[]) -> array field
- auditLogs (AuditLog[]) -> array field
- notifications (Notification[]) -> array field
- mailboxEmails (Email[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: RefreshToken

Live production rows (approx): 628

Columns:
- id (String) -> primary identifier
- token (String) -> token used for auth/integration/public access
- userId (String) -> reference to related user
- expiresAt (DateTime) -> application data field
- createdAt (DateTime) -> record creation timestamp
- revokedAt (DateTime?) -> application data field
- replacedBy (String?) -> For token rotation
- userAgent (String?) -> application data field
- ipAddress (String?) -> application data field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- userId -> User.id

### Table: Employee

Live production rows (approx): 22

Columns:
- id (String) -> primary identifier
- employeeNumber (String?) -> Optional employee ID/number
- department (String?) -> application data field
- position (String?) -> application data field
- hireDate (DateTime?) -> application data field
- isActive (Boolean) -> application data field
- employmentStatus (String) -> application data field
- employmentType (String) -> application data field
- salary (Float?) -> application data field
- profileData (Json) -> flexible JSON payload / denormalized metadata
- tenantId (String) -> Tenant relation (REQUIRED for employees)
- userId (String) -> User relation
- roleId (String) -> Role relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- assignedLeads (Lead[]) -> Relations
- createdLeads (Lead[]) -> array field
- assignedClients (Client[]) -> array field
- assignedTasks (Task[]) -> array field
- createdTasks (Task[]) -> array field
- projectMembers (ProjectMember[]) -> array field
- createdInvoices (Invoice[]) -> array field
- createdExpenses (Expense[]) -> array field
- approvedExpenses (Expense[]) -> array field
- assignedBookings (Booking[]) -> array field
- sentEmails (Email[]) -> array field
- chatParticipations (ChatParticipant[]) -> array field
- calendarEvents (CalendarEvent[]) -> array field
- eventAttendees (CalendarEventAttendee[]) -> array field
- createdQuotes (Quote[]) -> array field
- createdContracts (Contract[]) -> array field
- timeEntries (TimeEntry[]) -> array field
- jobNotes (JobNote[]) -> array field
- crewNotifications (CrewNotification[]) -> array field
- checklistSubmissions (ChecklistSubmission[]) -> array field
- locationPings (LocationPing[]) -> array field
- jobPhotos (JobPhoto[]) -> array field
- sentMessages (JobMessage[]) -> array field
- assignedEquipment (Equipment[]) -> array field
- materialRequests (MaterialRequest[]) -> array field
- incidentReports (IncidentReport[]) -> array field
- leaveRequests (LeaveRequest[]) -> array field
- reviewedLeaves (LeaveRequest[]) -> array field
- availability (Availability[]) -> array field
- employeeDocuments (EmployeeDocument[]) -> array field
- jobCompletions (JobCompletion[]) -> array field
- createdProposals (Proposal[]) -> array field
- userAccesses (UserAccess[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id
- userId -> User.id
- roleId -> Role.id

### Table: Role

Live production rows (approx): 51

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- description (String?) -> freeform description
- isSystemRole (Boolean) -> Owner, Admin, etc. cannot be deleted
- isDefault (Boolean) -> Default role for new employees
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- employees (Employee[]) -> Relations
- permissions (RolePermission[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: Permission

Live production rows (approx): 137

Columns:
- id (String) -> primary identifier
- code (String) -> e.g., "leads.view", "leads.create"
- name (String) -> display name
- description (String?) -> freeform description
- module (String) -> e.g., "leads", "clients", "invoices"
- action (String) -> e.g., "view", "create", "update", "delete"
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- roles (RolePermission[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- None detected

### Table: RolePermission

Live production rows (approx): 5200

Columns:
- id (String) -> primary identifier
- roleId (String) -> reference to related role
- permissionId (String) -> reference to related permission
- constraints (Json?) -> Optional constraints (for future use) e.g., {"ownOnly": true}
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- roleId -> Role.id
- permissionId -> Permission.id

### Table: UserAccess


Columns:
- id (String) -> primary identifier
- employeeId (String) -> reference to related employee
- clientId (String?) -> reference to related client
- projectId (String?) -> reference to related project
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- employeeId -> Employee.id
- tenantId -> Tenant.id

### Table: LeadSource

Live production rows (approx): 118

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- slug (String?) -> application data field
- description (String?) -> freeform description
- isActive (Boolean) -> application data field
- sourceType (LeadSourceType) -> Type & Category
- category (LeadSourceCategory) -> application data field
- icon (String?) -> icon name for UI
- color (String?) -> hex color for UI
- integrationStatus (IntegrationStatus) -> Integration
- integrationConfig (Json?) -> platform-specific config (page IDs, form IDs, etc.)
- webhookUrl (String?) -> auto-generated webhook URL
- webhookSecret (String?) -> for signature verification
- apiEndpoint (String?) -> optional custom endpoint
- accessToken (String?) -> OAuth (encrypted at app level)
- refreshToken (String?) -> token used for auth/integration/public access
- tokenExpiresAt (DateTime?) -> token used for auth/integration/public access
- tokenScopes (String[]) -> token used for auth/integration/public access
- externalAccountId (String?) -> reference to related externalAccount
- externalAccountName (String?) -> application data field
- costPerLead (Decimal?) -> Cost Tracking
- monthlyBudget (Decimal?) -> application data field
- autoSyncCost (Boolean) -> application data field
- autoAssign (Boolean) -> Assignment Rules
- assignmentMethod (AssignmentMethod) -> application data field
- assignedUserId (String?) -> reference to related assignedUser
- assignedTeamId (String?) -> reference to related assignedTeam
- territoryRules (Json?) -> zip code mapping, etc.
- sendWelcomeEmail (Boolean) -> Automation
- welcomeEmailTemplateId (String?) -> reference to related welcomeEmailTemplate
- sendWelcomeSms (Boolean) -> application data field
- welcomeSmsTemplateId (String?) -> reference to related welcomeSmsTemplate
- createFollowupTask (Boolean) -> application data field
- followupDelayMinutes (Int) -> application data field
- notifyAssignee (Boolean) -> application data field
- notificationChannels (String[]) -> array field
- fieldMapping (Json?) -> Field Mapping maps external fields -> CRM fields
- defaultValues (Json?) -> default values for unmapped fields
- totalLeads (Int) -> Cached Statistics
- convertedLeads (Int) -> application data field
- totalRevenue (Decimal?) -> application data field
- lastLeadAt (DateTime?) -> application data field
- statsUpdatedAt (DateTime?) -> application data field
- status (LeadSourceStatus) -> Source Status
- lastSyncAt (DateTime?) -> application data field
- lastError (String?) -> application data field
- lastErrorAt (DateTime?) -> application data field
- errorCount (Int) -> application data field
- tenantId (String) -> Tenant & Timestamps
- createdById (String?) -> reference to related createdBy
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- leads (Lead[]) -> Relations
- credentials (LeadSourceCredential[]) -> array field
- webhooks (LeadSourceWebhook[]) -> array field
- logs (LeadSourceLog[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: LeadSourceCredential

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- leadSourceId (String) -> reference to related leadSource
- credentialKey (String) -> e.g. 'api_key', 'client_id', 'client_secret'
- credentialValue (String) -> encrypted with AES-256
- credentialType (String) -> api_key, oauth_token, secret, password
- expiresAt (DateTime?) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- leadSourceId -> LeadSource.id

### Table: LeadSourceWebhook

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- leadSourceId (String) -> reference to related leadSource
- externalWebhookId (String?) -> webhook ID from external platform
- webhookUrl (String) -> application data field
- webhookSecret (String) -> application data field
- verifyToken (String?) -> for verification challenges
- subscribedEvents (String[]) -> array field
- status (String) -> pending, active, failed, disabled
- failureCount (Int) -> application data field
- lastTriggeredAt (DateTime?) -> application data field
- lastSuccessAt (DateTime?) -> application data field
- lastFailureAt (DateTime?) -> application data field
- lastFailureReason (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- leadSourceId -> LeadSource.id

### Table: LeadSourceLog

Live production rows (approx): 1

Columns:
- id (String) -> primary identifier
- leadSourceId (String) -> reference to related leadSource
- eventType (String) -> webhook_received, lead_created, lead_duplicate, connection_test, error, etc.
- status (String) -> success, failed, pending, skipped
- direction (String) -> inbound, outbound
- requestPayload (Json?) -> sanitized — no sensitive data
- responsePayload (Json?) -> application data field
- errorMessage (String?) -> application data field
- processingTimeMs (Int?) -> application data field
- leadId (String?) -> if a lead was created
- ipAddress (String?) -> application data field
- userAgent (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- leadSourceId -> LeadSource.id

### Table: Lead

Live production rows (approx): 67

Columns:
- id (String) -> primary identifier
- leadNumber (String?) -> Auto-generated: LD-YYYY-0001
- firstName (String) -> Basic Info
- lastName (String) -> application data field
- email (String?) -> email address
- phone (String?) -> phone number
- location (String?) -> application data field
- companyName (String?) -> Company Info
- jobTitle (String?) -> application data field
- website (String?) -> application data field
- status (LeadStatus) -> Lead Classification
- temperature (LeadTemperature) -> application data field
- lifecycleStage (LeadLifecycleStage) -> application data field
- potentialValue (Decimal?) -> application data field
- leadSourceId (String?) -> Source
- assignedToId (String?) -> Assignment
- notes (String?) -> Notes
- convertedAt (DateTime?) -> Conversion tracking
- convertedToClientId (String?) -> reference to related convertedToClient
- propertyAddress (String?) -> ── Stage 1: Property Info ─────────────────────────────────────────────
- city (String?) -> application data field
- state (String?) -> application data field
- zipCode (String?) -> application data field
- propertyType (String?) -> Residential, Commercial, Multi-Family
- serviceType (String?) -> ── Stage 1: Service Request ─────────────────────────────────────────── Roof Replacement, Repair, Storm/Hail, etc.
- isInsuranceClaim (String?) -> Yes, No, Not Sure
- urgencyLevel (String?) -> Emergency, ASAP, Within weeks, Planning
- preferredContactMethod (String?) -> Phone Call, Text, Email
- bestTimeToContact (String?) -> Morning, Afternoon, Evening, Anytime
- issueDescription (String?) -> application data field
- leadSourceUTM (String?) -> ── Stage 1: UTM / Auto-captured ───────────────────────────────────────
- leadCampaignUTM (String?) -> application data field
- leadMediumUTM (String?) -> application data field
- landingPageURL (String?) -> application data field
- ipAddress (String?) -> application data field
- deviceType (String?) -> application data field
- browserType (String?) -> application data field
- confirmedName (Boolean) -> ── Stage 2: Verification ──────────────────────────────────────────────
- confirmedPhone (Boolean) -> application data field
- confirmedEmail (Boolean) -> application data field
- confirmedAddress (Boolean) -> application data field
- secondaryPhone (String?) -> application data field
- spouseCoOwnerName (String?) -> application data field
- isHomeowner (String?) -> ── Stage 2: Ownership Qualification ─────────────────────────────────── Yes, No, Tenant
- isDecisionMaker (String?) -> Yes, No, Need Spouse Approval
- ownershipType (String?) -> Owner-Occupied, Rental, Investment
- roofAge (String?) -> ── Stage 2: Roof Details ────────────────────────────────────────────── 0-5, 5-10, 10-15, 15-20, 20+, Unknown
- currentRoofMaterial (String?) -> Asphalt, Metal, Tile, Flat, Wood, Slate, Unknown
- numberOfStories (String?) -> 1, 2, 3+
- knownDamageType (Json?) -> array: Leak, Missing Shingles, Storm, etc.
- damageOccurrenceDate (String?) -> application data field
- previousRoofWork (String?) -> Yes, No, Unknown
- previousRoofWorkDetails (String?) -> application data field
- insuranceCompanyName (String?) -> ── Stage 2: Insurance Info (conditional) ──────────────────────────────
- hasClaimBeenFiled (String?) -> Yes, No, Planning To
- claimNumber (String?) -> application data field
- adjusterAssigned (String?) -> Yes, No, Not Yet
- adjusterName (String?) -> application data field
- adjusterPhone (String?) -> application data field
- adjusterEmail (String?) -> application data field
- adjusterMeetingDate (DateTime?) -> application data field
- budgetRange (String?) -> ── Stage 2: Budget & Timeline ───────────────────────────────────────── Under $5k, $5-10k, $10-20k, $20k+, Insurance, Not Sure
- workTimeline (String?) -> ASAP, 1-2 Weeks, Within 1 Month, etc.
- financingNeeded (String?) -> Yes, No, Maybe
- gettingOtherQuotes (String?) -> Yes, No
- numberOfOtherQuotes (Int?) -> application data field
- topPriority (String?) -> Price, Quality, Speed, Warranty, Reputation
- isHOA (String?) -> ── Stage 2: HOA ─────────────────────────────────────────────────────── Yes, No, Not Sure
- hoaRestrictions (String?) -> application data field
- leadScore (Int?) -> ── Stage 2: Sales Assessment ────────────────────────────────────────── 1-10
- estimationMethod (EstimationMethod?) -> application data field
- disqualifiedReason (String?) -> application data field
- nextStep (String?) -> Schedule Inspection, Send Info, Follow Up, Dead Lead
- followUpDateTime (DateTime?) -> application data field
- inspectionAppointmentDate (DateTime?) -> application data field
- qualificationCallNotes (String?) -> application data field
- closureReason (String?) -> ── Closure / Inactive State Fields ──────────────────────────────────── Required for LOST, DUPLICATE; optional for other inactive states
- duplicateOfLeadId (String?) -> Links to original lead when status = DUPLICATE
- closedAt (DateTime?) -> When the lead was moved to a terminal/inactive state
- reactivateAt (DateTime?) -> For FUTURE_FOLLOW_UP: date-based reactivation
- tenantId (String) -> Tenant relation
- createdById (String?) -> Created by
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- tags (LeadTag[]) -> Relations
- calendarEvents (CalendarEvent[]) -> array field
- activities (LeadActivity[]) -> array field
- quotes (Quote[]) -> array field
- projects (Project[]) -> array field
- files (File[]) -> array field
- emails (Email[]) -> array field
- communicationLogs (CommunicationLog[]) -> array field
- inspections (LeadInspection[]) -> array field
- insuranceClaims (LeadInsuranceClaim[]) -> array field
- roofEstimates (RoofEstimate[]) -> array field
- proposals (Proposal[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- leadSourceId -> LeadSource.id
- tenantId -> Tenant.id

### Table: LeadContactedDetails

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- leadId (String) -> reference to related lead
- propertyType (String) -> Property info
- numberOfStories (String) -> application data field
- approxRoofAge (String) -> application data field
- currentRoofMaterial (String?) -> application data field
- mainIssue (String[]) -> Problem / need
- urgencyLevel (String) -> application data field
- issueStartTimeline (String) -> application data field
- isInsuranceClaim (Boolean) -> Insurance (conditional)
- insuranceCompany (String?) -> application data field
- claimFiled (String?) -> application data field
- dateOfDamage (DateTime?) -> application data field
- claimNumber (String?) -> application data field
- decisionMaker (String) -> Decision & timeline
- decisionTimeline (String) -> application data field
- gettingOtherQuotes (Boolean?) -> application data field
- contactNotes (String) -> Sales notes
- leadTemperature (String) -> application data field
- estimatedDealValue (Decimal) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id
- leadId -> Lead.id

### Table: LeadInspection

Live production rows (approx): 1

Columns:
- id (String) -> primary identifier
- leadId (String) -> reference to related lead
- tenantId (String) -> workspace / tenant scope key
- inspectionDate (DateTime?) -> ── General ─────────────────────────────────────────────────
- inspectorName (String?) -> application data field
- inspectionType (String?) -> Initial, Re-inspect, Insurance, Final
- weatherConditions (String?) -> application data field
- accessMethod (String?) -> Ladder, Drone, Walk-on, Binoculars
- overallCondition (String?) -> Poor, Fair, Good, Excellent
- roofStyle (String?) -> ── Roof Assessment (~25) ─────────────────────────────────── Gable, Hip, Flat, Mansard, Gambrel, Shed
- roofPitch (String?) -> Low(2-4), Medium(5-7), Steep(8-12)
- totalSquares (Decimal?) -> application data field
- ridgeLength (Decimal?) -> application data field
- valleyLength (Decimal?) -> application data field
- eaveLength (Decimal?) -> application data field
- rakeLength (Decimal?) -> application data field
- numberOfLayers (Int?) -> application data field
- deckingType (String?) -> Plywood, OSB, 1x6, Skip
- deckingCondition (String?) -> Good, Needs Repair, Needs Replace
- underlaymentType (String?) -> Felt, Synthetic, Ice&Water
- ventilationType (String?) -> Ridge, Box, Turbine, Power, Soffit
- ventilationCount (Int?) -> application data field
- flashingCondition (String?) -> Good, Repair, Replace
- gutterCondition (String?) -> Good, Repair, Replace, None
- skylightCount (Int?) -> application data field
- skylightCondition (String?) -> application data field
- chimneyPresent (Boolean?) -> application data field
- chimneyCondition (String?) -> application data field
- soffitFasciaCondition (String?) -> Good, Repair, Replace
- dripEdgePresent (Boolean?) -> application data field
- dripEdgeCondition (String?) -> application data field
- iceWaterShieldPresent (Boolean?) -> application data field
- stormDamageFound (Boolean?) -> ── Damage Assessment (~10) ─────────────────────────────────
- windDamageDetails (String?) -> application data field
- hailDamageDetails (String?) -> application data field
- hailSizeFound (String?) -> Pea, Marble, Quarter, Golf Ball, Baseball
- testSquareResults (String?) -> application data field
- interiorDamageFound (Boolean?) -> application data field
- interiorDamageDetails (String?) -> application data field
- photosTakenCount (Int?) -> application data field
- photoFileIds (String[]) -> array field
- overallDamageRating (String?) -> None, Minor, Moderate, Severe, Total Loss
- proposedMaterial (String?) -> ── Material Selections (~10) ─────────────────────────────── Asphalt, Metal, Tile, Flat, etc.
- shingleBrand (String?) -> application data field
- shingleLine (String?) -> application data field
- shingleColor (String?) -> application data field
- underlaymentChoice (String?) -> application data field
- ridgeCapType (String?) -> application data field
- ventilationPlan (String?) -> application data field
- dripEdgeColor (String?) -> application data field
- warrantyType (String?) -> Manufacturer, Workmanship, Extended
- warrantyYears (Int?) -> application data field
- materialCost (Decimal?) -> ── Estimate & Pricing (~16) ────────────────────────────────
- laborCost (Decimal?) -> application data field
- tearOffCost (Decimal?) -> application data field
- permitCost (Decimal?) -> application data field
- dumpsterCost (Decimal?) -> application data field
- miscCost (Decimal?) -> application data field
- subtotal (Decimal?) -> application data field
- overheadPercent (Decimal?) -> application data field
- profitPercent (Decimal?) -> application data field
- totalEstimate (Decimal?) -> application data field
- customerPrice (Decimal?) -> application data field
- depositRequired (Decimal?) -> application data field
- depositCollected (Boolean?) -> application data field
- paymentMethod (String?) -> Cash, Check, Card, Financing, Insurance
- estimateStatus (String?) -> Draft, Sent, Accepted, Rejected, Revised
- tentativeStartDate (DateTime?) -> ── Scheduling & Logistics (~10) ────────────────────────────
- estimatedDuration (String?) -> 1 Day, 2-3 Days, 1 Week, etc.
- crewSize (Int?) -> application data field
- crewLeadName (String?) -> application data field
- materialsOrdered (Boolean?) -> application data field
- materialsDeliveryDate (DateTime?) -> application data field
- permitPulled (Boolean?) -> application data field
- permitNumber (String?) -> application data field
- dumpsterOrdered (Boolean?) -> application data field
- dumpsterDeliveryDate (DateTime?) -> application data field
- inspectorNotes (String?) -> ── Notes ───────────────────────────────────────────────────
- customerFeedback (String?) -> application data field
- internalNotes (String?) -> application data field
- createdById (String?) -> ── Timestamps ──────────────────────────────────────────────
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- leadId -> Lead.id
- tenantId -> Tenant.id

### Table: LeadInsuranceClaim

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- leadId (String) -> reference to related lead
- tenantId (String) -> workspace / tenant scope key
- claimNumber (String?) -> application data field
- insuranceEstimateACV (Decimal?) -> application data field
- recoverableDepreciation (Decimal?) -> application data field
- fullRCVAmount (Decimal?) -> application data field
- deductibleAmount (Decimal?) -> application data field
- supplementNeeded (Boolean?) -> application data field
- supplementAmount (Decimal?) -> application data field
- supplementStatus (String?) -> Pending, Submitted, Approved, Denied
- mortgageCompanyName (String?) -> application data field
- mortgageCompanyAddress (String?) -> application data field
- mortgageLoanNumber (String?) -> application data field
- claimStatus (String?) -> Open, In Review, Approved, Denied, Supplement
- claimNotes (String?) -> application data field
- createdById (String?) -> reference to related createdBy
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- leadId -> Lead.id
- tenantId -> Tenant.id

### Table: LeadTag

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- leadId (String) -> reference to related lead
- tagId (String) -> reference to related tag

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- leadId -> Lead.id
- tagId -> Tag.id

### Table: LeadActivity

Live production rows (approx): 163

Columns:
- id (String) -> primary identifier
- type (String) -> e.g., "note", "email", "call", "meeting", "status_change"
- title (String) -> application data field
- description (String?) -> freeform description
- metadata (Json?) -> Additional data based on type
- leadId (String) -> reference to related lead
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- leadId -> Lead.id

### Table: Client

Live production rows (approx): 59

Columns:
- id (String) -> primary identifier
- clientLogo (String?) -> 1️⃣ Basic Information
- clientName (String) -> application data field
- companyName (String?) -> application data field
- clientType (ClientType) -> application data field
- primaryEmail (String) -> application data field
- primaryPhone (String) -> application data field
- status (ClientStatus) -> lifecycle or workflow status
- lifecycleStage (ClientLifecycleStage) -> application data field
- assignedOwnerId (String?) -> reference to related assignedOwner
- gstHstNumber (String?) -> 2️⃣ Business & Tax Details
- pstQstNumber (String?) -> application data field
- businessStructure (String?) -> application data field
- corpRegistrationNumber (String?) -> application data field
- streetAddress (String?) -> 3️⃣ Billing Address
- suite (String?) -> application data field
- city (String?) -> application data field
- province (String?) -> application data field
- postalCode (String?) -> application data field
- country (String?) -> application data field
- internalNotes (String?) -> 4️⃣ Internal Notes
- contactName (String?) -> 5️⃣ Primary Contact
- position (String?) -> application data field
- directPhone (String?) -> application data field
- creditLimit (Decimal?) -> 6️⃣ Financial Settings
- paymentTerms (String?) -> application data field
- currency (String) -> application data field
- leadSource (String?) -> 7️⃣ Categorization
- clientCategory (String?) -> application data field
- tags (Json) -> flexible JSON payload / denormalized metadata
- propertyType (String?) -> 8️⃣ Property Information Residential, Commercial, Multi-Family
- numberOfStories (String?) -> 1, 2, 3+
- serviceType (String?) -> 9️⃣ Service Details Roof Replacement, Repair, Storm/Hail, etc.
- preferredContactMethod (String?) -> Phone Call, Text, Email
- bestTimeToContact (String?) -> Morning, Afternoon, Evening, Anytime
- currentRoofMaterial (String?) -> 🔟 Roof Details Asphalt, Metal, Tile, Flat, Wood, Slate, Unknown
- roofAge (String?) -> 0-5, 5-10, 10-15, 15-20, 20+, Unknown
- insuranceCompanyName (String?) -> 1️⃣1️⃣ Insurance Info
- isInsuranceClaim (String?) -> Yes, No, Not Sure
- isHomeowner (String?) -> 1️⃣2️⃣ Ownership & HOA Yes, No, Tenant
- isHOA (String?) -> Yes, No, Not Sure
- hoaRestrictions (String?) -> application data field
- secondaryPhone (String?) -> 1️⃣3️⃣ Secondary Contact
- spouseCoOwnerName (String?) -> application data field
- roofSize (String?) -> 1️⃣4️⃣ Extended Roof Details Sq ft from measurement tools
- roofPitch (String?) -> e.g., 6/12 pitch, 2 layers
- budgetRange (String?) -> 1️⃣5️⃣ Lead Tracking $5k-10k, $10k-20k, etc.
- urgencyLevel (String?) -> High, Medium, Low
- warrantyExpiration (DateTime?) -> 1️⃣6️⃣ Project / Warranty Manufacturer + labor warranty
- doNotContact (Boolean) -> 1️⃣7️⃣ Communication Preferences
- nextFollowUp (DateTime?) -> application data field
- language (String?) -> e.g., English, Spanish, French
- totalRevenue (Decimal) -> Tracking
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- contacts (Contact[]) -> Relations
- groups (ClientGroupMember[]) -> array field
- projects (Project[]) -> array field
- invoices (Invoice[]) -> array field
- quotes (Quote[]) -> array field
- orders (Order[]) -> array field
- bookings (Booking[]) -> array field
- tasks (Task[]) -> array field
- files (File[]) -> array field
- emails (Email[]) -> array field
- payments (InvoicePayment[]) -> array field
- roofEstimates (RoofEstimate[]) -> array field
- roofData (RoofData[]) -> array field
- calendarEvents (CalendarEvent[]) -> array field
- contracts (Contract[]) -> array field
- userAccesses (UserAccess[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: Contact

Live production rows (approx): 6

Columns:
- id (String) -> primary identifier
- contactName (String) -> Contact Info
- type (ContactType) -> application data field
- jobTitle (String?) -> application data field
- department (String?) -> application data field
- email (String) -> email address
- officePhone (String?) -> application data field
- mobilePhone (String?) -> application data field
- linkedInUrl (String?) -> application data field
- isPrimaryContact (Boolean) -> Flags
- companyId (String?) -> Client relation (optional - can be standalone contact)
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- emails (Email[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- companyId -> Client.id
- tenantId -> Tenant.id

### Table: ClientGroup

Live production rows (approx): 1

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- description (String?) -> freeform description
- color (String?) -> For UI display
- autoUpdateEnabled (Boolean) -> Auto-update rules (stored as JSON)
- autoUpdateRules (Json?) -> e.g., {"industry": "Technology", "status": "ACTIVE"}
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- members (ClientGroupMember[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: ClientGroupMember

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- groupId (String) -> reference to related group
- clientId (String) -> reference to related client
- addedAt (DateTime) -> application data field
- addedManually (Boolean) -> vs auto-added by rules

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- groupId -> ClientGroup.id
- clientId -> Client.id

### Table: Application

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- referenceNumber (String) -> Application Info
- title (String) -> application data field
- description (String?) -> freeform description
- status (ApplicationStatus) -> Status & Lifecycle
- submittedAt (DateTime?) -> application data field
- reviewedAt (DateTime?) -> application data field
- completedAt (DateTime?) -> application data field
- formData (Json) -> Form Data (flexible JSON for different application types)
- internalNotes (String?) -> Attachments tracked via File model with applicationId Notes
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- files (File[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: Task

Live production rows (approx): 3104

Columns:
- id (String) -> primary identifier
- title (String) -> Task Info
- description (String?) -> freeform description
- status (TaskStatus) -> Status & Priority
- priority (TaskPriority) -> application data field
- dueDate (DateTime?) -> Dates
- startDate (DateTime?) -> application data field
- completedAt (DateTime?) -> application data field
- estimatedTime (Int?) -> Estimation (in minutes)
- actualTime (Int?) -> application data field
- assignedToId (String?) -> Assignment
- createdById (String?) -> Created by
- projectId (String?) -> Project relation (optional)
- clientId (String?) -> Client relation (optional)
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- tags (TaskTag[]) -> Relations
- subtasks (Task[]) -> array field
- parentTaskId (String?) -> reference to related parentTask
- timeEntries (TimeEntry[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- clientId -> Client.id
- tenantId -> Tenant.id

### Table: TaskTag

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- taskId (String) -> reference to related task
- tagId (String) -> reference to related tag

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id
- taskId -> Task.id
- tagId -> Tag.id

### Table: Project

Live production rows (approx): 36

Columns:
- id (String) -> primary identifier
- name (String) -> Project Info
- description (String?) -> freeform description
- code (String?) -> Project code/identifier
- projectNumber (String?) -> Auto-generated: PRJ-2026-0001
- internalNotes (String?) -> application data field
- tags (String[]) -> array field
- customFields (Json?) -> application data field
- deletedAt (DateTime?) -> soft delete timestamp
- status (ProjectStatus) -> Status
- priority (ProjectPriority) -> application data field
- projectType (ProjectType) -> application data field
- propertyType (PropertyType) -> application data field
- stageId (String?) -> Pipeline stage
- startDate (DateTime?) -> Dates
- endDate (DateTime?) -> application data field
- actualEndDate (DateTime?) -> application data field
- estimatedStartDate (DateTime?) -> application data field
- actualStartDate (DateTime?) -> application data field
- estimatedEndDate (DateTime?) -> application data field
- estimatedDuration (Int?) -> application data field
- actualDuration (Int?) -> application data field
- budget (Decimal?) -> Budget
- currency (Currency) -> application data field
- contractValue (Decimal?) -> application data field
- estimatedCost (Decimal?) -> application data field
- actualCost (Decimal?) -> application data field
- grossProfit (Decimal?) -> application data field
- profitMargin (Decimal?) -> application data field
- deductible (Decimal?) -> application data field
- insuranceApprovedAmount (Decimal?) -> application data field
- permitCost (Decimal?) -> application data field
- progress (Int) -> Progress (0-100)
- completionPercentage (Int) -> application data field
- isCompleted (Boolean) -> application data field
- completedAt (DateTime?) -> application data field
- completedById (String?) -> reference to related completedBy
- qualityScore (Int?) -> Quality & customer satisfaction
- clientRating (Int?) -> application data field
- clientReviewRequested (Boolean) -> application data field
- clientReviewReceived (Boolean) -> application data field
- roofType (String?) -> Job site and roof metadata
- roofSquares (Decimal?) -> application data field
- roofPitch (String?) -> application data field
- roofLayers (Int?) -> application data field
- stories (Int?) -> application data field
- shingleManufacturer (String?) -> application data field
- shingleProduct (String?) -> application data field
- shingleColor (String?) -> application data field
- jobSiteAddress (String?) -> application data field
- jobSiteAddress2 (String?) -> application data field
- jobSiteCity (String?) -> application data field
- jobSiteState (String?) -> application data field
- jobSiteZip (String?) -> application data field
- jobSiteCountry (String?) -> application data field
- latitude (Decimal?) -> application data field
- longitude (Decimal?) -> application data field
- isInsuranceJob (Boolean) -> Insurance
- insuranceCompany (String?) -> application data field
- claimNumber (String?) -> application data field
- policyNumber (String?) -> application data field
- insuranceApproved (Boolean?) -> application data field
- adjusterId (String?) -> reference to related adjuster
- adjusterName (String?) -> application data field
- adjusterPhone (String?) -> application data field
- adjusterEmail (String?) -> application data field
- dateOfLoss (DateTime?) -> application data field
- permitRequired (Boolean) -> Permit
- permitNumber (String?) -> application data field
- permitStatus (PermitStatus?) -> application data field
- permitPulledDate (DateTime?) -> application data field
- permitApprovedDate (DateTime?) -> application data field
- warrantyType (String?) -> Warranty
- warrantyYears (Int?) -> application data field
- warrantyRegistered (Boolean) -> application data field
- warrantyRegisteredDate (DateTime?) -> application data field
- warrantyNumber (String?) -> application data field
- projectManagerId (String?) -> Assignment
- salesRepId (String?) -> reference to related salesRep
- createdById (String?) -> reference to related createdBy
- clientId (String?) -> Client relation (optional)
- quoteId (String?) -> Quote that generated this project (when accepted)
- leadId (String?) -> Lead that originated this project
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- archivedAt (DateTime?) -> FUTURE: Archived functionality
- tasks (Task[]) -> Relations
- projectTasks (ProjectTask[]) -> array field
- projectMaterials (ProjectMaterial[]) -> array field
- projectLaborEntries (ProjectLabor[]) -> array field
- projectExpenses (ProjectExpense[]) -> array field
- projectDocuments (ProjectDocument[]) -> array field
- projectPhotos (ProjectPhoto[]) -> array field
- projectNotes (ProjectNote[]) -> array field
- projectCommunications (ProjectCommunication[]) -> array field
- crewAssignments (ProjectCrewAssignment[]) -> array field
- projectInspections (ProjectInspection[]) -> array field
- changeOrders (ChangeOrder[]) -> array field
- weatherDelays (WeatherDelay[]) -> array field
- purchaseOrders (PurchaseOrder[]) -> array field
- projectStageHistory (ProjectStageHistory[]) -> array field
- members (ProjectMember[]) -> array field
- files (File[]) -> array field
- invoices (Invoice[]) -> array field
- payments (InvoicePayment[]) -> array field
- emails (Email[]) -> array field
- contracts (Contract[]) -> array field
- timeEntries (TimeEntry[]) -> array field
- jobNotes (JobNote[]) -> array field
- checklistSubmissions (ChecklistSubmission[]) -> array field
- jobPhotos (JobPhoto[]) -> array field
- jobMessages (JobMessage[]) -> array field
- materialRequests (MaterialRequest[]) -> array field
- incidentReports (IncidentReport[]) -> array field
- userAccesses (UserAccess[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- stageId -> ProjectStage.id
- clientId -> Client.id
- quoteId -> Quote.id
- leadId -> Lead.id
- tenantId -> Tenant.id

### Table: ProjectMember

Live production rows (approx): 36

Columns:
- id (String) -> primary identifier
- role (String?) -> e.g., "Project Manager", "Developer"
- projectId (String) -> reference to related project
- employeeId (String) -> reference to related employee
- joinedAt (DateTime) -> application data field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- employeeId -> Employee.id

### Table: ProjectStage

Live production rows (approx): 108

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- name (String) -> display name
- slug (String) -> application data field
- description (String?) -> freeform description
- color (String) -> application data field
- icon (String?) -> application data field
- order (Int) -> application data field
- isDefault (Boolean) -> application data field
- isCompleted (Boolean) -> application data field
- isCancelled (Boolean) -> application data field
- autoNotifyClient (Boolean) -> application data field
- clientNotificationTemplate (String?) -> application data field
- autoNotifyTeam (Boolean) -> application data field
- teamNotificationTemplate (String?) -> application data field
- autoCreateTask (Boolean) -> application data field
- taskTemplate (String?) -> application data field
- projectCount (Int) -> application data field
- totalValue (Decimal) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- projects (Project[]) -> array field
- stageHistory (ProjectStageHistory[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> inferred application-level reference to tenant

### Table: ProjectStageHistory

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- stageId (String) -> reference to related stage
- enteredAt (DateTime) -> application data field
- exitedAt (DateTime?) -> application data field
- durationMinutes (Int?) -> application data field
- changedById (String?) -> reference to related changedBy
- notes (String?) -> application data field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- stageId -> ProjectStage.id

### Table: ProjectTask

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- title (String) -> application data field
- description (String?) -> freeform description
- taskType (ProjectTaskType) -> application data field
- priority (TaskPriority) -> application data field
- status (TaskStatus) -> lifecycle or workflow status
- assignedToId (String?) -> reference to related assignedTo
- dueDate (DateTime?) -> application data field
- startDate (DateTime?) -> application data field
- completedAt (DateTime?) -> application data field
- completedById (String?) -> reference to related completedBy
- estimatedMinutes (Int?) -> application data field
- actualMinutes (Int?) -> application data field
- isChecklist (Boolean) -> application data field
- checklistItems (Json?) -> application data field
- sortOrder (Int) -> application data field
- parentTaskId (String?) -> reference to related parentTask
- subTasks (ProjectTask[]) -> array field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- createdById (String?) -> reference to related createdBy
- laborEntries (ProjectLabor[]) -> array field
- photos (ProjectPhoto[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id

### Table: ProjectMaterial

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- name (String) -> display name
- description (String?) -> freeform description
- category (ProjectMaterialCategory) -> application data field
- sku (String?) -> application data field
- quantityNeeded (Decimal) -> application data field
- quantityOrdered (Decimal?) -> application data field
- quantityReceived (Decimal?) -> application data field
- quantityUsed (Decimal?) -> application data field
- quantityReturned (Decimal?) -> application data field
- unit (String) -> application data field
- unitCost (Decimal) -> application data field
- totalCost (Decimal) -> application data field
- markup (Decimal?) -> application data field
- sellPrice (Decimal?) -> application data field
- supplierId (String?) -> reference to related supplier
- supplierName (String?) -> application data field
- purchaseOrderId (String?) -> reference to related purchaseOrder
- orderStatus (MaterialOrderStatus) -> application data field
- orderedAt (DateTime?) -> application data field
- orderedById (String?) -> reference to related orderedBy
- expectedDeliveryDate (DateTime?) -> application data field
- actualDeliveryDate (DateTime?) -> application data field
- deliveryStatus (DeliveryStatus) -> application data field
- deliveryNotes (String?) -> application data field
- deductFromInventory (Boolean) -> application data field
- inventoryItemId (String?) -> reference to related inventoryItem
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- supplierId -> Supplier.id
- purchaseOrderId -> PurchaseOrder.id

### Table: ProjectCrewAssignment

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- crewId (String) -> reference to related crew
- crewLeadId (String?) -> reference to related crewLead
- scheduledStartDate (DateTime) -> application data field
- scheduledEndDate (DateTime) -> application data field
- actualStartDate (DateTime?) -> application data field
- actualEndDate (DateTime?) -> application data field
- status (CrewAssignmentStatus) -> lifecycle or workflow status
- workerCount (Int) -> application data field
- assignedWorkers (Json?) -> application data field
- notes (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- laborEntries (ProjectLabor[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- crewId -> Crew.id

### Table: ProjectLabor

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- userId (String?) -> reference to related user
- workerName (String) -> application data field
- workerType (WorkerType) -> application data field
- crewAssignmentId (String?) -> reference to related crewAssignment
- date (DateTime) -> application data field
- startTime (DateTime?) -> application data field
- endTime (DateTime?) -> application data field
- hoursWorked (Decimal) -> application data field
- breakMinutes (Int) -> application data field
- overtimeHours (Decimal?) -> application data field
- taskId (String?) -> reference to related task
- activityType (LaborActivityType) -> application data field
- description (String?) -> freeform description
- hourlyRate (Decimal) -> application data field
- overtimeRate (Decimal?) -> application data field
- totalCost (Decimal) -> application data field
- isBillable (Boolean) -> application data field
- billedToClient (Boolean) -> application data field
- verified (Boolean) -> application data field
- verifiedById (String?) -> reference to related verifiedBy
- verifiedAt (DateTime?) -> application data field
- checkInLatitude (Decimal?) -> application data field
- checkInLongitude (Decimal?) -> application data field
- checkOutLatitude (Decimal?) -> application data field
- checkOutLongitude (Decimal?) -> application data field
- notes (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- createdById (String?) -> reference to related createdBy

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- crewAssignmentId -> ProjectCrewAssignment.id
- taskId -> ProjectTask.id

### Table: ProjectExpense

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- category (ProjectExpenseCategory) -> application data field
- description (String) -> freeform description
- vendor (String?) -> application data field
- amount (Decimal) -> application data field
- taxAmount (Decimal?) -> application data field
- totalAmount (Decimal) -> application data field
- paymentMethod (PaymentMethod?) -> application data field
- paymentStatus (ProjectPaymentStatus) -> application data field
- paidAt (DateTime?) -> application data field
- referenceNumber (String?) -> application data field
- receiptDocumentId (String?) -> reference to related receiptDocument
- isReimbursable (Boolean) -> application data field
- reimbursedToId (String?) -> reference to related reimbursedTo
- reimbursedAt (DateTime?) -> application data field
- billableToClient (Boolean) -> application data field
- billedToClient (Boolean) -> application data field
- expenseDate (DateTime) -> application data field
- notes (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- createdById (String?) -> reference to related createdBy

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id

### Table: ProjectDocument

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- documentId (String) -> reference to related document
- category (ProjectDocumentCategory) -> application data field
- description (String?) -> freeform description
- visibleToClient (Boolean) -> application data field
- requiresSignature (Boolean) -> application data field
- signedAt (DateTime?) -> application data field
- signedById (String?) -> reference to related signedBy
- signatureDocumentId (String?) -> reference to related signatureDocument
- addedAt (DateTime) -> application data field
- addedById (String?) -> reference to related addedBy

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id

### Table: ProjectPhoto

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- url (String) -> application data field
- thumbnailUrl (String?) -> application data field
- filename (String) -> application data field
- fileSize (Int) -> application data field
- mimeType (String) -> application data field
- category (PhotoCategory) -> application data field
- description (String?) -> freeform description
- latitude (Decimal?) -> application data field
- longitude (Decimal?) -> application data field
- takenAt (DateTime?) -> application data field
- takenById (String?) -> reference to related takenBy
- taskId (String?) -> reference to related task
- visibleToClient (Boolean) -> application data field
- visibleToInsurance (Boolean) -> application data field
- aiAnalyzed (Boolean) -> application data field
- aiAnalysis (Json?) -> application data field
- sortOrder (Int) -> application data field
- createdAt (DateTime) -> record creation timestamp
- uploadedById (String?) -> reference to related uploadedBy

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- taskId -> ProjectTask.id

### Table: ProjectNote

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- content (String) -> application data field
- noteType (ProjectNoteType) -> application data field
- mentionedUserIds (String[]) -> array field
- isInternal (Boolean) -> application data field
- visibleToClient (Boolean) -> application data field
- isPinned (Boolean) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- createdById (String?) -> reference to related createdBy

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id

### Table: ProjectCommunication

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- type (CommunicationType) -> application data field
- direction (CommunicationDirection) -> application data field
- subject (String?) -> application data field
- content (String) -> application data field
- fromUserId (String?) -> reference to related fromUser
- fromName (String?) -> application data field
- fromEmail (String?) -> application data field
- fromPhone (String?) -> application data field
- toClientId (String?) -> reference to related toClient
- toName (String?) -> application data field
- toEmail (String?) -> application data field
- toPhone (String?) -> application data field
- status (CommunicationStatus) -> lifecycle or workflow status
- callDuration (Int?) -> application data field
- callRecordingUrl (String?) -> application data field
- emailMessageId (String?) -> reference to related emailMessage
- emailThreadId (String?) -> reference to related emailThread
- attachmentIds (String[]) -> array field
- communicatedAt (DateTime) -> application data field
- createdAt (DateTime) -> record creation timestamp
- createdById (String?) -> reference to related createdBy

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id

### Table: ProjectInspection

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- type (InspectionType) -> application data field
- scheduledDate (DateTime?) -> application data field
- scheduledTime (String?) -> application data field
- actualDate (DateTime?) -> application data field
- inspectorName (String?) -> application data field
- inspectorPhone (String?) -> application data field
- inspectorEmail (String?) -> application data field
- inspectionCompany (String?) -> application data field
- status (InspectionStatus) -> lifecycle or workflow status
- result (InspectionResult?) -> application data field
- notes (String?) -> application data field
- failureReasons (String[]) -> array field
- requiredFixes (String?) -> application data field
- reinspectionRequired (Boolean) -> application data field
- reinspectionDate (DateTime?) -> application data field
- reportDocumentId (String?) -> reference to related reportDocument
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- createdById (String?) -> reference to related createdBy

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id

### Table: ChangeOrder

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- changeOrderNumber (String) -> application data field
- title (String) -> application data field
- description (String) -> freeform description
- reason (ChangeOrderReason) -> application data field
- previousContractValue (Decimal) -> application data field
- changeAmount (Decimal) -> application data field
- newContractValue (Decimal) -> application data field
- status (ChangeOrderStatus) -> lifecycle or workflow status
- clientApproved (Boolean?) -> application data field
- clientApprovedAt (DateTime?) -> application data field
- clientSignatureId (String?) -> reference to related clientSignature
- isInsuranceSupplement (Boolean) -> application data field
- supplementNumber (String?) -> application data field
- insuranceApproved (Boolean?) -> application data field
- insuranceApprovedAmount (Decimal?) -> application data field
- additionalDays (Int?) -> application data field
- documentId (String?) -> reference to related document
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- createdById (String?) -> reference to related createdBy

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id

### Table: WeatherDelay

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- projectId (String) -> reference to related project
- date (DateTime) -> application data field
- weatherType (WeatherType) -> application data field
- description (String?) -> freeform description
- workdayLost (Boolean) -> application data field
- hoursLost (Decimal?) -> application data field
- photoIds (String[]) -> array field
- createdAt (DateTime) -> record creation timestamp
- createdById (String?) -> reference to related createdBy

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id

### Table: Crew

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- name (String) -> display name
- description (String?) -> freeform description
- color (String?) -> application data field
- crewLeadId (String?) -> reference to related crewLead
- memberIds (String[]) -> array field
- maxMembers (Int) -> application data field
- defaultHourlyRate (Decimal?) -> application data field
- isActive (Boolean) -> application data field
- completedProjects (Int) -> application data field
- averageRating (Decimal?) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- assignments (ProjectCrewAssignment[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> inferred application-level reference to tenant
- crewLeadId -> inferred application-level reference to crewLead

### Table: Supplier

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- name (String) -> display name
- contactName (String?) -> application data field
- email (String?) -> email address
- phone (String?) -> phone number
- website (String?) -> application data field
- address (String?) -> application data field
- city (String?) -> application data field
- state (String?) -> application data field
- zip (String?) -> application data field
- accountNumber (String?) -> application data field
- paymentTerms (String?) -> application data field
- isPreferred (Boolean) -> application data field
- categories (ProjectMaterialCategory[]) -> array field
- notes (String?) -> application data field
- isActive (Boolean) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- materials (ProjectMaterial[]) -> array field
- purchaseOrders (PurchaseOrder[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> inferred application-level reference to tenant

### Table: PurchaseOrder

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- poNumber (String) -> application data field
- supplierId (String) -> reference to related supplier
- projectId (String?) -> reference to related project
- orderDate (DateTime) -> application data field
- expectedDeliveryDate (DateTime?) -> application data field
- actualDeliveryDate (DateTime?) -> application data field
- subtotal (Decimal) -> application data field
- taxAmount (Decimal?) -> application data field
- shippingAmount (Decimal?) -> application data field
- totalAmount (Decimal) -> application data field
- status (PurchaseOrderStatus) -> lifecycle or workflow status
- deliveryAddress (String?) -> application data field
- deliveryCity (String?) -> application data field
- deliveryState (String?) -> application data field
- deliveryZip (String?) -> application data field
- deliveryNotes (String?) -> application data field
- internalNotes (String?) -> application data field
- supplierNotes (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- createdById (String?) -> reference to related createdBy
- materials (ProjectMaterial[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- supplierId -> Supplier.id
- projectId -> Project.id

### Table: TimeEntry

Live production rows (approx): 12

Columns:
- id (String) -> primary identifier
- description (String?) -> freeform description
- startTime (DateTime) -> Clock times
- endTime (DateTime?) -> application data field
- duration (Int?) -> in minutes (auto-calc on clock-out)
- billable (Boolean) -> Billing
- hourlyRate (Decimal?) -> application data field
- phase (String?) -> Phase / category Inspection, Tear-off, Install, Cleanup, Travel
- notes (String?) -> application data field
- clockInLat (Float?) -> GPS
- clockInLng (Float?) -> application data field
- clockOutLat (Float?) -> application data field
- clockOutLng (Float?) -> application data field
- status (TimeEntryStatus) -> Status
- taskId (String?) -> Relations
- projectId (String?) -> reference to related project
- employeeId (String) -> reference to related employee
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- locationPings (LocationPing[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- taskId -> Task.id
- projectId -> Project.id
- employeeId -> Employee.id
- tenantId -> Tenant.id

### Table: JobNote

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- content (String) -> application data field
- noteType (String) -> UPDATE, ISSUE, SAFETY, GENERAL
- photos (Json) -> Array of photo URLs
- visibility (String) -> INTERNAL, CLIENT_VISIBLE
- projectId (String) -> reference to related project
- employeeId (String) -> reference to related employee
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- employeeId -> Employee.id
- tenantId -> Tenant.id

### Table: CrewNotification

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- title (String) -> application data field
- body (String) -> application data field
- type (CrewNotificationType) -> application data field
- read (Boolean) -> application data field
- employeeId (String) -> reference to related employee
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- employeeId -> Employee.id
- tenantId -> Tenant.id

### Table: ChecklistTemplate

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- category (String) -> SAFETY, QUALITY, EQUIPMENT, SITE
- description (String?) -> freeform description
- isActive (Boolean) -> application data field
- tenantId (String) -> workspace / tenant scope key
- items (ChecklistItem[]) -> array field
- submissions (ChecklistSubmission[]) -> array field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: ChecklistItem

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- question (String) -> application data field
- inputType (String) -> YES_NO, TEXT, PHOTO, NUMBER
- required (Boolean) -> application data field
- order (Int) -> application data field
- templateId (String) -> reference to related template

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- templateId -> ChecklistTemplate.id

### Table: ChecklistSubmission

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- responses (Json) -> flexible JSON payload / denormalized metadata
- photos (Json) -> flexible JSON payload / denormalized metadata
- completedAt (DateTime) -> application data field
- templateId (String) -> reference to related template
- employeeId (String) -> reference to related employee
- projectId (String) -> reference to related project
- tenantId (String) -> workspace / tenant scope key

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- templateId -> ChecklistTemplate.id
- employeeId -> Employee.id
- projectId -> Project.id
- tenantId -> Tenant.id

### Table: LocationPing

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- lat (Float) -> application data field
- lng (Float) -> application data field
- accuracy (Float?) -> application data field
- timestamp (DateTime) -> application data field
- timeEntryId (String) -> reference to related timeEntry
- employeeId (String) -> reference to related employee

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- timeEntryId -> TimeEntry.id
- employeeId -> Employee.id

### Table: JobPhoto

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- url (String) -> application data field
- thumbnail (String?) -> application data field
- caption (String?) -> application data field
- category (PhotoCategory) -> application data field
- phase (String?) -> application data field
- gpsLat (Float?) -> application data field
- gpsLng (Float?) -> application data field
- takenAt (DateTime) -> application data field
- uploadedAt (DateTime) -> application data field
- projectId (String) -> reference to related project
- employeeId (String) -> reference to related employee
- tenantId (String) -> workspace / tenant scope key

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- employeeId -> Employee.id
- tenantId -> Tenant.id

### Table: JobMessage

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- content (String) -> application data field
- attachments (Json) -> flexible JSON payload / denormalized metadata
- messageType (String) -> TEXT, PHOTO, VOICE, SYSTEM
- readBy (Json) -> flexible JSON payload / denormalized metadata
- projectId (String) -> reference to related project
- senderId (String) -> reference to related sender
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- senderId -> Employee.id
- tenantId -> Tenant.id

### Table: Equipment

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- serialNumber (String?) -> application data field
- category (String) -> application data field
- status (EquipmentStatus) -> lifecycle or workflow status
- notes (String?) -> application data field
- assignedToId (String?) -> reference to related assignedTo
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- assignedToId -> Employee.id
- tenantId -> Tenant.id

### Table: MaterialRequest

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- items (Json) -> [{ name, quantity, unit }]
- status (String) -> PENDING, APPROVED, DELIVERED
- urgency (String) -> LOW, MEDIUM, HIGH
- notes (String?) -> application data field
- projectId (String) -> reference to related project
- requestedById (String) -> reference to related requestedBy
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- requestedById -> Employee.id
- tenantId -> Tenant.id

### Table: IncidentReport

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- type (IncidentType) -> application data field
- severity (String) -> LOW, MEDIUM, HIGH, CRITICAL
- description (String) -> freeform description
- photos (Json) -> flexible JSON payload / denormalized metadata
- witnesses (Json) -> flexible JSON payload / denormalized metadata
- actionTaken (String?) -> application data field
- location (String?) -> application data field
- gpsLat (Float?) -> application data field
- gpsLng (Float?) -> application data field
- reportedAt (DateTime) -> application data field
- projectId (String) -> reference to related project
- reportedById (String) -> reference to related reportedBy
- tenantId (String) -> workspace / tenant scope key

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- reportedById -> Employee.id
- tenantId -> Tenant.id

### Table: LeaveRequest

Live production rows (approx): 4

Columns:
- id (String) -> primary identifier
- type (LeaveType) -> application data field
- startDate (DateTime) -> application data field
- endDate (DateTime) -> application data field
- reason (String?) -> application data field
- status (String) -> PENDING, APPROVED, REJECTED
- reviewNote (String?) -> application data field
- reviewedById (String?) -> reference to related reviewedBy
- employeeId (String) -> reference to related employee
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: Availability

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- dayOfWeek (Int) -> 0=Sunday, 6=Saturday
- startTime (String) -> application data field
- endTime (String) -> application data field
- available (Boolean) -> application data field
- employeeId (String) -> reference to related employee

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- employeeId -> Employee.id

### Table: EmployeeDocument

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- type (DocType) -> application data field
- fileUrl (String) -> application data field
- expiryDate (DateTime?) -> application data field
- status (String) -> VALID, EXPIRING_SOON, EXPIRED
- employeeId (String) -> reference to related employee
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- employeeId -> Employee.id
- tenantId -> Tenant.id

### Table: JobCompletion

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- completionPhotos (Json) -> flexible JSON payload / denormalized metadata
- clientSignature (String?) -> application data field
- clientRating (Int?) -> application data field
- clientFeedback (String?) -> application data field
- completionNotes (String?) -> application data field
- completedAt (DateTime) -> application data field
- projectId (String) -> reference to related project
- completedById (String) -> reference to related completedBy
- tenantId (String) -> workspace / tenant scope key

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- projectId -> Project.id
- completedById -> Employee.id
- tenantId -> Tenant.id

### Table: CalendarEvent

Live production rows (approx): 36

Columns:
- id (String) -> primary identifier
- title (String) -> Event Info
- description (String?) -> freeform description
- location (String?) -> application data field
- eventType (CalendarEventType) -> Type & Color
- status (CalendarEventStatus) -> lifecycle or workflow status
- color (String?) -> application data field
- startTime (DateTime) -> Timing
- endTime (DateTime) -> application data field
- isAllDay (Boolean) -> application data field
- timezone (String) -> application data field
- recurrence (CalendarEventRecurrence) -> Recurrence
- recurrenceRule (String?) -> iCal RRULE format for complex rules
- recurrenceEndDate (DateTime?) -> application data field
- reminderMinutes (Int?) -> Notifications Minutes before event
- meetingLink (String?) -> Additional fields
- priority (String) -> LOW, MEDIUM, HIGH
- isPrivate (Boolean) -> application data field
- notes (String?) -> application data field
- category (String?) -> work, meeting, personal, client, deadline, holiday, travel, training
- createdById (String?) -> Creator
- tenantId (String) -> Tenant relation
- clientId (String?) -> Client / Lead linking (for automation context)
- leadId (String?) -> reference to related lead
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- attendees (CalendarEventAttendee[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id
- clientId -> Client.id
- leadId -> Lead.id

### Table: CalendarEventAttendee

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- eventId (String) -> reference to related event
- employeeId (String) -> reference to related employee
- status (String) -> pending, accepted, declined, tentative
- respondedAt (DateTime?) -> application data field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id
- eventId -> CalendarEvent.id
- employeeId -> Employee.id

### Table: Folder

Live production rows (approx): 20

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- parentId (String?) -> Parent folder (for nested structure)
- children (Folder[]) -> array field
- isStarred (Boolean) -> Starred
- isShared (Boolean) -> Sharing
- sharedWith (Json?) -> Array of employee IDs or "all"
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- deletedAt (DateTime?) -> Soft delete for trash
- files (File[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: File

Live production rows (approx): 57

Columns:
- id (String) -> primary identifier
- name (String) -> File Info
- originalName (String) -> application data field
- mimeType (String) -> application data field
- size (BigInt) -> in bytes
- path (String) -> Storage path
- extension (String?) -> Metadata
- checksum (String?) -> For integrity verification
- folderId (String?) -> Folder relation (optional)
- applicationId (String?) -> Related entities (optional — file can belong to multiple contexts)
- projectId (String?) -> reference to related project
- clientId (String?) -> reference to related client
- leadId (String?) -> reference to related lead
- quoteId (String?) -> reference to related quote
- isStarred (Boolean) -> Starred
- isShared (Boolean) -> Sharing
- sharedWith (Json?) -> Array of employee IDs or "all"
- shareLink (String?) -> Public share link
- shareExpiresAt (DateTime?) -> application data field
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- deletedAt (DateTime?) -> Soft delete for trash
- tags (FileTag[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- folderId -> Folder.id
- applicationId -> Application.id
- projectId -> Project.id
- clientId -> Client.id
- leadId -> Lead.id
- quoteId -> Quote.id
- tenantId -> Tenant.id

### Table: FileTag

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- fileId (String) -> reference to related file
- tagId (String) -> reference to related tag

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- fileId -> File.id
- tagId -> Tag.id

### Table: Invoice

Live production rows (approx): 40

Columns:
- id (String) -> primary identifier
- invoiceNumber (String) -> Invoice Number
- status (InvoiceStatus) -> Status
- clientId (String) -> Client
- issueDate (DateTime) -> Dates
- dueDate (DateTime) -> application data field
- paidAt (DateTime?) -> application data field
- currency (Currency) -> Currency
- subtotal (Decimal) -> Amounts
- taxRate (Decimal?) -> Percentage
- taxAmount (Decimal) -> application data field
- discountAmount (Decimal) -> application data field
- total (Decimal) -> application data field
- amountPaid (Decimal) -> reference to related amountPa
- amountDue (Decimal) -> application data field
- notes (String?) -> Notes
- terms (String?) -> application data field
- quoteId (String?) -> Linked quote (which quote generated this invoice)
- projectId (String?) -> Linked project/job
- createdById (String?) -> Created by
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- sentAt (DateTime?) -> application data field
- viewedAt (DateTime?) -> application data field
- items (InvoiceItem[]) -> Relations
- payments (InvoicePayment[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- clientId -> Client.id
- quoteId -> Quote.id
- projectId -> Project.id
- tenantId -> Tenant.id

### Table: InvoiceItem

Live production rows (approx): 134

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- invoiceId (String) -> reference to related invoice
- description (String) -> Item details
- quantity (Decimal) -> application data field
- unitPrice (Decimal) -> application data field
- amount (Decimal) -> application data field
- taxRate (Decimal?) -> Optional: tax per item
- sortOrder (Int) -> Ordering

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id
- invoiceId -> Invoice.id

### Table: InvoicePayment

Live production rows (approx): 27

Columns:
- id (String) -> primary identifier
- invoiceId (String?) -> Invoice link (optional — allows standalone payments like deposits, retainers)
- clientId (String) -> Client link (required — every payment belongs to a client)
- projectId (String?) -> Optional project link (for project-level payment tracking)
- amount (Decimal) -> Payment details
- paymentMethod (PaymentMethod) -> application data field
- paymentDate (DateTime) -> application data field
- reference (String?) -> Transaction ID, check number, e-transfer ref, etc.
- notes (String?) -> application data field
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- invoiceId -> Invoice.id
- clientId -> Client.id
- projectId -> Project.id
- tenantId -> Tenant.id

### Table: Expense

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- title (String) -> Expense Info
- description (String?) -> freeform description
- category (ExpenseCategory) -> Category & Amount
- amount (Decimal) -> application data field
- currency (Currency) -> application data field
- paymentMethod (PaymentMethod) -> Payment Info
- paymentDate (DateTime) -> application data field
- vendor (String?) -> Vendor/Merchant
- receiptNumber (String?) -> application data field
- status (ExpenseStatus) -> Status & Approval
- isReimbursable (Boolean) -> Reimbursement
- reimbursedAt (DateTime?) -> application data field
- createdById (String) -> Created by
- approvedById (String?) -> Approved by
- approvedAt (DateTime?) -> application data field
- approvalNotes (String?) -> application data field
- budgetId (String?) -> Budget relation (optional)
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- budgetId -> ExpenseBudget.id
- tenantId -> Tenant.id

### Table: ExpenseBudget

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- category (ExpenseCategory?) -> application data field
- amount (Decimal) -> application data field
- currency (Currency) -> application data field
- startDate (DateTime) -> Period
- endDate (DateTime) -> application data field
- spent (Decimal) -> Tracking
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- expenses (Expense[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: Booking

Live production rows (approx): 15

Columns:
- id (String) -> primary identifier
- title (String) -> Booking Info
- description (String?) -> freeform description
- status (BookingStatus) -> Status
- startTime (DateTime) -> Timing
- endTime (DateTime) -> application data field
- timezone (String) -> application data field
- clientId (String?) -> Client
- guestName (String?) -> External guest (if not a client)
- guestEmail (String?) -> application data field
- guestPhone (String?) -> application data field
- assignedToId (String?) -> Assignment
- location (String?) -> Location
- isOnline (Boolean) -> application data field
- meetingLink (String?) -> application data field
- notes (String?) -> Notes
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- confirmedAt (DateTime?) -> application data field
- cancelledAt (DateTime?) -> application data field
- serviceId (String?) -> Service relation (optional)

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- clientId -> Client.id
- assignedToId -> Employee.id
- tenantId -> Tenant.id
- serviceId -> Service.id

### Table: Service

Live production rows (approx): 1

Columns:
- id (String) -> primary identifier
- name (String) -> Service Info
- description (String?) -> freeform description
- category (String?) -> application data field
- basePrice (Decimal?) -> Pricing & Duration
- durationMinutes (Int?) -> application data field
- isActive (Boolean) -> Status
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- bookings (Booking[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: ProductCategory

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- description (String?) -> freeform description
- slug (String) -> application data field
- parentId (String?) -> reference to related parent
- children (ProductCategory[]) -> array field
- image (String?) -> Display
- sortOrder (Int) -> application data field
- isActive (Boolean) -> application data field
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- products (Product[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: Product

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- name (String) -> Product Info
- description (String?) -> freeform description
- sku (String) -> application data field
- slug (String) -> application data field
- price (Decimal) -> Pricing
- compareAtPrice (Decimal?) -> Original price for showing discount
- costPrice (Decimal?) -> Cost for profit calculation
- currency (Currency) -> application data field
- trackInventory (Boolean) -> Inventory
- quantity (Int) -> application data field
- lowStockThreshold (Int?) -> application data field
- status (ProductStatus) -> Status
- categoryId (String?) -> Category
- images (Json) -> Media Array of image URLs
- metaTitle (String?) -> SEO
- metaDescription (String?) -> application data field
- weight (Decimal?) -> Physical properties
- weightUnit (String?) -> application data field
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- orderItems (OrderItem[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- categoryId -> ProductCategory.id
- tenantId -> Tenant.id

### Table: Order

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- orderNumber (String) -> Order Number
- status (OrderStatus) -> Status
- clientId (String?) -> Client
- customerEmail (String) -> Customer Info (for guest orders)
- customerName (String) -> application data field
- customerPhone (String?) -> application data field
- billingAddress (Json) -> Addresses
- shippingAddress (Json) -> flexible JSON payload / denormalized metadata
- currency (Currency) -> Currency
- subtotal (Decimal) -> Amounts
- taxAmount (Decimal) -> application data field
- shippingAmount (Decimal) -> application data field
- discountAmount (Decimal) -> application data field
- total (Decimal) -> application data field
- paymentMethod (PaymentMethod?) -> Payment
- paymentStatus (String) -> pending, paid, failed, refunded
- paidAt (DateTime?) -> application data field
- shippingMethod (String?) -> Shipping
- trackingNumber (String?) -> application data field
- shippedAt (DateTime?) -> application data field
- deliveredAt (DateTime?) -> application data field
- notes (String?) -> Notes
- internalNotes (String?) -> application data field
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- items (OrderItem[]) -> Relations

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- clientId -> Client.id
- tenantId -> Tenant.id

### Table: OrderItem

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- orderId (String) -> reference to related order
- productId (String) -> reference to related product
- productName (String) -> Snapshot of product at time of order
- productSku (String) -> application data field
- quantity (Int) -> application data field
- unitPrice (Decimal) -> application data field
- total (Decimal) -> application data field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- orderId -> Order.id
- productId -> Product.id

### Table: Coupon


Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- leadId (String?) -> reference to related lead
- type (CommunicationType) -> application data field
- direction (CommunicationDirection) -> application data field
- subject (String?) -> application data field
- content (String) -> application data field
- to (String) -> application data field
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id
- leadId -> Lead.id

### Table: EmailLabel

Live production rows (approx): 6

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- color (String?) -> application data field
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- emails (EmailLabelAssignment[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: Email

Live production rows (approx): 43

Columns:
- id (String) -> primary identifier
- messageId (String?) -> Email metadata For external email systems
- threadId (String?) -> For conversation threading
- fromAddress (String) -> Sender/Recipients
- fromName (String?) -> application data field
- toAddresses (Json) -> Array of {email, name}
- ccAddresses (Json?) -> Array of {email, name}
- bccAddresses (Json?) -> Array of {email, name}
- replyTo (String?) -> application data field
- subject (String) -> Content
- bodyText (String?) -> application data field
- bodyHtml (String?) -> application data field
- status (EmailStatus) -> Status & Folder
- folder (EmailFolder) -> application data field
- isRead (Boolean) -> Flags
- isStarred (Boolean) -> application data field
- isImportant (Boolean) -> application data field
- hasAttachments (Boolean) -> application data field
- snoozedUntil (DateTime?) -> application data field
- scheduledFor (DateTime?) -> application data field
- size (BigInt) -> Size (for quota)
- sentById (String?) -> Sent by (if outgoing)
- mailboxOwnerUserId (String?) -> Mailbox owner (personal letter box)
- clientId (String?) -> Entity links (optional — link emails to CRM entities)
- contactId (String?) -> reference to related contact
- leadId (String?) -> reference to related lead
- quoteId (String?) -> reference to related quote
- projectId (String?) -> reference to related project
- sentAt (DateTime?) -> Timestamps
- receivedAt (DateTime?) -> application data field
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- deletedAt (DateTime?) -> Soft delete for trash
- labels (EmailLabelAssignment[]) -> Relations
- attachments (EmailAttachment[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- clientId -> Client.id
- contactId -> Contact.id
- leadId -> Lead.id
- quoteId -> Quote.id
- projectId -> Project.id
- tenantId -> Tenant.id

### Table: EmailLabelAssignment

Live production rows (approx): 2

Columns:
- id (String) -> primary identifier
- emailId (String) -> reference to related email
- labelId (String) -> reference to related label

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- emailId -> Email.id
- labelId -> EmailLabel.id

### Table: EmailAttachment

Live production rows (approx): 1

Columns:
- id (String) -> primary identifier
- emailId (String) -> reference to related email
- filename (String) -> application data field
- mimeType (String) -> application data field
- size (BigInt) -> application data field
- path (String) -> application data field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- emailId -> Email.id

### Table: ChatRoom

Live production rows (approx): 2

Columns:
- id (String) -> primary identifier
- name (String?) -> Room Info Null for 1-to-1 chats
- isGroup (Boolean) -> application data field
- lastMessageAt (DateTime?) -> Last message for quick access
- lastMessagePreview (String?) -> application data field
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- participants (ChatParticipant[]) -> Relations
- messages (ChatMessage[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: ChatParticipant

Live production rows (approx): 4

Columns:
- id (String) -> primary identifier
- roomId (String) -> reference to related room
- employeeId (String) -> reference to related employee
- role (String) -> Role in group chat admin, member
- lastReadAt (DateTime?) -> Read tracking
- unreadCount (Int) -> application data field
- isPinned (Boolean) -> application data field
- isMuted (Boolean) -> application data field
- isArchived (Boolean) -> application data field
- joinedAt (DateTime) -> Timestamps
- leftAt (DateTime?) -> application data field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- roomId -> ChatRoom.id
- employeeId -> Employee.id

### Table: ChatMessage

Live production rows (approx): 3

Columns:
- id (String) -> primary identifier
- roomId (String) -> reference to related room
- senderId (String?) -> Sender (null for system messages)
- content (String) -> Content
- messageType (String) -> text, image, file, system
- attachments (Json?) -> Attachments (stored as JSON for flexibility)
- isEdited (Boolean) -> Status
- editedAt (DateTime?) -> application data field
- createdAt (DateTime) -> Timestamps
- deletedAt (DateTime?) -> Soft delete

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- roomId -> ChatRoom.id

### Table: Notification

Live production rows (approx): 11688

Columns:
- id (String) -> primary identifier
- title (String) -> Content
- message (String) -> application data field
- type (NotificationType) -> application data field
- actionUrl (String?) -> Action (optional link)
- actionLabel (String?) -> application data field
- metadata (Json?) -> Metadata (flexible JSON for additional data)
- userId (String) -> Target user
- isRead (Boolean) -> Read status
- readAt (DateTime?) -> application data field
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- expiresAt (DateTime?) -> Optional expiration

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- userId -> User.id
- tenantId -> Tenant.id

### Table: AuditLog

Live production rows (approx): 3688

Columns:
- id (String) -> primary identifier
- action (AuditAction) -> Action details
- module (String) -> e.g., "auth", "leads", "invoices"
- description (String) -> freeform description
- entityType (String?) -> Entity reference e.g., "Lead", "Invoice"
- entityId (String?) -> reference to related entity
- oldValues (Json?) -> Changes (for update actions)
- newValues (Json?) -> application data field
- ipAddress (String?) -> Request info
- userAgent (String?) -> application data field
- requestMethod (String?) -> application data field
- requestPath (String?) -> application data field
- userId (String?) -> User who performed action
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- userId -> User.id
- tenantId -> Tenant.id

### Table: Tag

Live production rows (approx): 70

Columns:
- id (String) -> primary identifier
- name (String) -> display name
- color (String?) -> Hex color for UI
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- leads (LeadTag[]) -> Relations
- tasks (TaskTag[]) -> array field
- files (FileTag[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: TenantSettings

Live production rows (approx): 14

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- timezone (String) -> General Settings
- dateFormat (String) -> application data field
- timeFormat (String) -> application data field
- currency (Currency) -> application data field
- language (String) -> application data field
- fiscalYearStart (Int) -> Business Settings Month (1-12)
- invoicePrefix (String) -> Invoice Settings
- invoiceNextNumber (Int) -> application data field
- invoiceTerms (String?) -> application data field
- invoiceNotes (String?) -> application data field
- emailSignature (String?) -> Email Settings
- notificationSettings (Json) -> Notification Preferences (JSON)
- integrations (Json) -> Integration Flags (for future integrations)
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: UserPreferences

Live production rows (approx): 18

Columns:
- id (String) -> primary identifier
- userId (String) -> reference to related user
- theme (String) -> UI Preferences light, dark, system
- sidebarCollapsed (Boolean) -> application data field
- language (String) -> application data field
- emailNotifications (Boolean) -> Notification Preferences
- pushNotifications (Boolean) -> application data field
- notificationSound (Boolean) -> application data field
- dashboardLayout (Json) -> Dashboard Preferences (JSON for widget layout)
- tablePreferences (Json) -> Table Preferences (columns, sorting, etc.)
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- userId -> User.id

### Table: RoofEstimate

Live production rows (approx): 32

Columns:
- id (String) -> primary identifier
- address (String) -> Address & Geo
- latitude (Float) -> application data field
- longitude (Float) -> application data field
- satelliteImageUrl (String?) -> application data field
- placeId (String?) -> Google place_id for precise re-lookup
- locationType (String?) -> ROOFTOP, RANGE_INTERPOLATED, GEOMETRIC_CENTER, APPROXIMATE
- parcelPolygon (Json?) -> ATTOM parcel boundary polygon coordinates
- attomPropertyId (String?) -> ATTOM property identifier
- roofAreaSqft (Float) -> AI Results
- confidence (Float) -> application data field
- processingTimeSec (Float) -> application data field
- aiModel (String) -> application data field
- pitch (String?) -> Roof Characteristics e.g. "6/12", "8/12"
- pitchDegrees (Float?) -> calculated degrees from pitch ratio
- stories (Int?) -> application data field
- roofType (String?) -> gable, hip, flat, mansard, gambrel, shed
- layers (Int?) -> application data field
- ridgeLengthFt (Float?) -> Roof Measurements (linear ft)
- hipLengthFt (Float?) -> application data field
- valleyLengthFt (Float?) -> application data field
- eaveLengthFt (Float?) -> application data field
- rakeLengthFt (Float?) -> application data field
- trueSurfaceAreaSqft (Float?) -> pitch-adjusted area
- measurementSource (String?) -> Measurement Source 'ai_satellite', 'ai_photo', 'eagleview', 'manual'
- pricePerSqft (Float) -> Pricing
- manualAdjustment (Float) -> percentage adjustment
- totalEstimate (Float) -> application data field
- snowMode (Boolean) -> Flags
- tearOffRequired (Boolean) -> application data field
- notes (String?) -> application data field
- pdfUrl (String?) -> application data field
- damageReport (Json?) -> AI Damage Detection { areas: [{type, severity, bbox, confidence}] }
- photoUrls (Json?) -> array of uploaded photo URLs
- publicToken (String?) -> Public access (for e-sign / client view)
- roofPolygon (Json?) -> AI Segmentation Results GeoJSON polygon from segmentation mask
- roofPlanes (Json?) -> detected roof planes [{area, pitch, azimuth, vertices}]
- detectedLines (Json?) -> Hough/edge-detected structural lines
- solarValidated (Boolean) -> application data field
- correctionFactor (Float?) -> Solar API correction factor applied
- confidenceScore (Float?) -> composite 0-1 confidence
- flaggedForReview (Boolean) -> confidence < 0.75
- status (String) -> Wizard Workflow draft, completed, sent
- currentStep (Int) -> wizard step 1-6
- wastePercent (Float?) -> waste % for materials
- shingleType (String?) -> Step 2: Material Pricing
- shinglePricePerSq (Float?) -> application data field
- underlaymentCost (Float?) -> application data field
- iceWaterShieldCost (Float?) -> application data field
- ridgeCapCost (Float?) -> application data field
- starterStripCost (Float?) -> application data field
- flashingCostWizard (Float?) -> application data field
- ventCostWizard (Float?) -> application data field
- nailsAccessoriesCost (Float?) -> application data field
- totalMaterialCost (Float?) -> application data field
- laborCostPerSquare (Float?) -> Step 3: Labor
- numberOfLaborers (Int?) -> application data field
- daysRequired (Int?) -> application data field
- laborRatePerWorker (Float?) -> application data field
- totalLaborCost (Float?) -> application data field
- dumpsterCost (Float?) -> Step 4: Equipment / Extras
- permitCost (Float?) -> application data field
- deliveryFee (Float?) -> application data field
- equipmentRentalCost (Float?) -> application data field
- disposalFee (Float?) -> application data field
- totalEquipmentCost (Float?) -> application data field
- overheadPercent (Float?) -> Step 5: Profit & Overhead
- profitMarginPercent (Float?) -> application data field
- taxPercent (Float?) -> application data field
- overheadAmount (Float?) -> Step 6: Final calculations
- profitAmount (Float?) -> application data field
- taxAmount (Float?) -> application data field
- finalEstimatePrice (Float?) -> application data field
- tenantId (String) -> Relations
- clientId (String?) -> reference to related client
- leadId (String?) -> reference to related lead
- createdBy (String) -> application data field
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- quotes (Quote[]) -> Back-relations
- takeoffs (RoofTakeoff[]) -> array field
- solarData (SolarRoofData[]) -> array field
- proposals (Proposal[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id
- clientId -> Client.id
- leadId -> Lead.id

### Table: RoofEstimateSettings

Live production rows (approx): 1

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- defaultPricePerSqft (Float) -> application data field
- currency (String) -> application data field
- snowModeDefault (Boolean) -> application data field
- companyName (String?) -> For PDF branding
- companyLogo (String?) -> application data field
- companyPhone (String?) -> application data field
- companyEmail (String?) -> application data field
- companyAddress (String?) -> application data field
- pdfFooterText (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: RoofMaterial

Live production rows (approx): 1

Columns:
- id (String) -> primary identifier
- name (String) -> "OC Duration Shingles"
- category (String) -> shingles, underlayment, starter, cap, drip_edge, flashing, ice_shield, vent, nails
- unit (String) -> "bundle", "roll", "linear_ft", "each", "box"
- coveragePerUnit (Float) -> e.g. 33.3 sqft per bundle
- defaultPrice (Float) -> unit price
- supplier (String?) -> application data field
- sku (String?) -> application data field
- isActive (Boolean) -> application data field
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- takeoffItems (RoofTakeoffItem[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: RoofTakeoff

Live production rows (approx): 7

Columns:
- id (String) -> primary identifier
- estimateId (String) -> reference to related estimate
- scenarioName (String) -> e.g. "Asphalt Standard", "Metal Premium"
- materialType (String) -> "asphalt", "metal", "tile", "tpo", "cedar"
- wasteFactor (Float) -> Waste & Area percentage
- adjustedAreaSqft (Float?) -> after waste
- laborRatePerSqft (Float?) -> Cost Breakdown
- laborHours (Float?) -> application data field
- laborCost (Float?) -> application data field
- materialCost (Float?) -> application data field
- accessoryCost (Float?) -> application data field
- tearOffCost (Float?) -> application data field
- subtotal (Float?) -> application data field
- markupPercent (Float?) -> Markup & Profit
- profit (Float?) -> application data field
- totalPrice (Float?) -> application data field
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- items (RoofTakeoffItem[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- estimateId -> RoofEstimate.id
- tenantId -> Tenant.id

### Table: RoofTakeoffItem

Live production rows (approx): 66

Columns:
- id (String) -> primary identifier
- takeoffId (String) -> reference to related takeoff
- materialId (String?) -> reference to related material
- description (String) -> freeform description
- category (String) -> shingles, underlayment, starter, cap, drip_edge, ice_shield, flashing, vent, nails, boot, snow_guard
- quantity (Float) -> application data field
- unit (String) -> application data field
- unitPrice (Float) -> application data field
- wasteFactor (Float) -> application data field
- wasteQuantity (Float) -> quantity added for waste
- totalQuantity (Float) -> quantity + wasteQuantity
- totalPrice (Float) -> application data field
- sortOrder (Int) -> application data field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- takeoffId -> RoofTakeoff.id
- materialId -> RoofMaterial.id

### Table: RoofLaborRate

Live production rows (approx): 1

Columns:
- id (String) -> primary identifier
- description (String) -> "Standard Install", "Steep Pitch Surcharge", "2nd Story Surcharge"
- rateType (String) -> "per_sqft", "per_hour", "flat"
- rate (Float) -> application data field
- condition (String?) -> e.g. "pitch > 8/12", "stories >= 2", "tear_off"
- isActive (Boolean) -> application data field
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: Wallet

Live production rows (approx): 3

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- balance (Float) -> Starting test balance ($500)
- currency (String) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp
- transactions (WalletTransaction[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: WalletTransaction

Live production rows (approx): 26

Columns:
- id (String) -> primary identifier
- walletId (String) -> reference to related wallet
- type (String) -> "credit" | "debit"
- amount (Float) -> application data field
- description (String) -> freeform description
- balanceAfter (Float) -> application data field
- referenceType (String?) -> "estimate" | "manual" | "topup"
- referenceId (String?) -> estimate ID if applicable
- createdBy (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- walletId -> Wallet.id

### Table: Quote

Live production rows (approx): 7

Columns:
- id (String) -> primary identifier
- quoteNumber (String) -> Quote Number (auto-generated like invoices)
- status (QuoteStatus) -> Status
- clientId (String?) -> Client (optional — may be lead-only)
- leadId (String?) -> Lead (optional — for pre-client quotes)
- issueDate (DateTime) -> Dates
- validUntil (DateTime) -> application data field
- currency (String) -> Currency
- subtotal (Decimal) -> Amounts
- taxRate (Decimal?) -> application data field
- taxAmount (Decimal) -> application data field
- discountAmount (Decimal) -> application data field
- total (Decimal) -> application data field
- notes (String?) -> Notes & Terms
- terms (String?) -> application data field
- paymentScheduleType (String?) -> Stage 3: Payment & Warranty "full_upfront", "50_50", "milestone", "net_30"
- warrantySelected (String?) -> "standard", "extended", "premium"
- validDays (Int) -> application data field
- sourceEventId (String?) -> Source context (which meeting triggered this) Calendar event that triggered quote creation
- roofEstimateId (String?) -> Linked roof estimate (for PDF attachment on send)
- createdById (String?) -> Created by
- tenantId (String) -> Tenant relation
- publicToken (String?) -> Public access token for email link
- isContract (Boolean) -> application data field
- contractVersion (Int) -> application data field
- viewCount (Int) -> application data field
- firstViewedAt (DateTime?) -> application data field
- lastViewedAt (DateTime?) -> application data field
- signedAt (DateTime?) -> application data field
- signedBy (String?) -> application data field
- signatureType (String?) -> application data field
- signatureData (String?) -> application data field
- signerIpAddress (String?) -> application data field
- signerUserAgent (String?) -> application data field
- contractSnapshot (Json?) -> application data field
- auditTrail (Json?) -> application data field
- signedPdfFileId (String?) -> reference to related signedPdfFile
- rejectedAt (DateTime?) -> application data field
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- sentAt (DateTime?) -> application data field
- acceptedAt (DateTime?) -> application data field
- items (QuoteItem[]) -> Relations
- projects (Project[]) -> array field
- contracts (Contract[]) -> array field
- invoices (Invoice[]) -> array field
- files (File[]) -> array field
- emails (Email[]) -> array field
- proposals (Proposal[]) -> array field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- clientId -> Client.id
- leadId -> Lead.id
- roofEstimateId -> RoofEstimate.id
- tenantId -> Tenant.id

### Table: QuoteItem

Live production rows (approx): 8

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- description (String) -> freeform description
- quantity (Decimal) -> application data field
- unitPrice (Decimal) -> application data field
- total (Decimal) -> application data field
- sortOrder (Int) -> Sort order
- quoteId (String) -> Parent Quote

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id
- quoteId -> Quote.id

### Table: Proposal

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- proposalNumber (String) -> PR-YYYY-0001
- status (ProposalStatus) -> Status
- leadId (String) -> Links
- quoteId (String) -> reference to related quote
- roofEstimateId (String?) -> reference to related roofEstimate
- customMessageToClient (String?) -> Content
- coverPageHtml (String?) -> application data field
- scopeOfWork (String?) -> application data field
- termsAndConditions (String?) -> application data field
- pdfUrl (String?) -> PDF
- pdfGeneratedAt (DateTime?) -> application data field
- publicToken (String?) -> E-Signature
- signedAt (DateTime?) -> application data field
- signedByName (String?) -> application data field
- signatureData (String?) -> base64 signature image
- initials (String?) -> Stage 5: signer initials
- signerIpAddress (String?) -> Stage 5: IP address at signing
- lastViewedAt (DateTime?) -> Stage 4: View Tracking & Delivery
- viewCount (Int) -> application data field
- deliveryMethod (String?) -> "email", "sms", "email_sms"
- tenantId (String) -> Tenant
- createdById (String?) -> Created by
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp
- sentAt (DateTime?) -> application data field

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- leadId -> Lead.id
- quoteId -> Quote.id
- roofEstimateId -> RoofEstimate.id
- tenantId -> Tenant.id

### Table: SignedContract

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- proposalId (String) -> References
- leadId (String) -> reference to related lead
- clientId (String?) -> reference to related client
- fullLegalName (String) -> E-Signature Data
- signatureImage (String) -> application data field
- initials (String) -> application data field
- dateSigned (DateTime) -> application data field
- ipAddress (String) -> application data field
- signedPdfUrl (String?) -> Signed PDF
- tenantId (String) -> Tenant
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: Contract

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- contractNumber (String) -> Contract Number (auto-generated like invoices)
- title (String) -> application data field
- description (String?) -> freeform description
- status (ContractStatus) -> Status
- clientId (String) -> Linked entities
- quoteId (String?) -> reference to related quote
- projectId (String?) -> reference to related project
- value (Decimal) -> Financial
- currency (String) -> application data field
- startDate (DateTime) -> Dates
- endDate (DateTime) -> application data field
- signedAt (DateTime?) -> application data field
- terms (String?) -> Terms & Content
- notes (String?) -> application data field
- createdById (String?) -> Created by
- tenantId (String) -> Tenant relation
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- clientId -> Client.id
- quoteId -> Quote.id
- projectId -> Project.id
- tenantId -> Tenant.id

### Table: RoofData

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- source (String) -> Source & Location
- address (String?) -> application data field
- latitude (Float?) -> application data field
- longitude (Float?) -> application data field
- buildingOutline (Json?) -> AI Extraction Results GeoJSON polygon of building footprint
- roofOutline (Json?) -> GeoJSON polygon of roof outline
- propertyInsights (Json?) -> Structured AI insights (area, material, condition)
- areaSqFt (Float?) -> Total roof area in sq ft
- rawApiResponse (Json?) -> Raw API Response (audit/debugging)
- clientId (String) -> Relations
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- clientId -> Client.id
- tenantId -> Tenant.id

### Table: SolarRoofData

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- latitude (Float) -> Location
- longitude (Float) -> application data field
- address (String?) -> application data field
- roofAreaSqft (Float?) -> Solar API Extracted Data converted from roofAreaMeters2
- roofAreaMeters2 (Float?) -> raw from API
- roofSegments (Json?) -> roofSegmentStats array from API
- pitchDegrees (Float?) -> primary pitch
- azimuthDegrees (Float?) -> primary azimuth
- maxSunshineHours (Float?) -> application data field
- carbonOffset (Float?) -> annual kg CO2 offset
- panelCapacity (Int?) -> max solar panel count
- rawResponse (Json?) -> Raw API Response (audit/debugging)
- estimateId (String?) -> Relations
- tenantId (String) -> workspace / tenant scope key
- createdAt (DateTime) -> Timestamps
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- estimateId -> RoofEstimate.id
- tenantId -> Tenant.id

### Table: SuperAdmin

Live production rows (approx): 1

Columns:
- id (String) -> primary identifier
- email (String) -> email address
- passwordHash (String) -> application data field
- firstName (String) -> application data field
- lastName (String) -> application data field
- role (String) -> application data field
- isActive (Boolean) -> application data field
- twoFactorEnabled (Boolean) -> application data field
- twoFactorSecret (String?) -> application data field
- lastLoginAt (DateTime?) -> application data field
- lastLoginIp (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- None detected

### Table: Subscription

Live production rows (approx): 8

Columns:
- id (String) -> primary identifier
- tenantId (String) -> workspace / tenant scope key
- planType (String) -> application data field
- billingCycle (String) -> application data field
- status (String) -> lifecycle or workflow status
- startDate (DateTime) -> application data field
- nextBillingDate (DateTime?) -> application data field
- cancelledAt (DateTime?) -> application data field
- monthlyRate (Decimal) -> application data field
- totalPaid (Decimal) -> reference to related totalPa
- failedPayments (Int) -> application data field
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: AdminAuditLog

Live production rows (approx): 98

Columns:
- id (String) -> primary identifier
- adminId (String) -> reference to related admin
- action (String) -> application data field
- targetType (String?) -> application data field
- targetId (String?) -> reference to related target
- metadata (Json?) -> application data field
- ipAddress (String?) -> application data field
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- adminId -> inferred application-level reference to admin
- targetId -> inferred application-level reference to target

### Table: ConstructionEstimate

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- projectName (String) -> ── Project Details ──
- projectType (EstimateProjectType) -> application data field
- status (EstimateStatus) -> lifecycle or workflow status
- currency (Currency) -> application data field
- paymentTerms (String?) -> e.g. "Net 30", "50% upfront"
- startDate (DateTime?) -> application data field
- endDate (DateTime?) -> application data field
- address (String) -> ── Address & Geo ──
- formattedAddress (String?) -> application data field
- placeId (String?) -> Google place_id
- latitude (Float?) -> application data field
- longitude (Float?) -> application data field
- city (String?) -> application data field
- postalCode (String?) -> application data field
- country (String?) -> application data field
- satelliteImageUrl (String?) -> application data field
- totalMaterialCost (Float) -> ── Summary Totals (auto-calculated) ──
- totalLabourCost (Float) -> application data field
- totalEquipmentCost (Float) -> application data field
- totalTransportCost (Float) -> application data field
- subtotal (Float) -> application data field
- taxPercent (Float) -> ── Additional Costs ── GST/HST %
- taxAmount (Float) -> application data field
- overheadPercent (Float) -> application data field
- overheadCost (Float) -> application data field
- profitPercent (Float) -> application data field
- profitMargin (Float) -> application data field
- miscellaneousCost (Float) -> application data field
- safetyEquipmentCost (Float) -> application data field
- wastagePercent (Float) -> application data field
- contingencyBudget (Float) -> application data field
- grandTotal (Float) -> application data field
- clientNotes (String?) -> ── Notes ──
- internalNotes (String?) -> application data field
- termsAndConditions (String?) -> application data field
- tenantId (String) -> ── Relations ──
- clientId (String?) -> reference to related client
- leadId (String?) -> reference to related lead
- createdBy (String) -> employeeId
- materials (EstimateMaterial[]) -> array field
- labour (EstimateLabour[]) -> array field
- equipment (EstimateEquipment[]) -> array field
- transport (EstimateTransport[]) -> array field
- createdAt (DateTime) -> ── Timestamps ──
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: EstimateMeasurement

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- roofArea (Float?) -> ── EagleView Data ── sq ft
- ridgeLength (Float?) -> ft
- valleyLength (Float?) -> ft
- hipLength (Float?) -> ft
- eaveLength (Float?) -> ft
- rakeLength (Float?) -> ft
- pitch (String?) -> e.g. "6/12"
- facets (Int?) -> application data field
- roofPlanes (Int?) -> application data field
- totalPerimeter (Float?) -> application data field
- slopeChange (Float?) -> application data field
- stepFlashing (Float?) -> application data field
- headwallFlashing (Float?) -> application data field
- source (String?) -> ── Source ── eagleview, manual
- eagleViewOrderId (String?) -> reference to related eagleViewOrder
- eagleViewReportId (String?) -> reference to related eagleViewReport
- estimateId (String) -> ── Relation ──
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- estimateId -> ConstructionEstimate.id

### Table: EstimateMaterial

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- sortOrder (Int) -> application data field
- materialName (String) -> application data field
- materialCategory (String?) -> freeform category
- quantity (Float) -> application data field
- unit (MaterialUnit) -> application data field
- ratePerUnit (Float) -> application data field
- totalCost (Float) -> quantity × rate
- supplierName (String?) -> application data field
- notes (String?) -> application data field
- estimateId (String) -> ── Relation ──
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- estimateId -> ConstructionEstimate.id

### Table: EstimateLabour

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- sortOrder (Int) -> application data field
- labourType (LabourType) -> application data field
- description (String?) -> freeform description
- numberOfWorkers (Int) -> application data field
- workingDays (Int) -> application data field
- hoursPerDay (Float) -> application data field
- ratePerDay (Float) -> application data field
- overtimeHours (Float) -> application data field
- overtimeRate (Float) -> application data field
- baseCost (Float) -> workers × days × rate
- overtimeCost (Float) -> workers × otHours × otRate
- totalCost (Float) -> base + overtime
- estimateId (String) -> ── Relation ──
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- estimateId -> ConstructionEstimate.id

### Table: EstimateEquipment

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- sortOrder (Int) -> application data field
- equipmentName (String) -> application data field
- mode (EquipmentMode) -> application data field
- numberOfUnits (Int) -> application data field
- durationDays (Int) -> application data field
- costPerDay (Float) -> application data field
- totalCost (Float) -> units × days × costPerDay
- estimateId (String) -> ── Relation ──
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- estimateId -> ConstructionEstimate.id

### Table: EstimateTransport

Live production rows (approx): 0

Columns:
- id (String) -> primary identifier
- sortOrder (Int) -> application data field
- transportType (String) -> application data field
- distance (Float?) -> km or miles
- numberOfTrips (Int) -> application data field
- costPerTrip (Float) -> application data field
- totalCost (Float) -> trips × costPerTrip
- estimateId (String) -> ── Relation ──
- createdAt (DateTime) -> record creation timestamp
- updatedAt (DateTime) -> record last update timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- estimateId -> ConstructionEstimate.id

### Table: SupportTicket

Live production rows (approx): 27

Columns:
- id (String) -> primary identifier
- ticketNumber (String) -> application data field
- subject (String) -> application data field
- description (String) -> freeform description
- status (TicketStatus) -> lifecycle or workflow status
- priority (TicketPriority) -> application data field
- category (String) -> application data field
- requesterUserId (String?) -> reference to related requesterUser
- requesterName (String) -> application data field
- requesterEmail (String) -> application data field
- assignee (String?) -> application data field
- messagesCount (Int) -> application data field
- tags (String[]) -> array field
- attachments (Json) -> flexible JSON payload / denormalized metadata
- tenantId (String) -> ── Tenant scope ──
- messages (TicketMessage[]) -> ── Messages ──
- createdAt (DateTime) -> ── Timestamps ──
- updatedAt (DateTime) -> record last update timestamp
- resolvedAt (DateTime?) -> application data field
- deletedAt (DateTime?) -> soft delete timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- tenantId -> Tenant.id

### Table: TicketMessage

Live production rows (approx): 90

Columns:
- id (String) -> primary identifier
- sender (String) -> application data field
- message (String) -> application data field
- isStaff (Boolean) -> application data field
- isInternal (Boolean) -> application data field
- ticketId (String) -> ── Ticket relation ──
- createdAt (DateTime) -> record creation timestamp

Primary Key:
- id

Foreign Keys (explicit OR inferred):
- ticketId -> SupportTicket.id

## 3. RELATIONSHIP MAP

- Application.tenantId -> Tenant.id (Many-to-One via tenant)
- AuditLog.tenantId -> Tenant.id (Many-to-One via tenant)
- AuditLog.userId -> User.id (Many-to-One via user)
- Availability.employeeId -> Employee.id (Many-to-One via employee)
- Booking.assignedToId -> Employee.id (Many-to-One via assignedTo)
- Booking.clientId -> Client.id (Many-to-One via client)
- Booking.serviceId -> Service.id (Many-to-One via service)
- Booking.tenantId -> Tenant.id (Many-to-One via tenant)
- CalendarEvent.clientId -> Client.id (Many-to-One via client)
- CalendarEvent.leadId -> Lead.id (Many-to-One via lead)
- CalendarEvent.tenantId -> Tenant.id (Many-to-One via tenant)
- CalendarEventAttendee.employeeId -> Employee.id (Many-to-One via employee)
- CalendarEventAttendee.eventId -> CalendarEvent.id (Many-to-One via event)
- CalendarEventAttendee.tenantId -> Tenant.id (Many-to-One via tenant)
- ChangeOrder.projectId -> Project.id (Many-to-One via project)
- ChatMessage.roomId -> ChatRoom.id (Many-to-One via room)
- ChatParticipant.employeeId -> Employee.id (Many-to-One via employee)
- ChatParticipant.roomId -> ChatRoom.id (Many-to-One via room)
- ChatRoom.tenantId -> Tenant.id (Many-to-One via tenant)
- ChecklistItem.templateId -> ChecklistTemplate.id (Many-to-One via template)
- ChecklistSubmission.employeeId -> Employee.id (Many-to-One via employee)
- ChecklistSubmission.projectId -> Project.id (Many-to-One via project)
- ChecklistSubmission.templateId -> ChecklistTemplate.id (Many-to-One via template)
- ChecklistSubmission.tenantId -> Tenant.id (Many-to-One via tenant)
- ChecklistTemplate.tenantId -> Tenant.id (Many-to-One via tenant)
- Client.tenantId -> Tenant.id (Many-to-One via tenant)
- ClientGroup.tenantId -> Tenant.id (Many-to-One via tenant)
- ClientGroupMember.clientId -> Client.id (Many-to-One via client)
- ClientGroupMember.groupId -> ClientGroup.id (Many-to-One via group)
- ConstructionEstimate.tenantId -> Tenant.id (Many-to-One via tenant)
- Contact.companyId -> Client.id (Many-to-One via company)
- Contact.tenantId -> Tenant.id (Many-to-One via tenant)
- Contract.clientId -> Client.id (Many-to-One via client)
- Contract.projectId -> Project.id (Many-to-One via project)
- Contract.quoteId -> Quote.id (Many-to-One via quote)
- Contract.tenantId -> Tenant.id (Many-to-One via tenant)
- Coupon.leadId -> Lead.id (Many-to-One via lead)
- Coupon.tenantId -> Tenant.id (Many-to-One via tenant)
- CrewNotification.employeeId -> Employee.id (Many-to-One via employee)
- CrewNotification.tenantId -> Tenant.id (Many-to-One via tenant)
- Email.clientId -> Client.id (Many-to-One via client)
- Email.contactId -> Contact.id (Many-to-One via contact)
- Email.leadId -> Lead.id (Many-to-One via lead)
- Email.projectId -> Project.id (Many-to-One via project)
- Email.quoteId -> Quote.id (Many-to-One via quote)
- Email.tenantId -> Tenant.id (Many-to-One via tenant)
- EmailAttachment.emailId -> Email.id (Many-to-One via email)
- EmailLabel.tenantId -> Tenant.id (Many-to-One via tenant)
- EmailLabelAssignment.emailId -> Email.id (Many-to-One via email)
- EmailLabelAssignment.labelId -> EmailLabel.id (Many-to-One via label)
- Employee.roleId -> Role.id (Many-to-One via role)
- Employee.tenantId -> Tenant.id (Many-to-One via tenant)
- Employee.userId -> User.id (Many-to-One via user)
- EmployeeDocument.employeeId -> Employee.id (Many-to-One via employee)
- EmployeeDocument.tenantId -> Tenant.id (Many-to-One via tenant)
- Equipment.assignedToId -> Employee.id (Many-to-One via assignedTo)
- Equipment.tenantId -> Tenant.id (Many-to-One via tenant)
- EstimateEquipment.estimateId -> ConstructionEstimate.id (Many-to-One via estimate)
- EstimateLabour.estimateId -> ConstructionEstimate.id (Many-to-One via estimate)
- EstimateMaterial.estimateId -> ConstructionEstimate.id (Many-to-One via estimate)
- EstimateMeasurement.estimateId -> ConstructionEstimate.id (Many-to-One via estimate)
- EstimateTransport.estimateId -> ConstructionEstimate.id (Many-to-One via estimate)
- Expense.budgetId -> ExpenseBudget.id (Many-to-One via budget)
- Expense.tenantId -> Tenant.id (Many-to-One via tenant)
- ExpenseBudget.tenantId -> Tenant.id (Many-to-One via tenant)
- File.applicationId -> Application.id (Many-to-One via application)
- File.clientId -> Client.id (Many-to-One via client)
- File.folderId -> Folder.id (Many-to-One via folder)
- File.leadId -> Lead.id (Many-to-One via lead)
- File.projectId -> Project.id (Many-to-One via project)
- File.quoteId -> Quote.id (Many-to-One via quote)
- File.tenantId -> Tenant.id (Many-to-One via tenant)
- FileTag.fileId -> File.id (Many-to-One via file)
- FileTag.tagId -> Tag.id (Many-to-One via tag)
- Folder.tenantId -> Tenant.id (Many-to-One via tenant)
- IncidentReport.projectId -> Project.id (Many-to-One via project)
- IncidentReport.reportedById -> Employee.id (Many-to-One via reportedBy)
- IncidentReport.tenantId -> Tenant.id (Many-to-One via tenant)
- Invoice.clientId -> Client.id (Many-to-One via client)
- Invoice.projectId -> Project.id (Many-to-One via project)
- Invoice.quoteId -> Quote.id (Many-to-One via quote)
- Invoice.tenantId -> Tenant.id (Many-to-One via tenant)
- InvoiceItem.invoiceId -> Invoice.id (Many-to-One via invoice)
- InvoiceItem.tenantId -> Tenant.id (Many-to-One via tenant)
- InvoicePayment.clientId -> Client.id (Many-to-One via client)
- InvoicePayment.invoiceId -> Invoice.id (Many-to-One via invoice)
- InvoicePayment.projectId -> Project.id (Many-to-One via project)
- InvoicePayment.tenantId -> Tenant.id (Many-to-One via tenant)
- JobCompletion.completedById -> Employee.id (Many-to-One via completedBy)
- JobCompletion.projectId -> Project.id (Many-to-One via project)
- JobCompletion.tenantId -> Tenant.id (Many-to-One via tenant)
- JobMessage.projectId -> Project.id (Many-to-One via project)
- JobMessage.senderId -> Employee.id (Many-to-One via sender)
- JobMessage.tenantId -> Tenant.id (Many-to-One via tenant)
- JobNote.employeeId -> Employee.id (Many-to-One via employee)
- JobNote.projectId -> Project.id (Many-to-One via project)
- JobNote.tenantId -> Tenant.id (Many-to-One via tenant)
- JobPhoto.employeeId -> Employee.id (Many-to-One via employee)
- JobPhoto.projectId -> Project.id (Many-to-One via project)
- JobPhoto.tenantId -> Tenant.id (Many-to-One via tenant)
- Lead.leadSourceId -> LeadSource.id (Many-to-One via leadSource)
- Lead.tenantId -> Tenant.id (Many-to-One via tenant)
- LeadActivity.leadId -> Lead.id (Many-to-One via lead)
- LeadContactedDetails.leadId -> Lead.id (Many-to-One via lead)
- LeadContactedDetails.tenantId -> Tenant.id (Many-to-One via tenant)
- LeadInspection.leadId -> Lead.id (Many-to-One via lead)
- LeadInspection.tenantId -> Tenant.id (Many-to-One via tenant)
- LeadInsuranceClaim.leadId -> Lead.id (Many-to-One via lead)
- LeadInsuranceClaim.tenantId -> Tenant.id (Many-to-One via tenant)
- LeadSource.tenantId -> Tenant.id (Many-to-One via tenant)
- LeadSourceCredential.leadSourceId -> LeadSource.id (Many-to-One via leadSource)
- LeadSourceLog.leadSourceId -> LeadSource.id (Many-to-One via leadSource)
- LeadSourceWebhook.leadSourceId -> LeadSource.id (Many-to-One via leadSource)
- LeadTag.leadId -> Lead.id (Many-to-One via lead)
- LeadTag.tagId -> Tag.id (Many-to-One via tag)
- LeaveRequest.tenantId -> Tenant.id (Many-to-One via tenant)
- LocationPing.employeeId -> Employee.id (Many-to-One via employee)
- LocationPing.timeEntryId -> TimeEntry.id (Many-to-One via timeEntry)
- MaterialRequest.projectId -> Project.id (Many-to-One via project)
- MaterialRequest.requestedById -> Employee.id (Many-to-One via requestedBy)
- MaterialRequest.tenantId -> Tenant.id (Many-to-One via tenant)
- Notification.tenantId -> Tenant.id (Many-to-One via tenant)
- Notification.userId -> User.id (Many-to-One via user)
- Order.clientId -> Client.id (Many-to-One via client)
- Order.tenantId -> Tenant.id (Many-to-One via tenant)
- OrderItem.orderId -> Order.id (Many-to-One via order)
- OrderItem.productId -> Product.id (Many-to-One via product)
- Product.categoryId -> ProductCategory.id (Many-to-One via category)
- Product.tenantId -> Tenant.id (Many-to-One via tenant)
- ProductCategory.tenantId -> Tenant.id (Many-to-One via tenant)
- Project.clientId -> Client.id (Many-to-One via client)
- Project.leadId -> Lead.id (Many-to-One via lead)
- Project.quoteId -> Quote.id (Many-to-One via quote)
- Project.stageId -> ProjectStage.id (Many-to-One via stage)
- Project.tenantId -> Tenant.id (Many-to-One via tenant)
- ProjectCommunication.projectId -> Project.id (Many-to-One via project)
- ProjectCrewAssignment.crewId -> Crew.id (Many-to-One via crew)
- ProjectCrewAssignment.projectId -> Project.id (Many-to-One via project)
- ProjectDocument.projectId -> Project.id (Many-to-One via project)
- ProjectExpense.projectId -> Project.id (Many-to-One via project)
- ProjectInspection.projectId -> Project.id (Many-to-One via project)
- ProjectLabor.crewAssignmentId -> ProjectCrewAssignment.id (Many-to-One via crewAssignment)
- ProjectLabor.projectId -> Project.id (Many-to-One via project)
- ProjectLabor.taskId -> ProjectTask.id (Many-to-One via task)
- ProjectMaterial.projectId -> Project.id (Many-to-One via project)
- ProjectMaterial.purchaseOrderId -> PurchaseOrder.id (Many-to-One via purchaseOrder)
- ProjectMaterial.supplierId -> Supplier.id (Many-to-One via supplier)
- ProjectMember.employeeId -> Employee.id (Many-to-One via employee)
- ProjectMember.projectId -> Project.id (Many-to-One via project)
- ProjectNote.projectId -> Project.id (Many-to-One via project)
- ProjectPhoto.projectId -> Project.id (Many-to-One via project)
- ProjectPhoto.taskId -> ProjectTask.id (Many-to-One via task)
- ProjectStageHistory.projectId -> Project.id (Many-to-One via project)
- ProjectStageHistory.stageId -> ProjectStage.id (Many-to-One via stage)
- ProjectTask.projectId -> Project.id (Many-to-One via project)
- Proposal.leadId -> Lead.id (Many-to-One via lead)
- Proposal.quoteId -> Quote.id (Many-to-One via quote)
- Proposal.roofEstimateId -> RoofEstimate.id (Many-to-One via roofEstimate)
- Proposal.tenantId -> Tenant.id (Many-to-One via tenant)
- PurchaseOrder.projectId -> Project.id (Many-to-One via project)
- PurchaseOrder.supplierId -> Supplier.id (Many-to-One via supplier)
- Quote.clientId -> Client.id (Many-to-One via client)
- Quote.leadId -> Lead.id (Many-to-One via lead)
- Quote.roofEstimateId -> RoofEstimate.id (Many-to-One via roofEstimate)
- Quote.tenantId -> Tenant.id (Many-to-One via tenant)
- QuoteItem.quoteId -> Quote.id (Many-to-One via quote)
- QuoteItem.tenantId -> Tenant.id (Many-to-One via tenant)
- RefreshToken.userId -> User.id (Many-to-One via user)
- Role.tenantId -> Tenant.id (Many-to-One via tenant)
- RolePermission.permissionId -> Permission.id (Many-to-One via permission)
- RolePermission.roleId -> Role.id (Many-to-One via role)
- RoofData.clientId -> Client.id (Many-to-One via client)
- RoofData.tenantId -> Tenant.id (Many-to-One via tenant)
- RoofEstimate.clientId -> Client.id (Many-to-One via client)
- RoofEstimate.leadId -> Lead.id (Many-to-One via lead)
- RoofEstimate.tenantId -> Tenant.id (Many-to-One via tenant)
- RoofEstimateSettings.tenantId -> Tenant.id (Many-to-One via tenant)
- RoofLaborRate.tenantId -> Tenant.id (Many-to-One via tenant)
- RoofMaterial.tenantId -> Tenant.id (Many-to-One via tenant)
- RoofTakeoff.estimateId -> RoofEstimate.id (Many-to-One via estimate)
- RoofTakeoff.tenantId -> Tenant.id (Many-to-One via tenant)
- RoofTakeoffItem.materialId -> RoofMaterial.id (Many-to-One via material)
- RoofTakeoffItem.takeoffId -> RoofTakeoff.id (Many-to-One via takeoff)
- Service.tenantId -> Tenant.id (Many-to-One via tenant)
- SignedContract.tenantId -> Tenant.id (Many-to-One via tenant)
- SolarRoofData.estimateId -> RoofEstimate.id (Many-to-One via estimate)
- SolarRoofData.tenantId -> Tenant.id (Many-to-One via tenant)
- Subscription.tenantId -> Tenant.id (Many-to-One via tenant)
- SupportTicket.tenantId -> Tenant.id (Many-to-One via tenant)
- Tag.tenantId -> Tenant.id (Many-to-One via tenant)
- Task.clientId -> Client.id (Many-to-One via client)
- Task.projectId -> Project.id (Many-to-One via project)
- Task.tenantId -> Tenant.id (Many-to-One via tenant)
- TaskTag.tagId -> Tag.id (Many-to-One via tag)
- TaskTag.taskId -> Task.id (Many-to-One via task)
- TaskTag.tenantId -> Tenant.id (Many-to-One via tenant)
- TenantSettings.tenantId -> Tenant.id (Many-to-One via tenant)
- TicketMessage.ticketId -> SupportTicket.id (Many-to-One via ticket)
- TimeEntry.employeeId -> Employee.id (Many-to-One via employee)
- TimeEntry.projectId -> Project.id (Many-to-One via project)
- TimeEntry.taskId -> Task.id (Many-to-One via task)
- TimeEntry.tenantId -> Tenant.id (Many-to-One via tenant)
- User.tenantId -> Tenant.id (Many-to-One via tenant)
- UserAccess.employeeId -> Employee.id (Many-to-One via employee)
- UserAccess.tenantId -> Tenant.id (Many-to-One via tenant)
- UserPreferences.userId -> User.id (Many-to-One via user)
- Wallet.tenantId -> Tenant.id (Many-to-One via tenant)
- WalletTransaction.walletId -> Wallet.id (Many-to-One via wallet)
- WeatherDelay.projectId -> Project.id (Many-to-One via project)

## 4. ER DIAGRAM (TEXT FORMAT)

```text
Tenant
 ├── User
 │    ├── RefreshToken
 │    ├── UserPreferences
 │    ├── Notification
 │    └── Employee
 │         ├── Role
 │         │    └── RolePermission
 │         │         └── Permission
 │         ├── UserAccess
 │         ├── Task
 │         ├── CalendarEvent / CalendarEventAttendee
 │         ├── Quote / Invoice / Contract / Proposal
 │         ├── TimeEntry / LeaveRequest / EmployeeDocument
 │         └── ChatParticipant
 ├── Lead
 │    ├── LeadActivity
 │    ├── LeadContactedDetails
 │    ├── LeadInspection
 │    ├── LeadInsuranceClaim
 │    ├── LeadTag -> Tag
 │    ├── Quote / Proposal
 │    └── RoofEstimate
 ├── Client
 │    ├── Contact
 │    ├── Project
 │    │    ├── ProjectTask / ProjectMaterial / ProjectLabor / ProjectExpense
 │    │    ├── ProjectDocument / ProjectPhoto / ProjectNote / ProjectCommunication
 │    │    ├── ProjectInspection / ChangeOrder / WeatherDelay / PurchaseOrder
 │    │    ├── JobPhoto / JobNote / JobMessage / JobCompletion
 │    │    └── Invoice / Contract / TimeEntry
 │    ├── Booking
 │    ├── Order -> OrderItem -> Product
 │    ├── Quote -> QuoteItem
 │    ├── Invoice -> InvoiceItem / InvoicePayment
 │    └── RoofEstimate / RoofData
 ├── File / Folder / Tag
 ├── Email / EmailAttachment / EmailLabelAssignment
 ├── ChatRoom -> ChatParticipant / ChatMessage
 ├── SupportTicket -> TicketMessage
 ├── RoofEstimate -> RoofTakeoff -> RoofTakeoffItem
 ├── ConstructionEstimate -> Measurement / Material / Labour / Equipment / Transport
 ├── Wallet -> WalletTransaction
 ├── TenantSettings / Subscription
 └── AuditLog
```

## 5. DATA FLOW (IMPORTANT)

### Authentication
- Authentication is JWT-based. User is the login identity. RefreshToken stores long-lived refresh sessions with rotation metadata (revokedAt, replacedBy, userAgent, ipAddress).
- After JWT verification, middleware populates req.user with userId, tenantId, employeeId, and role name from token claims.
- A second middleware resolves active tenant membership through Employee, then loads permissions from Role -> RolePermission -> Permission.

### Tenant isolation
- Runtime tenant isolation is centered on req.context.tenantId from the verified JWT, then re-validated against active employee membership.
- Database isolation is mostly explicit: most operational tables include tenantId and index it.
- Some cross-tenant risk remains in tables without tenantId and in app logic that still performs global lookups.

### CRM lifecycle
- Lead is the first-class pre-customer object. It can collect marketing attribution, qualification fields, roof details, insurance information, inspections, claims, activities, files, estimates, and quotes.
- Lead.convertedToClientId signals a lead-to-client conversion. Client is then the post-conversion account entity.
- Project bridges sales and operations. A project can originate from a lead and/or quote, then own materials, labor, inspections, expenses, communications, job photos, and invoices.

### Revenue flow
- Quote supports lead-only or client-linked selling, public signing, contract snapshots, and roof-estimate attachment.
- Invoice is client-owned, optionally linked to project and quote, and breaks down into InvoiceItem plus InvoicePayment.
- Contract is a separate legal agreement object, often downstream of quote/project/client.

### Communication flow
- Email is modeled as metadata with CRM links to client/contact/lead/quote/project. Attachments are stored separately in EmailAttachment.
- Chat is room-based (ChatRoom, ChatParticipant, ChatMessage) and currently relies on room membership for tenant context instead of explicit tenantId on every child row.
- Notifications and audit logs are global operational exhaust tables; they record user-facing state and platform actions across modules.

## 6. HIDDEN LOGIC (CRITICAL)

- User is not the business actor. Employee is the real tenant-scoped actor. New developers will be confused if they assume User equals staff membership.
- User.tenantId exists, but true membership is really governed by Employee(tenantId, userId). That means the system is half “single active tenant on user” and half “multi-tenant by employee memberships.”
- Role assignment is effectively single-role-per-employee via Employee.roleId, even though RBAC permissions are normalized. There is no true many-role-per-user-per-tenant mapping table.
- Fine-grained record-level access is partially implemented via UserAccess plus app-layer helpers in data-access.ts. This is separate from RBAC and acts like manual row-level ACLs for clients/projects.
- Several modules use Json and String[] as mini document stores: Tenant.settings, User.preferences, Client.tags, sharedWith, attachments, photos, auditTrail, contractSnapshot, knownDamageType. These hide business logic from strict relational modeling.
- Email credentials are not modeled as first-class tables. Personal mailbox configuration is stored encrypted inside user preferences JSON at the application layer, not normalized relationally.
- LeadSource is much more than a picklist. It includes OAuth tokens, webhook config, cost tracking, and assignment rules, meaning it behaves like an integration object.
- There are overlapping concepts: Application, Quote, Proposal, Contract, and ConstructionEstimate all represent different stages or document types around selling/building, which creates conceptual overlap for developers.
- Roofing specialization is embedded directly into core customer tables (Lead, Client, Project), not isolated as a plugin/module boundary.

## 7. TENANT ISOLATION ANALYSIS

### Tables WITH tenantId
- User
- Employee
- Role
- UserAccess
- LeadSource
- Lead
- LeadContactedDetails
- LeadInspection
- LeadInsuranceClaim
- Client
- Contact
- ClientGroup
- Application
- Task
- TaskTag
- Project
- ProjectStage
- ProjectStageHistory
- ProjectTask
- ProjectMaterial
- ProjectCrewAssignment
- ProjectLabor
- ProjectExpense
- ProjectDocument
- ProjectPhoto
- ProjectNote
- ProjectCommunication
- ProjectInspection
- ChangeOrder
- WeatherDelay
- Crew
- Supplier
- PurchaseOrder
- TimeEntry
- JobNote
- CrewNotification
- ChecklistTemplate
- ChecklistSubmission
- JobPhoto
- JobMessage
- Equipment
- MaterialRequest
- IncidentReport
- LeaveRequest
- EmployeeDocument
- JobCompletion
- CalendarEvent
- CalendarEventAttendee
- Folder
- File
- Invoice
- InvoiceItem
- InvoicePayment
- Expense
- ExpenseBudget
- Booking
- Service
- ProductCategory
- Product
- Order
- Coupon
- EmailLabel
- Email
- ChatRoom
- Notification
- AuditLog
- Tag
- TenantSettings
- RoofEstimate
- RoofEstimateSettings
- RoofMaterial
- RoofTakeoff
- RoofLaborRate
- Wallet
- Quote
- QuoteItem
- Proposal
- SignedContract
- Contract
- RoofData
- SolarRoofData
- Subscription
- ConstructionEstimate
- SupportTicket

### Tables WITHOUT tenantId
- Tenant
- RefreshToken
- Permission
- RolePermission
- LeadSourceCredential
- LeadSourceWebhook
- LeadSourceLog
- LeadTag
- LeadActivity
- ClientGroupMember
- ProjectMember
- ChecklistItem
- LocationPing
- Availability
- FileTag
- OrderItem
- EmailLabelAssignment
- EmailAttachment
- ChatParticipant
- ChatMessage
- UserPreferences
- RoofTakeoffItem
- WalletTransaction
- SuperAdmin
- AdminAuditLog
- EstimateMeasurement
- EstimateMaterial
- EstimateLabour
- EstimateEquipment
- EstimateTransport
- TicketMessage

### Tenant leakage risk
- Strong isolation: tables with explicit tenantId plus compound uniques like @@unique([id, tenantId]).
- Medium risk: child tables without tenantId but reachable only through tenant-scoped parents (RolePermission, LeadTag, FileTag, OrderItem, EmailAttachment).
- Higher risk: auth/session/global identity tables (User, RefreshToken, Permission, SuperAdmin, AdminAuditLog) and chat children (ChatParticipant, ChatMessage) that depend on parent-level isolation rather than direct tenant columns.

## 8. ISSUES / RED FLAGS

- The system claims tenant isolation, but several global tables remain intentionally or accidentally non-tenant-scoped (Permission, RefreshToken, SuperAdmin, AdminAuditLog).
- RBAC is normalized only halfway. RolePermission is good, but Employee.roleId means each employee effectively has one role, not multiple roles per tenant.
- User.tenantId and Employee.tenantId duplicate membership concepts and can drift semantically.
- Many important relationships are hidden in free-text or JSON instead of FKs: createdBy strings, assignedTeamId, assignedUserId, sharedWith, attachmentIds, memberIds.
- Some tables look like denormalized workflow artifacts rather than durable domain models (LeadContactedDetails, SignedContract, ConstructionEstimate family).
- Notification has very high row volume (11688) and could become a write-hot / query-hot table if not aggressively archived.
- RefreshToken also has high volume (628), implying session cleanup and indexing matter operationally.
- Multiple domain concepts overlap: sales docs are split across Quote, Proposal, Contract, Invoice, SignedContract; this is a frequent source of confusion.
- The schema mixes generic SaaS CRM, roofing operations, ecommerce, support desk, and super-admin concerns in one database. That is practical, but it increases coupling and onboarding complexity.

## 9. DEVELOPER ONBOARDING SUMMARY

If you are new to this system, understand these five things first:

1. Tenant is the company/workspace boundary. Almost every business table hangs off it.
2. User is login identity; Employee is the tenant-scoped business actor. Most operational ownership is through employee rows, not user rows.
3. The customer lifecycle is Lead -> Client -> Project -> Quote / Invoice / Contract. If you understand that spine, the rest of the system becomes much easier.
4. Roofing-specific logic is embedded directly inside CRM entities. This is not a generic CRM with a clean plugin boundary; it is a roofing CRM with SaaS/admin extras.
5. Row-level access is split between tenant scoping, employee-role permissions, and optional UserAccess lists for client/project visibility. You need all three mental models to reason about security.

Where confusion will happen first:
- User vs Employee
- Quote vs Proposal vs Contract
- ProjectTask vs generic Task
- relational FKs vs JSON-based workflow data
- global permissions vs tenant roles vs row-level access helpers

This is best understood as an evolving legacy-style SaaS monolith: the data model is strong enough to be production-useful, but a meaningful amount of business logic still lives in application conventions rather than in the database alone.