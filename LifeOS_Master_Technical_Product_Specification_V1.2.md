# LifeOS — Master Technical & Product Specification

Personal Operating System • V1.2: Health / Medical + Core Expansion + Brand

Status: Master specification for implementation with Claude
Scope: Build Health deeply; architect Core for multi-tenancy, bilingual UI, and future domain expansion.

## Revision Notes — V1.2

This revision folds four additions into the original V1 spec, agreed on after initial review:

- Threat model & multi-tenancy: architecture now explicitly supports multiple isolated users from day one (built for you first, ready for others later), with a documented session/device threat model.
- Bilingual UI: English and French are both first-class languages, chosen per user.
- Design system: official color palette defined for the web application.
- Brand assets: LifeOS wordmark (light and dark variants) established.

V1.2 adds:

- Compact app-icon mark (dark and light tiles) for favicon, app icon, and small-surface use, plus usage rules alongside the full wordmark.
- Semantic status colors (amber / muted red / green / gray) for lab flags, task states, and record status.

Everything from the original V1 spec (sections on Health, Hepatitis B, labs, documents, etc.) remains in force. This revision only adds and amends the sections listed above — see Section 43 for updated Claude implementation rules.

## 1. Executive Summary

LifeOS is a private personal operating system for managing the user's health, planning, finances, businesses, travel, assets, documents, projects, and other areas of life from one secure system.

The product is intentionally modular. Health/Medical is the first fully implemented domain. The architecture must be designed from day one so Planning, Finance, Business, Travel, Assets, and a future mobile application can be added without rewriting the core.

LifeOS is a personal management system, built first for a single user (the founder) but architected from day one for multiple isolated users — each with fully private, RLS-scoped data. It is not a public healthcare platform in V1. Medical information is highly sensitive. The application must prioritize privacy, security, data ownership, clear provenance, and user control.

## 2. Product Vision

Create one reliable personal system where the user can understand what is happening in each area of life, store the underlying information, track changes over time, prepare for decisions, and execute tasks.

- One source of truth for personal records.
- Modular domains sharing a common Core.
- Historical data and timelines are first-class concepts.
- Documents remain linked to structured records.
- AI assists with organization and understanding but does not silently become the source of truth.
- The user remains the final authority over personal data and changes.
- Web-first V1 with an API/backend architecture ready for future iOS/Android clients.
- Multi-tenant-ready from day one: architecture supports one user now and many isolated users later without rework.
- Bilingual by design: English and French are both first-class, user-selectable languages.

## 3. Architectural Principles

- Modularity: each domain is independently extendable.
- Core-first: reusable capabilities such as users, documents, projects, tasks, events, timeline, search, notifications, localization, and audit history belong to Core.
- Domain separation: Health should not own Finance, Planning, or Business concepts.
- Projects are a Core capability and can be referenced by any domain.
- Documents are a Core capability and can be associated with any domain.
- Generic records should support extensibility without forcing every future entity into one unstructured table.
- Database-first integrity: critical facts are stored in structured, validated data.
- API-first: future mobile applications should consume the same backend services.
- Tenant isolation by design: every user-owned table is scoped and RLS-enforced from V1, whether one person or many people ultimately use the system.
- Security by design: authentication, authorization, row-level access controls, secure storage, auditability, and backups are foundational.
- Progressive implementation: architect future modules but do not build their full UI/business logic in V1.

## 4. Product Scope

### 4.1 Fully implemented in V1

- LifeOS Core foundation, including multi-tenant data isolation and bilingual (EN/FR) UI.
- Health/Medical domain.
- Hepatitis B management.
- General lab-result tracking.
- Liver, HBV, kidney/renal, blood, metabolic, and other test categories.
- Weight and body-metric tracking.
- Medication tracking.
- Appointments and appointment preparation.
- Symptoms and health notes.
- Medical document upload and organization.
- Medical timeline.
- Health trends/charts.
- Nutrition and food planning foundation (meal logging and clinician-recorded restrictions; full meal-planning/grocery tooling deferred — see Section 51.1).
- Tasks/reminders needed for health management.

### 4.2 Architecture-ready but not fully implemented

- Planning.
- Finance.
- Business.
- Travel.
- Assets.
- Future mobile application.
- Expanded AI assistant.
- Household/family sharing on top of multi-tenant Core.

### 4.3 Explicitly out of scope for V1

- Bank account synchronization.
- Investment trading.
- Automated medical diagnosis.
- AI prescribing or medication changes.
- Autonomous medical decision-making.
- Public multi-user healthcare marketplace / open sign-up.
- Full accounting system.
- Full CRM.
- Native iOS/Android app development.
- Large-scale collaboration/social features.
- Household/family shared-record sharing (architecture allows it later; not built in V1).

## 5. High-Level Architecture

```
LIFEOS — Personal Operating System
 |
 +----------------+----------------+
 | | |
HEALTH PLANNING FINANCE
(V1 FULL) (future-ready) (future-ready)
 |
BUSINESS TRAVEL ASSETS
(future-ready) (future-ready) (future-ready)
 |
LIFEOS CORE
 +-----------+----------+----------+-----------+------------+
 | | | | | |
Documents Projects Tasks Events Timeline Localization
 | | | | |
Search Goals Reminders Calendar Audit
Authentication / Tenant Isolation / Security / Storage / Notifications / AI
```

## 6. LifeOS Core

### 6.1 Core entities

- User
- Profile
- Document
- File
- Record
- Event
- Task
- Project
- Goal
- Note
- Tag
- Notification
- AuditEvent
- Module metadata

### 6.2 Tenancy & Threat Model

Multi-user support is a Core capability from V1, not an add-on. Every user-owned table carries a `user_id` column and is protected by Postgres Row Level Security, whether the deployment has one user (V1 launch, the founder) or many isolated users later. This costs almost nothing to build now and avoids a rewrite later — the RLS-everywhere pattern already required by the original spec is exactly the pattern multi-tenancy needs.

**Tenancy model**

- Isolation, not sharing, is the V1 default: each user's data is fully private to that user.
- Household/family sharing (Section 4.2) is deliberately deferred — it will be added later as a join table (e.g. `shared_access` or `household_id`) layered on top of existing tables, without altering their schemas.
- Every RLS policy must check `auth.uid() = user_id` (or an equivalent ownership check) on every user-scoped table without exception.

**Threat model (what V1 actually defends against)**

For a system holding personal medical history, the practical risk is device and session compromise, not abstract multi-tenant leakage:

- Adversary model: a lost/stolen phone, a shared or public computer, an unattended logged-in session, or a compromised network (e.g. base wifi) — not, at V1 scale, another tenant attacking the platform.
- Session policy: short-lived access tokens with refresh-token rotation (native to Supabase Auth), automatic logout after inactivity, and no indefinite "remember me" on shared devices.
- Device/account access: two-factor authentication should be available and strongly recommended given the sensitivity of HBV/medical data, even for a single-user V1 deployment.
- Data at rest: private Supabase Storage buckets only; no public buckets for medical documents.
- Signed URL exposure: signed URLs to medical documents/lab reports must expire in minutes, not hours — a leaked signed URL is a leaked lab report.
- Forward path to real multi-tenant: once a second real user account is onboarded, run a full per-table RLS policy audit as a release gate before granting that access.

### 6.3 Localization (EN / FR)

English and French are both first-class, user-selectable languages. Localization is a Core concern, not something implemented per-domain.

- UI layer: an i18n library appropriate to the Next.js stack (e.g. next-intl) drives all interface strings, navigation, labels, and system messages from locale files.
- User preference: Profile carries a `preferred_language` field (`en | fr`), set in account settings and applied on every session — not a per-device setting.
- Reference/lookup data is bilingual: test names, test categories, medication names, condition names, and other structured lookup data (e.g. `TestDefinition.name`, `Food.name`, `Condition.name`) support both languages, either via translation columns (`name_en`, `name_fr`) or a dedicated translations table.
- User-generated free text stays as-typed: Notes, symptom descriptions, doctor questions, and appointment notes are stored in whichever language the user wrote them — no forced translation of personal free text in V1.
- Future: AI-assisted translation of free text may be offered later as an opt-in convenience layer, never as a silent rewrite of the user's own words.

### 6.4 Projects

Projects must be Core-level objects. A project can belong to or be referenced by Health, Planning, Finance, Business, Travel, or Assets.

```
Project
- id
- name
- description
- status
- priority
- start_date
- target_date
- completed_date
- owner_user_id
- domain/context
- tags
- linked_documents
- linked_tasks
- linked_events
- linked_financial_records (future)
- milestones
- created_at
- updated_at
```

Example: "Launch Business Website" can have Planning tasks and Business expenses. "Senegal Trip" can have Travel reservations, Planning tasks, and a Travel budget.

## 7. Health Domain — V1

```
HEALTH
├── Dashboard
├── Conditions
│ └── Hepatitis B
├── Lab Results
│ ├── Liver
│ ├── Hepatitis B
│ ├── Kidney / Renal
│ ├── Blood / CBC
│ ├── Metabolic
│ └── Other
├── Medications
├── Appointments
├── Symptoms
├── Weight & Body Metrics
├── Nutrition
├── Food Planning
├── Medical Documents
├── Doctor Questions
├── Health Timeline
└── Trends / Reports
```

## 8. Health Dashboard

- Current conditions.
- Current medications.
- Recent laboratory results.
- Important trends.
- Current weight and recent change.
- Upcoming appointments.
- Open doctor questions.
- Pending health tasks.
- Recently uploaded medical documents.
- Important reminders.
- Quick access to Hepatitis B.

The dashboard must distinguish raw data from interpretation. It should show trends and reminders without presenting unsupported medical conclusions.

## 9. Conditions Architecture

Conditions must be generic. Hepatitis B is the first detailed condition, but the schema must support future conditions.

```
Condition
- id
- user_id
- name
- diagnosis_date
- status
- description
- provider_reference
- notes
- documents
- timeline_events
- created_at
- updated_at
```

## 10. Hepatitis B Module

The Hepatitis B module should organize the user's personal HBV history, treatment, monitoring, labs, imaging, appointments, documents, questions, and trends.

- Condition overview.
- Treatment history.
- Medication history.
- HBV laboratory history.
- Liver laboratory history.
- Kidney/renal monitoring.
- Relevant blood/metabolic monitoring.
- Imaging and FibroScan records.
- Medical documents.
- Appointment history.
- Questions for clinician.
- Health timeline.
- Trend visualization.
- Clinician instructions and follow-up tasks.

The application must not generate treatment recommendations as medical facts. It may organize clinician instructions and surface recorded information. Any AI-generated medical explanation must be clearly labeled as informational and should encourage clinician confirmation for decisions.

## 11. Laboratory System

Laboratory tracking must be generic and extensible. Do not hard-code the database around Hepatitis B alone.

```
LabResult
- id
- user_id
- test_definition_id
- category
- value_numeric (nullable)
- value_text (nullable)
- unit
- reference_low
- reference_high
- reference_text
- abnormal_flag
- collection_date
- result_date
- ordering_provider
- facility
- source_document_id
- notes
- created_at
- updated_at

TestDefinition
- id
- name (bilingual: name_en / name_fr)
- code (optional)
- category
- default_unit
- description
- active
- created_at
- updated_at
```

### 11.1 Initial test categories

- Hepatitis B / virology: HBV DNA, HBsAg, HBeAg, anti-HBe, anti-HBs, anti-HBc and other clinician-ordered HBV tests.
- Liver: ALT, AST, ALP, bilirubin, albumin, total protein, GGT and other clinician-ordered liver tests.
- Kidney / renal: creatinine, eGFR, BUN, urinalysis, urine protein and other renal monitoring as ordered.
- Blood / CBC: WBC, RBC, hemoglobin, hematocrit, platelets and related CBC measures.
- Metabolic: glucose, HbA1c, lipid measurements and other relevant metabolic tests.
- Other: any custom test the user needs.

These are tracking categories, not a statement that every test is required for Hepatitis B. The application should allow clinician-specific monitoring plans.

## 12. Lab Trends

- Plot historical values by test.
- Display dates, units, and reference ranges when available.
- Show latest value and previous value.
- Calculate change only when mathematically valid.
- Never infer causation from correlation.
- Allow filtering by date range.
- Allow export of selected results.
- Link each result to its source document when available.

## 13. Medical Documents

The user must be able to upload and organize PDFs/images/documents such as laboratory reports, imaging reports, appointment summaries, prescriptions, doctor notes, and other medical records.

```
Document
- id
- user_id
- name
- type
- category
- storage_path
- mime_type
- file_size
- document_date
- provider
- source
- tags
- related_condition_id
- related_appointment_id
- related_lab_result_ids
- created_at
- updated_at
```

Document extraction can be added later. If AI extracts values, the user must review and approve extracted data before it becomes authoritative.

## 14. Appointments

```
Appointment
- id
- user_id
- provider_name
- specialty
- appointment_type
- date_time
- location
- status
- preparation_notes
- questions
- clinician_instructions
- follow_up_date
- related_condition
- documents
- notes
- created_at
- updated_at
```

Appointment workflow: Before → During → After. Before the visit, show recent relevant labs, medications, symptoms, questions, and documents.

## 15. Doctor Questions

- Create questions at any time.
- Associate questions with a condition or appointment.
- Mark answered/unanswered.
- Record the clinician's answer or notes.
- Mark questions requiring follow-up.
- Show open questions before the next relevant appointment.

## 16. Medication Management

```
Medication
- id
- user_id
- name
- dose
- unit
- frequency
- route
- start_date
- end_date
- status
- prescriber
- reason
- instructions
- side_effect_notes
- related_condition
- source_document
- created_at
- updated_at
```

Medication tracking is a record-keeping feature. V1 must not autonomously recommend starting, stopping, or changing medications.

## 17. Symptoms & Health Notes

```
SymptomEntry
- id
- user_id
- symptom
- severity
- onset
- duration
- frequency
- context
- notes
- related_condition
- appointment_reference
- created_at
```

The user should be able to record symptoms, general health notes, and observations. Avoid turning symptom entries into automatic diagnoses.

## 18. Weight & Body Metrics

Weight tracking is a core Health feature and must not be tied exclusively to Hepatitis B.

```
BodyMetric
- id
- user_id
- metric_type
- value
- unit
- measured_at
- source
- notes
- created_at
```

- Weight.
- Height.
- BMI when enough validated inputs exist.
- Waist circumference if desired.
- Body-fat percentage if available.
- Future body metrics without schema redesign.

## 19. Nutrition & Food Planning

Nutrition is a Health submodule. It should support general healthy eating and personalized planning without pretending that there is one universal "Hepatitis B diet."

V1 scope is intentionally trimmed: meal logging plus clinician-recorded restrictions. Full meal-planning, macro tracking, and grocery-list tooling (originally scoped as full V1 features) are deferred to Phase 6 to avoid scope creep away from the daily-use HBV/lab/timeline features. See Section 51.1.

```
Food
- id
- name (bilingual: name_en / name_fr)
- category
- serving_size
- calories (optional)
- protein (optional)
- carbohydrates (optional)
- fat (optional)
- fiber (optional)
- sodium (optional)
- notes

MealPlan
- id
- user_id
- date
- meal_type
- food_items
- serving_notes
- preparation_notes
- user_notes
```

The application should favor broadly health-supportive food planning and clinician-confirmed personal restrictions. It must not invent medical prohibitions or imply that a food treats Hepatitis B.

## 20. Health Timeline

Timeline is a Core capability with Health-specific events.

```
TimelineEvent
- id
- user_id
- event_type
- date_time
- title
- description
- domain
- related_entity_type
- related_entity_id
- source_document
- created_at
```

`related_entity_type` / `related_entity_id` is a polymorphic reference and cannot be enforced by a real Postgres foreign key. V1 must decide and document an enforcement approach (e.g. trigger-based validation, or an accepted integrity tradeoff) rather than leaving it implicit.

- Diagnosis events.
- Medication starts/stops/changes.
- Lab results.
- Imaging.
- Appointments.
- Weight measurements.
- Symptoms.
- Clinician instructions.
- Important documents.
- Health tasks completed.

## 21. Planning Domain — Future Architecture

- Goals.
- Projects.
- Tasks.
- Milestones.
- Calendar/events.
- Habits.
- Priorities.
- Progress tracking.

Planning should consume Core Projects, Tasks, Goals, Events, Documents, and Notifications rather than creating duplicate versions.

## 22. Finance Domain — Future Architecture

- Accounts.
- Income.
- Expenses.
- Budgets.
- Debts.
- Credit cards.
- Investments.
- Financial goals.
- Financial documents.
- Financial projects.

Finance is not implemented in V1. The architecture must allow financial records to link to Core Projects and Assets later.

## 23. Business Domain — Future Architecture

- Businesses.
- Business profiles.
- Business projects.
- Revenue.
- Expenses.
- Contacts.
- Business documents.
- Business goals.
- Operations/tasks.

A business can contain projects, and projects can reference financial records and assets. Do not duplicate Core Projects.

## 24. Travel Domain — Future Architecture

- Trips.
- Itineraries.
- Flights.
- Hotels/accommodation.
- Reservations.
- Travel documents.
- Travel budget.
- Packing/task lists.
- Important dates.
- Contacts and emergency information as appropriate.

Travel should use Core Documents, Tasks, Events, Projects, and Notifications.

## 25. Assets Domain — Future Architecture

Assets are a top-level domain because assets can be personal, business-related, or financial.

- Vehicles.
- Property.
- Land.
- Equipment.
- Other valuable assets.
- Purchase information.
- Ownership.
- Maintenance.
- Warranty.
- Insurance references.
- Documents.
- Valuation history where applicable.

An asset may be linked to Finance, Business, Planning, or a Project without being owned by those modules.

## 26. Future Mobile Application

V1 is web-first. No native mobile app should be built now. However, the backend must be client-independent and API-ready.

```
Web App
 |
API Layer
 |
 +----------+----------+
 | |
PostgreSQL Storage
 ^
 |
Future Mobile App (iOS / Android)
```

- Do not place critical business logic only in the web frontend.
- Use reusable API/service boundaries.
- Authentication must support future mobile clients.
- File storage must be accessible through secure APIs.
- Notifications should be designed so push notifications can be added later.
- Future mobile-specific features may include camera scanning, document upload, quick logging, and push reminders.

## 27. Recommended Technology Stack

- Frontend: Next.js + TypeScript.
- UI: Tailwind CSS + shadcn/ui or an equivalent accessible component system.
- Localization: next-intl (or equivalent) for EN/FR locale files and routing.
- Backend/data: Supabase with PostgreSQL, Auth, Storage, and Row Level Security.
- Validation: shared TypeScript schemas and server-side validation (Zod).
- Charts: a maintainable charting library such as Recharts.
- Future mobile: React Native + Expo or another client that consumes the same API/backend.
- AI: isolated service layer so AI providers can be changed without rewriting domain logic.

Technology choices may be adjusted only when there is a documented technical reason. Do not add unnecessary infrastructure to V1.

## 28. Database Design Principles

- Use UUIDs or another stable non-sequential identifier strategy.
- Every user-owned record must have user ownership enforced server-side via RLS, regardless of current user count.
- Use foreign keys for relationships; document any polymorphic reference and its enforcement strategy explicitly (see Section 20).
- Use timestamps consistently.
- Prefer normalized relational data for critical records.
- Use enums carefully; avoid making future extension unnecessarily difficult.
- Use soft deletion only where appropriate and preserve audit history for important records.
- Do not store important medical facts only inside free-form notes.
- Do not duplicate the same entity across modules.
- Bilingual lookup tables use explicit language columns or a translations table — never overload a single free-text column for two languages.

## 29. Core Data Relationships

```
User
├── Documents
├── Records
├── Projects
├── Goals
├── Tasks
├── Events
├── Notes
├── Notifications
├── Audit Events
├── Profile (preferred_language)
└── Domain Data

Project
├── Tasks
├── Milestones
├── Documents
├── Events
└── Domain references

Medical Condition
├── Lab Results
├── Medications
├── Appointments
├── Symptoms
├── Documents
└── Timeline Events
```

## 30. API Architecture

The backend should expose clean domain-oriented services. The frontend must not directly manipulate sensitive database tables without authorization and validation.

```
/api
 /auth
 /profile
 /documents
 /projects
 /tasks
 /events
 /goals
 /notifications
 /health
 /conditions
 /labs
 /medications
 /appointments
 /symptoms
 /body-metrics
 /nutrition
 /timeline
 /reports
```

- Validate every write on the server.
- Check authenticated user ownership on every user-scoped operation.
- Return consistent errors.
- Never expose storage paths or sensitive internals unnecessarily.
- Keep API contracts stable and versionable.

## 31. Frontend Architecture

```
src/
├── app/
│ ├── [locale]/
│ │ ├── dashboard/
│ │ ├── health/
│ │ │ ├── conditions/
│ │ │ ├── labs/
│ │ │ ├── medications/
│ │ │ ├── appointments/
│ │ │ ├── symptoms/
│ │ │ ├── weight/
│ │ │ ├── nutrition/
│ │ │ ├── documents/
│ │ │ └── timeline/
│ │ └── settings/
├── components/
│ ├── core/
│ ├── health/
│ └── ui/
├── lib/
│ ├── auth/
│ ├── api/
│ ├── i18n/
│ ├── validation/
│ ├── storage/
│ └── utilities/
├── services/
│ ├── core/
│ └── health/
├── types/
│ ├── core/
│ └── health/
├── locales/
│ ├── en/
│ └── fr/
└── tests/
```

## 32. Security & Privacy

- Strong authentication, with two-factor authentication available and recommended.
- Server-side authorization.
- Database Row Level Security enforced on every user-owned table.
- Private medical file storage.
- Secure, short-lived signed access to files.
- No public medical documents.
- Audit important changes.
- Protect secrets with environment variables.
- Do not log sensitive medical content unnecessarily.
- Use least-privilege access.
- Provide secure account/data deletion workflows.
- Back up data and document recovery procedures, including an automated backup cadence and a documented account-recovery path.
- Use HTTPS in production.
- Validate uploaded file types and sizes.
- Scan or otherwise safely process uploaded files before downstream use.
- Do not expose private records in URLs or client logs.
- Session timeout and device-loss handling are treated as first-class security requirements, not an implicit byproduct of RLS (see Section 6.2).

If LifeOS ever becomes a product for other people beyond the founder's own household, perform a new privacy/compliance review before opening access. V1 must not assume that future commercial compliance requirements are automatically satisfied.

## 33. Audit History

```
AuditEvent
- id
- user_id
- actor
- action
- entity_type
- entity_id
- timestamp
- metadata
- previous_version_reference (optional)
- new_version_reference (optional)
```

- Creation.
- Modification.
- Deletion where appropriate.
- Medication status changes.
- Lab record corrections.
- Document changes.
- Security-sensitive events (login, logout, failed auth, 2FA changes).

## 34. AI Architecture

AI is an assistant layer, not the database and not an autonomous medical authority.

- Document summarization.
- Extraction of candidate lab values from uploaded reports.
- Appointment preparation summaries.
- Question generation based on user-recorded information.
- Natural-language search across personal records, in either language.
- Organization assistance.
- Future cross-domain personal assistant.

AI-extracted structured data must require user confirmation before becoming authoritative. AI must not silently modify medical records, prescribe medication, diagnose disease, or invent missing values.

## 35. Notifications

- Appointment reminders.
- Medication reminders if the user chooses.
- Lab follow-up reminders.
- Task deadlines.
- Document/action reminders.
- Future project and travel reminders.
- Notification preferences per category.
- Notifications delivered in the user's preferred language.

Notifications must be configurable and should not become noisy by default.

## 36. Search

- Global search across permitted records.
- Filter by domain.
- Filter by date.
- Filter by document.
- Filter by tags.
- Search lab names and values in either language.
- Search appointments and notes.
- Future semantic/AI search.

## 37. Export & Data Portability

- Export medical records in a readable format.
- Export lab history.
- Export medication history.
- Export appointment history.
- Export documents.
- Export selected data as CSV/JSON where appropriate.
- Keep export functionality domain-aware and privacy-conscious.
- Document an automated backup routine and a clear account-recovery path, in addition to on-demand export.

## 38. Dashboard & UX Principles

- Simple and calm interface.
- Medical information should be easy to scan.
- Do not overwhelm the user with every metric at once.
- Show latest status plus historical trend.
- Every important number should have date and unit.
- Make source documents easy to open.
- Make data entry fast.
- Responsive web design.
- Accessible controls and readable typography.
- Consistent navigation across future modules.
- Language toggle (EN/FR) always reachable from account settings.
- Visual design follows the official LifeOS design system (Section 51.2) and brand assets (Section 51.3).

## 39. V1 User Flows

### 39.1 Add lab result

- User opens Health → Lab Results.
- Selects or searches a test.
- Enters value, unit, date, and optional reference range.
- Optionally attaches the source document.
- System validates the input.
- Record is saved.
- Timeline updates.
- Trend becomes available if historical results exist.

### 39.2 Upload a lab report

- User uploads the report.
- System stores it privately.
- Optional AI extraction identifies candidate values.
- User reviews extracted values.
- User confirms selected values.
- Structured lab records are created with a source-document link.

### 39.3 Prepare for appointment

- Open upcoming appointment.
- Review recent labs.
- Review medications.
- Review symptoms.
- Review open doctor questions.
- Review relevant documents.
- Add notes after the appointment.
- Create follow-up tasks.

## 40. Development Phases

**Phase 0 — Architecture**
- Set up repository.
- Set up environments.
- Set up authentication (including 2FA support).
- Set up database with RLS from the first migration.
- Set up storage.
- Implement security foundations.
- Create Core entities, including Profile.preferred_language.
- Set up i18n scaffolding (locale files, language toggle).
- Create module boundaries.

**Phase 1 — Health Foundation**
- Health dashboard.
- Conditions.
- Medical timeline.
- Documents.
- Appointments.
- Tasks/reminders.

**Phase 2 — Hepatitis B & Labs**
- Hepatitis B condition.
- Generic lab system.
- HBV/liver/kidney/blood/metabolic categories.
- Historical trends.
- Document linking.

**Phase 3 — Medication, Symptoms, Weight**
- Medication tracking.
- Symptoms.
- Weight/body metrics.
- Trend dashboards.

**Phase 4 — Nutrition (trimmed scope)**
- Meal logging.
- Clinician-recorded restrictions.
- Nutrition notes.
- (Deferred to Phase 6: full food database, meal planning, grocery lists.)

**Phase 5 — AI & Polish**
- Document extraction.
- Appointment summaries.
- Natural-language search (EN/FR).
- UX refinement.
- Testing.
- Performance and security review.
- Backup/restore drill.

**Phase 6 — Future Modules & Deferred Scope**
- Full nutrition/meal-planning/grocery tooling.
- Household/family sharing on top of multi-tenant Core.
- Planning.
- Finance.
- Business.
- Travel.
- Assets.
- Mobile application.

## 41. Testing Requirements

- Unit tests for domain logic.
- Integration tests for database operations.
- Authentication/authorization tests.
- RLS tests, including cross-user isolation tests as soon as a second account exists.
- File upload security tests.
- Validation tests for lab values and dates.
- UI tests for critical Health flows in both languages.
- Regression tests before major releases.
- Backup/restore testing.

## 42. Performance & Reliability

- Paginate large histories.
- Index user-scoped and date-based queries.
- Avoid loading all medical records on dashboard startup.
- Lazy-load documents and large files.
- Cache safe derived data where useful.
- Keep chart queries efficient.
- Handle partial failures gracefully.

## 43. Claude Implementation Rules

- Treat this specification as the source of truth.
- Before coding, inspect the existing repository and explain the implementation plan.
- Do not rewrite working architecture without a documented reason.
- Do not implement future modules beyond their necessary architectural interfaces.
- Do not create duplicate Core concepts inside individual modules.
- Do not hard-code the application around Hepatitis B.
- Do not store critical medical facts only in unstructured notes.
- Do not expose medical files publicly.
- Do not let AI silently modify authoritative medical data.
- Do not build household/family sharing logic in V1 — only avoid decisions that would block adding it later.
- Do not skip RLS policies because there is currently only one user.
- Do not hard-code UI strings outside the locale files.
- Use reusable components and services.
- Keep domain logic separate from UI.
- Use TypeScript types and server-side validation.
- Write tests for critical functionality.
- Use migrations for database changes.
- Do not place secrets in source code.
- Document meaningful architectural decisions.
- Prefer simple, maintainable solutions over unnecessary complexity.

## 44. Definition of Done for V1

- User can securely sign in, with 2FA available.
- User can access a private Health dashboard.
- User can toggle between English and French at any time.
- User can create/manage conditions.
- User can manage Hepatitis B information.
- User can add, edit, and view lab results.
- User can track liver, HBV, kidney, blood, metabolic, and custom tests.
- User can view historical lab trends.
- User can upload and organize medical documents.
- User can link documents to records.
- User can track medications.
- User can track appointments.
- User can prepare doctor questions.
- User can record symptoms.
- User can track weight and other body metrics.
- User can log meals and record clinician nutrition restrictions.
- User can see a health timeline.
- User can receive configurable reminders in their preferred language.
- Core architecture supports future Planning, Finance, Business, Travel, and Assets modules.
- Core architecture supports multiple isolated users without schema rework.
- Backend is ready for a future mobile client.
- Critical data is protected with authentication, authorization, RLS, 2FA, and secure storage.
- Automated backup routine and account-recovery path are documented and tested.
- Critical workflows have tests.

## 45. Future Expansion Map

```
LifeOS
├── Core
│ ├── Users (multi-tenant)
│ ├── Documents
│ ├── Records
│ ├── Projects
│ ├── Goals
│ ├── Tasks
│ ├── Events
│ ├── Timeline
│ ├── Search
│ ├── Notifications
│ ├── Audit
│ ├── Localization (EN/FR)
│ └── AI
├── Health
├── Planning
├── Finance
├── Business
├── Travel
└── Assets

Future clients:
├── Web
└── Mobile
```

## 46. Final Product Direction

LifeOS should feel like one coherent personal system rather than a collection of unrelated applications. The Core provides identity, tenant isolation, localization, documents, projects, tasks, events, timeline, search, notifications, security, and AI capabilities. Domain modules add specialized functionality.

Health is the first domain and should receive the majority of V1 product and engineering effort. Hepatitis B is the first deeply supported condition, but the underlying Health architecture must remain general enough to support other conditions and future health data.

The future domains — Planning, Finance, Business, Travel, and Assets — must be architecturally compatible with the Core but should not distract from V1 execution.

The system should be useful even without AI. AI is an enhancement layer, never the foundation of data integrity.

## 47. Final Instruction to Claude

Build LifeOS as a secure, modular, maintainable, multi-tenant-ready, bilingual personal operating system. Implement Health/Medical as the complete V1 domain, with Hepatitis B as its first deeply supported condition. Build the Core architecture so Planning, Finance, Business, Travel, Assets, household sharing, and a future mobile application can be added without a major architectural rewrite. Do not prematurely implement future modules. Prioritize data integrity, security, extensibility, usability, testing, and clear separation between Core and domain-specific logic.

## 48. Architecture Decision Record — Technology Stack

The following stack is the official V1 architecture decision for LifeOS. Claude must not substitute Firebase, Firestore, MongoDB, or another database/platform unless the user explicitly approves an architectural change.

- Frontend: Next.js + TypeScript
- Hosting: Vercel
- Backend Platform: Supabase
- Database: PostgreSQL
- Authentication: Supabase Auth (with 2FA)
- File Storage: Supabase Storage
- Localization: next-intl (EN/FR)
- Validation: TypeScript + Zod
- UI: Tailwind CSS + shadcn/ui
- Charts: Recharts
- Version Control: GitHub
- Future Mobile: React Native + Expo (same backend/API)
- AI: Isolated AI service layer

Architecture rule: the application must not scatter Supabase-specific database calls throughout the UI. Use an application/service layer and repository/data-access layer so the domain logic remains portable.

### 48.1 Why PostgreSQL

LifeOS is fundamentally relational: users connect to conditions, lab results, medications, appointments, documents, notes, projects, tasks, assets, financial records, business records, and travel records. PostgreSQL provides strong relationships, foreign keys, transactions, constraints, indexing, reporting, and long-term portability — including clean native support for RLS-based multi-tenancy.

### 48.2 Why not Firebase/Firestore

Firebase is technically capable of supporting LifeOS, but Firestore's document-oriented model is less natural for the application's interconnected long-term data. LifeOS should not optimize for short-term backend convenience at the expense of relational integrity and future cross-domain reporting. Firebase is therefore not the selected V1 database architecture.

### 48.3 Hosting and portability

Vercel hosts the web application while Supabase provides the backend platform, PostgreSQL database, authentication, and private storage. Domain logic must remain separated from provider-specific implementation so the system can migrate infrastructure later if required.

## 49. Architecture Decision — Notes

Notes are an official LifeOS Core capability, inspired by the flexibility of Apple Notes but integrated with structured LifeOS data. Notes are not limited to Health and can be linked to any domain.

```
Note
- id
- user_id
- title
- content / rich-text representation
- folder
- tags
- attachments
- links
- related_domain
- related_project
- related_appointment
- related_condition
- related_documents
- created_at
- updated_at
```

Notes must support quick capture, rich text, checklists, attachments, search, tags, and future AI assistance. A note may optionally be converted into structured objects such as tasks or events, but conversion requires user confirmation. Notes remain in the language the user wrote them in (see Section 6.3).

## 50. Final Domain Map

```
LIFEOS
├── CORE
│ ├── Notes
│ ├── Documents
│ ├── Projects
│ ├── Goals
│ ├── Tasks
│ ├── Events
│ ├── Timeline
│ ├── Search
│ ├── Notifications
│ ├── Audit
│ ├── Storage
│ ├── Authentication (multi-tenant, 2FA)
│ ├── Localization (EN/FR)
│ └── AI
├── HEALTH ← V1
├── PLANNING ← Future-ready
├── FINANCE ← Future-ready
├── BUSINESS ← Future-ready
├── TRAVEL ← Future-ready
└── ASSETS ← Future-ready

CLIENTS
├── Web ← V1
└── Mobile ← Future-ready
```

## 51. V1.1 & V1.2 Additions

This section documents the four additions agreed on in this revision in full detail, as new Core-level decisions.

### 51.1 Nutrition Scope Trim

The original spec's Nutrition & Food Planning section (19) described a near-complete standalone nutrition app: food database, meal plans, macro tracking, grocery lists. Relative to the actual near-term need — HBV monitoring — this was the most over-scoped section in V1.

Revised V1 scope: meal logging (what was eaten, when) plus a place to record clinician-given dietary restrictions and free-text nutrition notes. Full food-database search, macro/calorie tracking, structured weekly meal planning, and grocery-list generation move to Phase 6, alongside the other future-ready domains.

### 51.2 Threat Model & Multi-Tenancy

Full detail in Section 6.2. Summary: LifeOS is built for one user first but is architected as multi-tenant from V1 — every table is `user_id`-scoped and RLS-enforced regardless of how many real accounts exist. The practical threat model for V1 is device/session compromise (lost phone, shared computer, open session, insecure network), addressed through short-lived sessions, refresh-token rotation, auto-logout, available 2FA, private storage, and short-lived signed URLs. Household/family sharing is deferred to Phase 6 and will be layered on via a join table without altering existing schemas.

### 51.3 Bilingual UI (English / French)

Full detail in Section 6.3. Summary: EN/FR is a Core, user-selectable preference stored on Profile, driving all UI chrome via locale files (next-intl). Reference/lookup data (test names, medication names, condition names, food names) is bilingual via translation columns or a translations table. User-generated free text (notes, symptoms, doctor questions) stays in the language it was written in — no forced translation in V1.

### 51.4 Design System

Official V1 color palette for the LifeOS web application:

| Role | Hex |
|---|---|
| Primary — Teal | #0F9EA0 |
| Secondary — Deep Navy | #0F172A |
| Background — White | #FFFFFF |
| Surface — Very Light Gray | #F8FAFC |
| Muted text — Slate Gray | #64748B |

Usage guidance: Teal (#0F9EA0) is the primary action color — buttons, active states, links, focus rings. Deep Navy (#0F172A) is used for headers and high-emphasis text. Slate Gray (#64748B) is used for secondary/muted text, labels, and helper copy. White (#FFFFFF) is the page background; Very Light Gray (#F8FAFC) is used for card and panel surfaces to create subtle depth against the white page. This pairing (teal/navy on white, and vice versa) meets standard accessible contrast ratios for body text and UI controls.

Contrast note: primary teal is close to the WCAG AA threshold for small text on white. Reserve teal for buttons, accents, icons, and large UI elements — use Navy or Slate Gray for body-sized text, never teal.

#### 51.4.1 Semantic Colors

The base palette (teal / navy / white / light gray / slate) covers brand and neutral UI. V1 also requires semantic colors for status meaning — abnormal lab flags, overdue tasks, confirmed-normal results — kept desaturated so they sit quietly alongside teal rather than compete with it:

| Role | Hex |
|---|---|
| Amber — needs attention | #BA7517 |
| Muted red — abnormal / urgent | #A32D2D |
| Green — normal / confirmed | #3B6D11 |
| Gray — inactive / archived | #5F5E5A |

Usage guidance: Amber marks items needing attention (an upcoming appointment, an overdue task). Muted red marks abnormal or urgent lab flags — reserved for genuine clinical/urgency signals, not general errors. Green marks confirmed-normal results or completed items. Gray marks inactive or archived records. These are applied as small indicators (badges, flags, dots) rather than large fills, keeping teal as the dominant brand color throughout the interface.

### 51.5 Brand Assets

The LifeOS wordmark is established in two variants for light and dark surfaces:

- Light-background variant (teal wordmark on white) — used in light-mode UI, printed materials, and light email templates.
- Dark-background variant (teal wordmark on black) — used in dark-mode UI, splash/loading screens, and dark email templates.

Both variants use the same teal (#0F9EA0) wordmark, keeping brand color consistent regardless of surface.

These assets should be stored as source SVGs where possible, with PNG exports for raster use cases (social previews, headers).

#### 51.5.1 App Icon / Compact Mark

The full wordmark does not work at small sizes (favicon, mobile app icon, browser tab). A compact mark is established for these contexts: a rounded tile containing an abstract "L" formed from a teal stroke, with a small dot standing in as a pulse/vital-sign accent — tying back to Health without using a literal heartbeat icon.

- Use for: favicon, mobile/PWA app icon, browser tab icon, loading/splash indicator, anywhere space is too tight for the full wordmark.
- Do not use as a replacement for the full wordmark in headers, marketing pages, or anywhere the LifeOS name should be legible as text.
- Dark tile (navy background) is the primary version; the light tile is available for contexts needing a mark on light chrome (e.g. a light-mode taskbar).
- Minimum size: 32px — below this the stroke and dot lose clarity. Export at 512×512 source resolution and downscale per platform (16/32/180/512px as needed for favicon and app-store requirements).

## 52. Final Build Directive

Build Health/Medical deeply first, with Hepatitis B as the first detailed condition, while implementing LifeOS Core correctly from the beginning — including multi-tenant data isolation, bilingual (EN/FR) support, and the official design system and brand assets. Do not build full Finance, Business, Travel, Assets, Planning, or household-sharing features in V1. Their module boundaries, database relationships, permissions, navigation architecture, and service interfaces must be ready so future development can add them without a major rewrite.
