# Author Services Platform - Complete Handoff Document

> Everything you need to know to understand, maintain, and extend this platform
>
> **Last Updated:** 2025-01-05  
> **Platform Status:** Production-ready with active development

---

## Quick Navigation

| Document | Purpose |
|----------|---------|
| **This Document** | High-level overview, architecture, goals |
| [README.md](./README.md) | Project structure, setup, deployment |
| [SCHEMA.md](./SCHEMA.md) | Complete database schema (31 tables, 5 enums) |
| [docs/erd.md](./docs/erd.md) | Entity relationship diagrams |
| [docs/FIELD_DOCUMENTATION.md](./docs/FIELD_DOCUMENTATION.md) | Feature documentation, business logic |
| [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) | Edge functions API reference |
| [DATABASE_CHANGELOG.md](./DATABASE_CHANGELOG.md) | Historical migration log |

---

## 1. What Is This Platform?

### Business Purpose
The **Author Services Platform** is a vertical SaaS solution for the **book publishing industry**. It serves as the central operating system for publishing companies that offer author services (editing, design, marketing, distribution, etc.).

### Target Users
- **Author Success Coaches (ASC)**: Relationship managers who guide authors through the publishing process
- **Account Executives (AE)**: Sales representatives who convert leads to customers
- **Marketing Team**: Run email campaigns, manage brand communications
- **Administrators**: Manage staff, products, system settings

### Core Value Proposition
1. **Unified CRM**: All author/lead data in one place with full communication history
2. **Multi-Brand Support**: Single platform for multiple publishing imprints
3. **AI-Powered Marketing**: Generate personalized email campaigns with AI
4. **Sales Pipeline**: Track deals from lead to closed with commission tracking
5. **360° View**: See every interaction (calls, emails, campaigns) in one timeline

---

## 2. Technology Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| **Frontend** | React 18 + TypeScript | Vite build, fast HMR |
| **UI Framework** | Tailwind CSS + shadcn/ui | Component library with design system |
| **State** | TanStack Query | Server state management |
| **Backend** | Lovable Cloud (Supabase) | PostgreSQL + Edge Functions |
| **Auth** | Supabase Auth | Email/password, role-based access |
| **Email Campaigns** | Mailgun | Batch sending, webhooks, tracking |
| **Personal Email** | Microsoft Graph | Outlook OAuth integration |
| **AI** | Lovable AI Gateway | Email generation, images |
| **Geocoding** | Google Places API | Address autocomplete |

---

## 3. Organizational Structure

### Parent Company → Imprints Model

```
┌─────────────────────────────────────────────────┐
│                   COMPANY                        │
│  (Single record - global defaults)              │
│  • Name, Logo, Colors, Fonts                    │
│  • Default email settings                       │
│  • Footer templates                             │
└─────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  IMPRINT A  │  │  IMPRINT B  │  │  IMPRINT C  │
│             │  │             │  │             │
│ Own branding│  │ Own branding│  │ Own branding│
│ Own email   │  │ Own email   │  │ Own email   │
│ Own contacts│  │ Own contacts│  │ Own contacts│
└─────────────┘  └─────────────┘  └─────────────┘
```

**Why?** Publishing companies often operate multiple imprints (brands) targeting different genres or markets. Each imprint needs its own identity while sharing the same operational platform.

### Staff vs Users

```
┌─────────────────────────────────────────────────┐
│                    STAFF                         │
│  (Directory of all team members)                │
│  • May or may not have portal access            │
│  • Used for assignment dropdowns                │
│  • Contains title, department, phone            │
└─────────────────────────────────────────────────┘
                        │
                        │ Optional link (user_id)
                        ▼
┌─────────────────────────────────────────────────┐
│                   PROFILES                       │
│  (Users with portal access)                     │
│  • Linked to auth.users                         │
│  • Has role assignment                          │
│  • Can log in and use the platform             │
└─────────────────────────────────────────────────┘
```

**Why?** Not all staff members need portal access. Some are referenced only for assignment purposes (e.g., sales reps in CRM). This separation allows flexibility.

---

## 4. Core Modules

### 4.1 CRM (Contact Management)

**Purpose**: Manage all contacts (leads and authors) through their lifecycle.

**Contact Types**:
- `lead` - Prospective author (default)
- `author` - Active or past customer
- `bad` - Disqualified or problematic

**Key Features**:
- 3-column detail view (sidebar, communications, summary)
- Inline field editing
- Dual assignment (ASC + AE)
- Activity feed (CRM + marketing events combined)
- Lists and tags for organization
- Social/website links

**Data Tables**: `contacts`, `contact_links`, `contact_activity`, `contact_communications`, `contact_notes`, `contact_tasks`, `lists`, `tags`

---

### 4.2 Communication Hub

**Purpose**: Track and manage all 1:1 communications with contacts.

**Communication Types**:
- **Email (Outbound)**: Sent via connected Outlook account
- **Email (Inbound)**: Synced from Outlook inbox
- **Call (Logged)**: Manual call logging with outcome

**Email Integration**:
- OAuth with Microsoft 365 (Outlook)
- Auto-signature with imprint branding
- Time-based greetings ("Good morning, [Name]")
- 2-way sync (send and receive)

**Data Tables**: `contact_communications`, `user_email_connections`

---

### 4.3 Email Marketing (Campaigns)

**Purpose**: Create and send branded email campaigns to contact lists.

**Campaign Workflow**:
1. Create campaign → Select imprint → Auto-populate from email
2. Build content → Block editor or AI chat
3. Select recipients → Lists and/or imprints
4. Schedule or send → Mailgun batch API
5. Track results → Opens, clicks, bounces, unsubscribes

**Block Types**: header, greeting, heading, text, image, button, asc_contact, divider, spacer, footer

**Personalization**: First name, last name, greeting, ASC info, unsubscribe link

**Data Tables**: `campaigns`, `campaign_lists`, `templates`, `email_events`

---

### 4.4 Sales Pipeline (Deals)

**Purpose**: Track sales opportunities through the pipeline with commission tracking.

**Deal Stages**:
1. `new` → 2. `outreach` → 3. `contacted` → 4. `qualified` → 5. `nurturing` → 6. `proposal_sent` → 7. `won` / 8. `lost` / 9. `not_interested`

**Commission System**:
- Tiered structure based on cumulative sales
- Automatic calculation via `calculate_commission()` function
- Lock option to preserve historical commission

**Deal Context**:
- Book info (title, description, writing status)
- Goals and notes
- Outreach count
- Related communications, notes, tasks

**Data Tables**: `deals`, `books`, `commission_tiers`

---

### 4.5 Products Catalog

**Purpose**: Manage the products/services offered to authors.

**Product Categories**:
- `format` - Book formats (hardcover, paperback, ebook)
- `bundle` - Format bundles
- `package` - Full publishing packages
- `service` - Individual services
- `add_on` - Add-on products

**Pricing**:
- `cost_price` - Internal cost
- `min_price` - Minimum selling price
- `retail_price` - Standard retail

**Package Composition**: Products can be packages containing other products via `package_items`.

**Data Tables**: `products`, `package_items`

---

### 4.6 Imprint Management

**Purpose**: Configure branding and email settings for each publishing imprint.

**Configuration**:
- Colors (primary, secondary, accent, background, text)
- Typography (heading font, body font - Google Fonts)
- Assets (logo, dark logo, icon, header image, footer image)
- Email settings (from name, from email, reply-to)
- Brand voice (AI context for content generation)

**Data Tables**: `company`, `imprints`

---

### 4.7 Staff Management

**Purpose**: Maintain staff directory and manage portal access.

**Features**:
- Add/edit staff records
- Link to user profile for portal access
- Invite new users via email
- Manage departments and titles

**Data Tables**: `staff`, `profiles`, `user_roles`

---

### 4.8 Development Tracking (Admin Only)

**Purpose**: Internal project management and documentation.

**Item Types**: tickets, features, risks, decisions, releases

**Features**:
- Markdown-based documentation
- Version history
- Meeting notes with action items
- Link meetings to items discussed

**Data Tables**: `dev_documents`, `dev_document_versions`, `dev_items`, `dev_meetings`, `dev_meeting_links`

---

## 5. User Roles & Permissions

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `super_admin` | System owner | Everything + commission tiers + delete deals |
| `admin` | Full administrator | Everything + manage staff + delete records |
| `asc` | Author Success Coach | Contacts, deals (own), communications |
| `ae` | Account Executive | Contacts, view deals |
| `marketing` | Marketing team | Contacts, campaigns, lists |
| `member` | Basic user | Read access to most features |

**First User**: Automatically becomes `admin`.

**Invited Users**: Role specified in invitation metadata.

---

## 6. External Integrations

### Mailgun (Email Campaigns)
- **Purpose**: Batch email sending for marketing campaigns
- **Secrets**: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION`, `MAILGUN_WEBHOOK_SIGNING_KEY`
- **Features**: 
  - Batch sending (up to 1000 per request)
  - Native open/click tracking
  - Webhook events for delivery, bounces, complaints
  - Unsubscribe handling

### Microsoft Graph (Outlook)
- **Purpose**: Personal email integration
- **Secrets**: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- **Features**:
  - OAuth 2.0 authorization flow
  - Send email on behalf of user
  - Sync inbox emails to CRM
  - Auto token refresh

### Google Places API
- **Purpose**: Address autocomplete and timezone lookup
- **Secrets**: `GOOGLE_PLACES_API_KEY`
- **Features**:
  - Autocomplete suggestions
  - Place details with timezone

### Lovable AI Gateway
- **Purpose**: AI content generation
- **Secrets**: `LOVABLE_API_KEY` (auto-configured)
- **Models Used**: Gemini, GPT (via gateway)
- **Features**:
  - Email content generation
  - Image generation
  - Subject line suggestions

---

## 7. Edge Functions Reference

| Function | Trigger | Purpose |
|----------|---------|---------|
| `generate-email` | User action | AI email content generation |
| `generate-image` | User action | AI image generation |
| `generate-subject` | User action | AI subject line generation |
| `enhance-image-prompt` | User action | Improve image prompts |
| `send-campaign-mailgun` | User action / Cron | Send campaigns via Mailgun |
| `process-scheduled-campaigns` | Cron | Process scheduled campaigns |
| `mailgun-webhook` | Webhook | Handle Mailgun events |
| `track-pixel` | Email open | Track opens (legacy) |
| `track-click` | Link click | Track clicks (legacy) |
| `unsubscribe` | User action | Handle unsubscribes |
| `send-email-outlook` | User action | Send personal email |
| `outlook-oauth-start` | User action | Start OAuth flow |
| `outlook-oauth-callback` | OAuth redirect | Handle OAuth callback |
| `sync-inbox-emails` | User action | Sync inbox from Outlook |
| `places-autocomplete` | User action | Google Places proxy |
| `process-import` | User action | Process CSV imports |
| `invite-user` | Admin action | Send user invitations |
| `send-test-email` | User action | Send test emails |

---

## 8. Database Overview

### Statistics
- **Tables**: 31
- **Enums**: 5 (app_role, campaign_status, deal_stage, lead_source, product_category)
- **Functions**: 4 (has_role, handle_new_user, update_updated_at_column, calculate_commission)
- **Storage Buckets**: 3 (email-assets, imprint-assets, import-files)

### Key Relationships
```
company ─┬─► imprints ─► contacts ─┬─► deals
         │                         ├─► contact_communications
         │                         ├─► contact_notes
         │                         ├─► contact_tasks
         │                         ├─► contact_activity
         │                         └─► email_events
         │
         └─► products ─► package_items

profiles ─┬─► user_roles
          ├─► staff (optional link)
          └─► user_email_connections

campaigns ─┬─► campaign_lists ─► lists ─► contact_lists ─► contacts
           └─► email_events
```

---

## 9. What's Built vs What's Planned

### ✅ Completed Features
- Full CRM with contact management
- Communication hub (email + call logging)
- Outlook OAuth integration
- Email marketing with block editor
- AI email generation
- Mailgun integration with tracking
- Sales pipeline (deals) with Kanban
- Commission system
- Staff management
- Product catalog
- Imprint/brand management
- CSV import
- Development tracking (admin)
- Role-based access control

### 🚧 Planned / Future Features
- **Books Module**: Full book tracking with ISBN, royalties, sales
- **Author Portal**: Public-facing portal for authors
- **Project Management**: Task boards, production timelines
- **Quotes/Proposals**: Generate and track sales proposals
- **Reporting Dashboard**: Charts for sales, campaigns, commissions
- **SMS Integration**: Text messaging to contacts
- **Calendar Integration**: Meeting scheduling

---

## 10. Key Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Block-based emails** | Enables both AI chat and visual editing on same data |
| **Dual assignment (ASC/AE)** | Matches real publishing workflow |
| **Staff separate from Users** | Not all staff need portal access |
| **Parent Company + Imprints** | Multi-brand publishing companies |
| **Mailgun for campaigns** | Reliable, affordable, native tracking |
| **Edge functions for backend** | Serverless, auto-scaling |
| **RLS everywhere** | Security at database level |
| **Commission tiers table** | Flexible, editable without code changes |

---

## 11. Getting Started (For Developers)

### Local Development
```bash
git clone <repo>
cd <project>
npm install
npm run dev
```

### Environment
All environment variables are auto-configured via Lovable Cloud:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

### Making Changes
1. **Frontend**: Edit React components in `src/`
2. **Database**: Use migration tool in Lovable
3. **Edge Functions**: Edit in `supabase/functions/`
4. **Deployment**: Click "Publish" in Lovable

---

## 12. Support & Resources

- **Lovable Docs**: https://docs.lovable.dev/
- **Supabase Docs**: https://supabase.com/docs
- **Mailgun Docs**: https://documentation.mailgun.com/
- **Microsoft Graph**: https://learn.microsoft.com/graph/

---

*This document is the authoritative source for understanding the Author Services Platform. Keep it updated as the platform evolves.*