# Author Services Platform

> A comprehensive CRM and Marketing Automation system for book publishing imprints

## Overview

The Author Services Platform is a vertical SaaS solution designed for the book publishing industry. It combines CRM functionality, email marketing automation, sales pipeline management, and internal project tracking into a single unified platform.

### Key Capabilities

- **Contact Management** - Full CRM with lead tracking, author management, and dual assignment (ASC/AE)
- **Email Marketing** - Block-based campaign builder with AI generation, Mailgun integration, and detailed analytics
- **Sales Pipeline** - Kanban-style deal management with commission tracking
- **Personal Email** - Outlook OAuth integration for 1:1 communications
- **Multi-Brand Support** - Parent company with multiple imprints, each with unique branding

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, shadcn/ui |
| **State Management** | TanStack Query (React Query) |
| **Backend** | Lovable Cloud (Supabase) |
| **Database** | PostgreSQL |
| **Authentication** | Supabase Auth |
| **Email Campaigns** | Mailgun API |
| **Personal Email** | Microsoft Graph API (Outlook) |
| **Edge Functions** | Deno (Supabase Edge Functions) |
| **AI** | Lovable AI Gateway |
| **Address Lookup** | Google Places API |

---

## Project Structure

```
├── docs/                          # Documentation
│   ├── API_DOCUMENTATION.md       # Edge functions API reference
│   ├── erd.md                     # Entity relationship diagrams
│   └── FIELD_DOCUMENTATION.md     # Feature documentation
├── public/                        # Static assets
├── src/
│   ├── assets/                    # Images, logos
│   ├── components/
│   │   ├── campaigns/             # Email campaign builder
│   │   ├── contacts/              # CRM contact components
│   │   ├── deals/                 # Sales pipeline
│   │   ├── development/           # Internal dev tracking
│   │   ├── imprints/              # Brand management
│   │   ├── layout/                # App shell (sidebar, dashboard)
│   │   ├── staff/                 # Staff directory
│   │   └── ui/                    # shadcn/ui components
│   ├── contexts/                  # React contexts (Auth)
│   ├── hooks/                     # Custom React hooks
│   ├── integrations/supabase/     # Supabase client & types
│   ├── lib/                       # Utility functions
│   ├── pages/                     # Route pages
│   └── types/                     # TypeScript types
├── supabase/
│   ├── config.toml                # Supabase configuration
│   ├── functions/                 # Edge functions (Deno)
│   └── migrations/                # Database migrations
├── DATABASE_CHANGELOG.md          # Migration history
├── SCHEMA.md                      # Complete database schema
└── README.md                      # This file
```

---

## Documentation Index

| Document | Description |
|----------|-------------|
| [SCHEMA.md](./SCHEMA.md) | Complete database schema with all 31 tables, enums, RLS policies |
| [docs/erd.md](./docs/erd.md) | Entity relationship diagrams (Mermaid) |
| [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) | Edge functions API reference |
| [docs/FIELD_DOCUMENTATION.md](./docs/FIELD_DOCUMENTATION.md) | Feature documentation and business logic |
| [DATABASE_CHANGELOG.md](./DATABASE_CHANGELOG.md) | Database migration history |

---

## Core Modules

### 1. CRM (Contact Management)
- **Contacts Table**: Lead, Author, Bad types with status tracking
- **Dual Assignment**: ASC (Author Success Coach) + AE (Account Executive)
- **3-Column Layout**: Sidebar (fields), Center (communications), Right (summary)
- **Activity Feed**: CRM activities + marketing email events combined
- **Lists & Tags**: Organize and segment contacts

### 2. Email Marketing (Campaigns)
- **Block-Based Editor**: Drag-and-drop email composition
- **AI Generation**: Chat-based email content generation via Lovable AI
- **Mailgun Integration**: Batch sending with personalization
- **Tracking**: Opens, clicks, bounces, complaints, unsubscribes
- **Scheduling**: Schedule campaigns for future delivery

### 3. Sales Pipeline (Deals)
- **Kanban Board**: 9 stages from New to Won/Lost
- **Commission Tracking**: Tiered commission with milestone bonuses
- **Deal Details**: Book info, goals, notes, outreach count
- **Related Communications**: View emails/calls/notes specific to a deal

### 4. Imprints (Brands)
- **Multi-Brand**: Single parent company, multiple imprints
- **Full Branding**: Colors, fonts, logos, header/footer images
- **Email Settings**: From name, from email, reply-to per imprint
- **Brand Voice**: AI context for content generation

### 5. Staff Management
- **Staff Directory**: Separate from user profiles
- **Portal Access**: Optional link to user profile for login
- **Departments**: Sales, Marketing, etc.

### 6. Products Catalog
- **Categories**: Format, Bundle, Package, Service, Add-on
- **Pricing Tiers**: Cost, Minimum, Retail prices
- **Package Builder**: Compose packages from individual products

---

## User Roles

| Role | Description |
|------|-------------|
| `super_admin` | Full access, commission tier management, delete deals |
| `admin` | Full access, manage staff, delete records |
| `asc` | Author Success Coach - manage contacts/deals |
| `ae` | Account Executive - sales representative |
| `marketing` | Campaign and contact access |
| `member` | Standard read/write access |

---

## External Integrations

| Integration | Purpose | Secret Required |
|-------------|---------|-----------------|
| **Mailgun** | Campaign email sending | `MAILGUN_API_KEY`, `MAILGUN_DOMAIN` |
| **Microsoft Graph** | Outlook email sync | `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` |
| **Google Places** | Address autocomplete | `GOOGLE_PLACES_API_KEY` |
| **Lovable AI** | Content generation | `LOVABLE_API_KEY` (auto-configured) |

---

## Edge Functions

| Function | Purpose |
|----------|---------|
| `generate-email` | AI email content generation |
| `generate-image` | AI image generation |
| `generate-subject` | AI subject line generation |
| `enhance-image-prompt` | Improve image prompts |
| `send-campaign-mailgun` | Send campaigns via Mailgun |
| `process-scheduled-campaigns` | Cron job for scheduled sends |
| `mailgun-webhook` | Handle Mailgun events |
| `track-pixel` | Track email opens |
| `track-click` | Track link clicks |
| `unsubscribe` | Handle unsubscribe requests |
| `send-email-outlook` | Send personal email via Outlook |
| `outlook-oauth-start` | Start OAuth flow |
| `outlook-oauth-callback` | Handle OAuth callback |
| `sync-inbox-emails` | Sync inbox from Outlook |
| `places-autocomplete` | Google Places proxy |
| `process-import` | Process CSV imports |
| `invite-user` | Send user invitations |
| `send-test-email` | Send test emails |

---

## Application Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Index | Redirect to dashboard |
| `/auth` | Auth | Login/signup page |
| `/dashboard` | Dashboard | Main dashboard |
| `/contacts` | Contacts | Contact list |
| `/contacts/:id` | ContactDetail | Contact detail view |
| `/deals` | Deals | Sales pipeline Kanban |
| `/campaigns` | Campaigns | Campaign list |
| `/templates` | Templates | Email templates |
| `/imprints` | Imprints | Brand management |
| `/staff` | Staff | Staff directory |
| `/products` | Products | Product catalog |
| `/settings` | Settings | App settings |
| `/profile` | MyProfile | User profile |
| `/development` | Development | Dev tracking (admin only) |

---

## Development

### Prerequisites
- Node.js 18+
- npm or bun

### Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Variables

The following are automatically configured via Lovable Cloud:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

---

## Deployment

Deploy via Lovable:
1. Open the project in Lovable
2. Click **Share** → **Publish**
3. Frontend deploys to `*.lovable.app`
4. Edge functions deploy automatically

---

## License

Proprietary - Author Services Platform