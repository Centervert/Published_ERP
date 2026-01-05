# Author Services Platform - Field Documentation
## Complete Feature & Business Logic Reference

> **Last Updated:** 2025-01-05  
> **Version:** 2.0

---

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Core Modules](#core-modules)
4. [Features by Module](#features-by-module)
5. [Architecture](#architecture)
6. [Integrations](#integrations)
7. [Security & Access Control](#security--access-control)

---

## Overview

The Author Services Platform is a comprehensive CRM and marketing automation system designed for publishing imprints. It enables team members to manage contacts (authors and leads), send personalized emails, run marketing campaigns, manage sales pipelines, and track all communications.

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI primitives
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (Lovable Cloud)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Email Campaigns**: Mailgun (batch sending, scheduling, tracking)
- **Personal Email**: Microsoft Graph (Outlook OAuth)
- **Edge Functions**: Deno (Supabase Edge Functions)
- **AI**: Lovable AI Gateway

---

## Database Schema

> For complete table definitions, see [SCHEMA.md](../SCHEMA.md)

### Table Categories

#### Core Tables (4)
| Table | Description |
|-------|-------------|
| `profiles` | User profile information linked to auth |
| `user_roles` | Role-based access control |
| `company` | Parent company configuration (singleton) |
| `imprints` | Publishing brands with full branding |

#### Staff & Users (2)
| Table | Description |
|-------|-------------|
| `staff` | Staff directory (separate from users) |
| `user_email_connections` | OAuth email connections (Outlook) |

#### CRM Tables (10)
| Table | Description |
|-------|-------------|
| `contacts` | Core contact/lead records |
| `contact_links` | Social/website links for contacts |
| `contact_activity` | CRM audit trail |
| `contact_communications` | Email and call history |
| `contact_notes` | Dedicated notes table |
| `contact_tasks` | Task management |
| `lists` | Contact organization lists |
| `contact_lists` | Junction: contacts ↔ lists |
| `tags` | Flexible categorization labels |
| `contact_tags` | Junction: contacts ↔ tags |

#### Sales Tables (5)
| Table | Description |
|-------|-------------|
| `deals` | Sales pipeline tracking |
| `books` | Book tracking for authors |
| `products` | Product catalog |
| `package_items` | Package composition |
| `commission_tiers` | Tiered commission structure |

#### Marketing Tables (5)
| Table | Description |
|-------|-------------|
| `templates` | Reusable email templates |
| `campaigns` | Email marketing campaigns |
| `campaign_lists` | Junction: campaigns ↔ lists |
| `email_events` | Email tracking analytics |
| `import_jobs` | CSV import job tracking |

#### Development Tables (5)
| Table | Description |
|-------|-------------|
| `dev_documents` | Documentation projects |
| `dev_document_versions` | Version history |
| `dev_items` | Tickets, features, risks, decisions |
| `dev_meetings` | Meeting notes |
| `dev_meeting_links` | Junction: meetings ↔ items |

---

## Core Modules

### 1. Contact Management (CRM)

#### Contact Types
| Type | Description |
|------|-------------|
| `lead` | Prospective author (default) |
| `author` | Active/past author |
| `bad` | Unqualified or problematic contact |

#### Contact Statuses
| Status | Description |
|--------|-------------|
| `active` | Normal active status |
| `unsubscribed` | Opted out of emails |
| `bounced` | Email bounced |
| `complained` | Marked as spam |

#### Lead Sources
| Source | Description |
|--------|-------------|
| `website_landing_page` | Marketing landing page |
| `manual_entry` | Staff-entered |
| `marketing_partner` | Partner referral |
| `import` | CSV import |

#### Dual Assignment System
Contacts can be assigned to two team members:
- **ASC (Author Success Coach)**: Primary relationship manager for leads
- **AE (Account Executive)**: Sales representative

Assignment can be via:
- `assigned_asc` / `assigned_ae`: User profile references
- `staff_asc_id` / `staff_ae_id`: Staff table references
- `assigned_asc_text` / `assigned_ae_text`: Legacy text fields

#### Contact Detail View Layout
3-column layout:
1. **Left Sidebar**: Contact fields (inline editable)
2. **Center Panel**: Communication hub with tabs
3. **Right Panel**: Summary with stats and quick actions

---

### 2. Communication Hub

#### Communication Types
| Type | Direction | Description |
|------|-----------|-------------|
| `email` | outbound | Email sent to contact |
| `email` | inbound | Email received from contact |
| `call` | outbound | Call made to contact |
| `call` | inbound | Call received from contact |

#### Call Outcomes
| Outcome | Description |
|---------|-------------|
| `answered` | Call was answered |
| `voicemail` | Left voicemail |
| `no_answer` | No answer, no voicemail |
| `busy` | Line was busy |
| `left_message` | Left message with person |

#### Email Composer Features
- Rich text editing (TipTap)
- Automatic time-based greeting: "Good morning/afternoon/evening [First Name],"
- Auto-signature with imprint branding
- Outlook OAuth for personal email sending

#### Outlook Integration
- OAuth 2.0 with Microsoft Graph API
- Scopes: `Mail.Read`, `Mail.Send`, `Mail.ReadWrite`
- Token refresh handled automatically
- 2-way sync: Send from app, receive to timeline

---

### 3. Sales Pipeline (Deals)

#### Deal Stages
| Stage | Description | Order |
|-------|-------------|-------|
| `new` | New lead, not contacted | 1 |
| `outreach` | Initial outreach in progress | 2 |
| `contacted` | Successfully made contact | 3 |
| `qualified` | Qualified as potential customer | 4 |
| `nurturing` | Long-term follow-up | 5 |
| `proposal_sent` | Proposal/quote sent | 6 |
| `won` | Deal closed successfully | 7 |
| `lost` | Deal lost | 8 |
| `not_interested` | Lead declined | 9 |

#### Deal Fields
- **Book Info**: `book_title`, `book_description`, `writing_status`, `goals`
- **Value**: `total_value`, `commission_amount`, `commission_locked`
- **Activity**: `outreach_count`
- **Assignment**: `assigned_asc`

#### Commission System
Tiered structure in `commission_tiers`:
- `min_amount` / `max_amount`: Cumulative sales thresholds
- `percentage`: Commission rate
- `milestone_bonus`: Bonus at tier entry

Function `calculate_commission(sale_amount, cumulative_sales)` returns:
- `commission`: Calculated amount
- `tier_percentage`: Applied rate
- `milestone_bonus`: Any bonus earned

---

### 4. Email Marketing (Campaigns)

#### Campaign Statuses
| Status | Description |
|--------|-------------|
| `draft` | Being edited |
| `scheduled` | Scheduled for future |
| `sending` | Currently sending |
| `sent` | Fully sent |
| `failed` | Sending failed |

#### Block-Based Email System
Campaigns use `blocks_json` (JSONB) for structured content:

| Block Type | Description |
|------------|-------------|
| `header` | Logo header with background color |
| `greeting` | Time-based personalized greeting |
| `heading` | H1, H2, or H3 heading |
| `text` | Paragraph with formatting |
| `image` | Image with alt text and optional link |
| `button` | CTA button with customizable colors |
| `asc_contact` | Author Success Coach contact block |
| `divider` | Horizontal divider |
| `spacer` | Vertical spacing |
| `columns` | Multi-column layout |
| `footer` | Footer with unsubscribe link |

#### Personalization Variables
Used in email content, replaced at send time:
- `%recipient.first_name%` - Contact's first name
- `%recipient.last_name%` - Contact's last name
- `%recipient.email%` - Contact's email
- `%recipient.greeting%` - Time-based greeting
- `%recipient.sender_name%` - Dynamic sender name
- `%recipient.asc_name%` - ASC name
- `%recipient.asc_email%` - ASC email
- `%recipient.asc_phone%` - ASC phone
- `%recipient.unsubscribe_url%` - Unsubscribe link

#### Email Events Tracking
| Event Type | Description |
|------------|-------------|
| `sent` | Email queued for sending |
| `delivered` | Email delivered to recipient |
| `opened` | Email opened (tracked via Mailgun) |
| `clicked` | Link clicked (tracked via Mailgun) |
| `bounced` | Email bounced |
| `complained` | Marked as spam |
| `unsubscribed` | Recipient unsubscribed |

---

### 5. Imprint Management

#### Parent Company vs Imprints
- **Company**: Single record with global defaults
- **Imprints**: Multiple brands, each with independent branding

#### Branding Configuration
| Category | Fields |
|----------|--------|
| **Colors** | primary, secondary, accent, background, text |
| **Typography** | heading_font, body_font (Google Fonts) |
| **Assets** | logo, logo_dark, icon, favicon, header_image, footer_image |
| **Email** | from_name, from_email, reply_to_email |
| **AI** | brand_voice (context for content generation) |

---

### 6. Staff Management

#### Staff vs Profiles
- **Staff**: Directory entry (may not have portal access)
- **Profiles**: User account (has portal access)
- **Link**: Staff record can optionally link to profile via `user_id`

#### Staff Fields
- `full_name`, `email`, `phone`
- `title` (e.g., "Author Success Coach")
- `department` (e.g., "sales")
- `active` (boolean)
- `user_id` (optional link to profiles)

---

### 7. Products Catalog

#### Product Categories
| Category | Description |
|----------|-------------|
| `format` | Book format (hardcover, paperback, ebook) |
| `bundle` | Bundle of formats |
| `package` | Full publishing package |
| `service` | Individual service |
| `add_on` | Add-on service/product |

#### Pricing Tiers
- `cost_price`: Internal cost
- `min_price`: Minimum selling price
- `retail_price`: Standard retail price

#### Package Composition
Packages (`is_package = true`) contain items via `package_items`:
- `package_id`: The package product
- `item_id`: Component product
- `quantity`: How many of the item

---

### 8. Development Tracking

> Admin-only module for internal project management

#### Item Types
| Type | Description |
|------|-------------|
| `ticket` | Bug or task |
| `feature` | Feature request |
| `risk` | Risk item |
| `decision` | Decision log |
| `release` | Release notes |

#### Document Structure
- **dev_documents**: Top-level documentation projects
- **dev_document_versions**: Version history with markdown content
- **dev_items**: Individual trackable items
- **dev_meetings**: Meeting notes with attendees
- **dev_meeting_links**: Links meetings to discussed items

---

## Architecture

### Frontend Structure
```
src/
├── components/
│   ├── campaigns/        # Email campaign builder
│   │   ├── BlockEditor.tsx
│   │   ├── CampaignDetail.tsx
│   │   ├── EmailBuilder.tsx
│   │   ├── EmailChat.tsx
│   │   ├── EmailPreview.tsx
│   │   └── blocks/       # Individual block components
│   ├── contacts/         # CRM components
│   │   ├── ContactsTable.tsx
│   │   ├── ContactSidebar.tsx
│   │   ├── CommunicationHub.tsx
│   │   ├── EmailComposer.tsx
│   │   └── ...
│   ├── deals/            # Sales pipeline
│   │   ├── KanbanColumn.tsx
│   │   ├── DealCard.tsx
│   │   └── DealDetailSheet.tsx
│   ├── imprints/         # Brand management
│   ├── staff/            # Staff directory
│   ├── development/      # Dev tracking
│   ├── layout/           # App shell
│   └── ui/               # shadcn/ui components
├── contexts/
│   └── AuthContext.tsx   # Authentication context
├── hooks/                # Custom React hooks
│   ├── useContacts.ts
│   ├── useDeals.ts
│   ├── useCampaigns.ts
│   └── ...
├── pages/                # Route pages
├── lib/                  # Utilities
└── types/                # TypeScript types
```

### Edge Functions
| Function | Purpose |
|----------|---------|
| `generate-email` | AI email content generation |
| `generate-image` | AI image generation |
| `generate-subject` | AI subject line generation |
| `enhance-image-prompt` | Improve image prompts |
| `send-campaign-mailgun` | Campaign sending via Mailgun |
| `process-scheduled-campaigns` | Scheduled campaign processor |
| `mailgun-webhook` | Mailgun event webhooks |
| `track-pixel` | Open tracking |
| `track-click` | Click tracking |
| `unsubscribe` | Unsubscribe handling |
| `send-email-outlook` | Personal email via Outlook |
| `outlook-oauth-start` | OAuth flow initiation |
| `outlook-oauth-callback` | OAuth callback handler |
| `sync-inbox-emails` | Inbox sync from Outlook |
| `places-autocomplete` | Google Places proxy |
| `process-import` | CSV import processor |
| `invite-user` | User invitation emails |
| `send-test-email` | Test email sending |

---

## Integrations

### Mailgun (Email Campaigns)
- **Purpose**: Batch email sending for campaigns
- **Secrets**: `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION`
- **Features**: Batch sending (1000/request), tracking, webhooks

### Microsoft Graph (Outlook)
- **Purpose**: Personal email send/receive
- **Secrets**: `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- **Features**: OAuth 2.0, token refresh, inbox sync

### Google Places
- **Purpose**: Address autocomplete
- **Secrets**: `GOOGLE_PLACES_API_KEY`
- **Features**: Autocomplete suggestions, timezone lookup

### Lovable AI
- **Purpose**: Content generation
- **Secrets**: `LOVABLE_API_KEY` (auto-configured)
- **Features**: Email content, images, subject lines

---

## Security & Access Control

### Role-Based Access Control (RBAC)

| Role | Contacts | Deals | Campaigns | Staff | Products | Settings |
|------|----------|-------|-----------|-------|----------|----------|
| `super_admin` | Full | Full (delete) | Full | Full | Full (delete) | Full |
| `admin` | Full | Full | Full | Full | Full | Full |
| `asc` | Full | Create/Update own | View | View | View | Limited |
| `ae` | Full | View | View | View | View | Limited |
| `marketing` | Full | View | Full | View | View | Limited |
| `member` | Limited | View | View | View | View | Limited |

### Row-Level Security (RLS)
All tables have RLS enabled with appropriate policies:
- **Authenticated read**: Most tables allow all authenticated users to SELECT
- **Creator-based write**: Users can only INSERT/UPDATE records they created
- **Admin escalation**: Admins can DELETE, manage roles, etc.
- **Public endpoints**: Tracking endpoints allow public INSERT for events

### Security Functions
- `has_role(user_id, role)`: Check if user has specific role (SECURITY DEFINER)
- `handle_new_user()`: Trigger to create profile and assign role on signup

---

## Data Flow Diagrams

### Campaign Send Flow
```
User creates campaign → Selects lists/imprints → Schedules or sends
  ↓
process-scheduled-campaigns (cron) or send-campaign-mailgun (immediate)
  ↓
Fetch contacts from lists/imprints (union, filter bounced/unsubscribed)
  ↓
Render blocks to HTML with imprint styling
  ↓
Build recipient variables for personalization
  ↓
Send to Mailgun in batches (max 1000)
  ↓
Log 'sent' events → Update campaign status
  ↓
Mailgun webhooks → mailgun-webhook function → Log events
```

### Contact Activity Flow
```
CRM Actions → contact_activity (audit log)
Email Campaigns → email_events (marketing events)
Personal Email → contact_communications (1:1 history)
  ↓
Combined in Activity Feed (ContactActivityFeed.tsx)
```

### Import Process Flow
```
Upload CSV → Create import_job → Map columns
  ↓
process-import edge function
  ↓
For each row: Validate → Create contact → Update counters
  ↓
Log errors/warnings → Update job status
```