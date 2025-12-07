# Author Services Platform - Field Documentation
## Version 1.0 - December 2024

---

## Table of Contents
1. [Overview](#overview)
2. [Database Schema](#database-schema)
3. [Features](#features)
4. [Architecture](#architecture)
5. [Integrations](#integrations)

---

## Overview

The Author Services Platform is a comprehensive CRM and marketing automation system designed for publishing imprints. It enables team members to manage contacts (authors and leads), send personalized emails, run marketing campaigns, and track all communications.

### Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI primitives
- **State Management**: TanStack Query (React Query)
- **Backend**: Supabase (Lovable Cloud)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Email Sending**: Microsoft Graph API (Outlook) + Resend
- **Edge Functions**: Deno (Supabase Edge Functions)

---

## Database Schema

### Core Tables

#### `profiles`
Stores user profile information for authenticated platform users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | - | Primary key, references auth.users |
| `email` | text | No | - | User's email address |
| `full_name` | text | Yes | - | User's full name |
| `title` | text | Yes | - | User's job title (for email signatures) |
| `phone` | text | Yes | - | User's phone number (for email signatures) |
| `avatar_url` | text | Yes | - | URL to user's avatar image |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |
| `updated_at` | timestamptz | Yes | now() | Last update timestamp |

**RLS Policies:**
- Users can view all profiles
- Users can only update their own profile

---

#### `user_roles`
Manages role-based access control. Separated from profiles for security.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | References auth.users |
| `role` | app_role | No | 'member' | Enum: 'admin' or 'member' |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |

**Note:** First user to sign up is automatically assigned 'admin' role.

---

#### `imprints`
Publishing imprints/brands with full branding configuration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `name` | text | No | - | Imprint display name |
| `slug` | text | No | - | URL-friendly identifier |
| `from_name` | text | No | - | Default sender name for emails |
| `from_email` | text | No | - | Default sender email address |
| `reply_to_email` | text | Yes | - | Reply-to email address |
| `primary_color` | text | Yes | '#1a1a2e' | Primary brand color (hex) |
| `secondary_color` | text | Yes | '#16213e' | Secondary brand color (hex) |
| `accent_color` | text | Yes | '#0f3460' | Accent color (hex) |
| `background_color` | text | Yes | '#ffffff' | Background color (hex) |
| `text_color` | text | Yes | '#333333' | Text color (hex) |
| `heading_font` | text | Yes | 'Roboto' | Google Font for headings |
| `body_font` | text | Yes | 'Open Sans' | Google Font for body text |
| `logo_url` | text | Yes | - | Logo image URL |
| `logo_dark_url` | text | Yes | - | Dark mode logo URL |
| `icon_url` | text | Yes | - | Favicon/icon URL |
| `header_image_url` | text | Yes | - | Email header image URL |
| `footer_image_url` | text | Yes | - | Email footer image URL |
| `brand_voice` | text | Yes | - | Brand voice description for AI |
| `tagline` | text | Yes | - | Brand tagline |
| `website_url` | text | Yes | - | Imprint website URL |
| `created_by` | uuid | Yes | - | User who created the imprint |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |
| `updated_at` | timestamptz | Yes | now() | Last update timestamp |

---

#### `contacts`
Central contact/lead management table.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `email` | text | No | - | Contact's email address |
| `first_name` | text | Yes | - | First name |
| `last_name` | text | Yes | - | Last name |
| `phone` | text | Yes | - | Phone number (normalized format) |
| `address` | text | Yes | - | Full address |
| `timezone` | text | Yes | - | Contact's timezone |
| `contact_type` | text | Yes | 'lead' | Type: 'Lead', 'Author', 'Bad' |
| `status` | text | Yes | 'active' | Status: 'active', 'inactive', etc. |
| `imprint_id` | uuid | Yes | - | Associated imprint (FK to imprints) |
| `assigned_asc` | uuid | Yes | - | Assigned Author Success Coach (FK to profiles) |
| `assigned_ae` | uuid | Yes | - | Assigned Account Executive (FK to profiles) |
| `notes` | text | Yes | - | General notes about contact |
| `created_by` | uuid | Yes | - | User who created the contact |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |
| `updated_at` | timestamptz | Yes | now() | Last update timestamp |

---

#### `contact_links`
Stores website and social media links for contacts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `contact_id` | uuid | No | - | FK to contacts |
| `link_type` | text | No | - | Type: 'author_website', 'amazon', 'facebook', 'twitter', 'instagram', 'goodreads', 'other' |
| `url` | text | No | - | Full URL |
| `label` | text | Yes | - | Optional display label |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |

---

#### `contact_activity`
Audit trail for CRM activities on contacts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `contact_id` | uuid | No | - | FK to contacts |
| `activity_type` | text | No | - | Type: 'contact_created', 'contact_updated', 'note_added', 'link_added', etc. |
| `description` | text | No | - | Human-readable description |
| `metadata` | jsonb | Yes | - | Additional data (old/new values, field changes) |
| `created_by` | uuid | Yes | - | User who performed the action |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |

---

#### `contact_communications`
Stores all 1:1 communications with contacts (calls, emails, SMS).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `contact_id` | uuid | No | - | FK to contacts |
| `type` | text | No | - | Type: 'email', 'call', 'sms' |
| `direction` | text | No | - | 'inbound' or 'outbound' |
| `subject` | text | Yes | - | Email subject line |
| `body` | text | Yes | - | Email/SMS body content |
| `status` | text | Yes | 'sent' | Status: 'draft', 'sent', 'delivered', 'failed' |
| `duration_seconds` | integer | Yes | - | Call duration in seconds |
| `outcome` | text | Yes | - | Call outcome: 'answered', 'voicemail', 'no_answer', 'busy', 'left_message' |
| `notes` | text | Yes | - | Additional notes |
| `external_id` | text | Yes | - | External system reference ID |
| `created_by` | uuid | Yes | - | User who created the record |
| `created_at` | timestamptz | No | now() | Record creation timestamp |

---

#### `user_email_connections`
OAuth tokens for connected email accounts (Outlook).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `user_id` | uuid | No | - | FK to auth.users |
| `provider` | text | No | 'outlook' | Email provider |
| `email` | text | No | - | Connected email address |
| `access_token` | text | No | - | OAuth access token (encrypted) |
| `refresh_token` | text | Yes | - | OAuth refresh token |
| `token_expires_at` | timestamptz | Yes | - | Token expiration time |
| `last_inbox_sync_at` | timestamptz | Yes | - | Last inbox sync timestamp |
| `created_at` | timestamptz | No | now() | Record creation timestamp |
| `updated_at` | timestamptz | No | now() | Last update timestamp |

---

### Marketing Tables

#### `campaigns`
Email marketing campaigns.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `name` | text | No | - | Campaign name |
| `subject` | text | No | - | Email subject line |
| `from_name` | text | No | - | Sender name |
| `from_email` | text | No | - | Sender email |
| `reply_to_email` | text | Yes | - | Reply-to email address |
| `html_content` | text | No | - | Rendered HTML content |
| `blocks_json` | jsonb | Yes | - | Block-based email structure |
| `status` | campaign_status | Yes | 'draft' | Enum: 'draft', 'scheduled', 'sending', 'sent', 'failed' |
| `template_id` | uuid | Yes | - | FK to templates |
| `scheduled_at` | timestamptz | Yes | - | Scheduled send time |
| `sent_at` | timestamptz | Yes | - | Actual send time |
| `total_recipients` | integer | Yes | 0 | Total recipient count |
| `created_by` | uuid | Yes | - | User who created the campaign |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |
| `updated_at` | timestamptz | Yes | now() | Last update timestamp |

---

#### `templates`
Reusable email templates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `name` | text | No | - | Template name |
| `subject` | text | Yes | - | Default subject line |
| `html_content` | text | No | '' | HTML content |
| `preview_text` | text | Yes | - | Email preview text |
| `created_by` | uuid | Yes | - | User who created the template |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |
| `updated_at` | timestamptz | Yes | now() | Last update timestamp |

---

#### `lists`
Contact lists for segmentation.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `name` | text | No | - | List name |
| `description` | text | Yes | - | List description |
| `created_by` | uuid | Yes | - | User who created the list |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |
| `updated_at` | timestamptz | Yes | now() | Last update timestamp |

---

#### `tags`
Tags for contact categorization.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `name` | text | No | - | Tag name |
| `color` | text | Yes | '#6B7280' | Tag color (hex) |
| `created_by` | uuid | Yes | - | User who created the tag |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |

---

#### `books`
Books associated with author contacts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `contact_id` | uuid | No | - | FK to contacts |
| `title` | text | No | - | Book title |
| `status` | text | Yes | 'draft' | Book status |
| `created_by` | uuid | Yes | - | User who created the record |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |
| `updated_at` | timestamptz | Yes | now() | Last update timestamp |

---

### Junction Tables

#### `contact_lists`
Many-to-many relationship between contacts and lists.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `contact_id` | uuid | No | - | FK to contacts |
| `list_id` | uuid | No | - | FK to lists |
| `added_at` | timestamptz | Yes | now() | When contact was added to list |

---

#### `contact_tags`
Many-to-many relationship between contacts and tags.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `contact_id` | uuid | No | - | FK to contacts |
| `tag_id` | uuid | No | - | FK to tags |
| `added_at` | timestamptz | Yes | now() | When tag was applied |

---

#### `campaign_lists`
Many-to-many relationship between campaigns and lists.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `campaign_id` | uuid | No | - | FK to campaigns |
| `list_id` | uuid | No | - | FK to lists |

---

### Email Tracking Tables

#### `email_queue`
Queue for outgoing campaign emails.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `campaign_id` | uuid | Yes | - | FK to campaigns |
| `contact_id` | uuid | Yes | - | FK to contacts |
| `email` | text | No | - | Recipient email |
| `contact_first_name` | text | Yes | - | Recipient first name |
| `contact_last_name` | text | Yes | - | Recipient last name |
| `subject` | text | Yes | - | Email subject |
| `html_content` | text | Yes | - | Personalized HTML content |
| `from_name` | text | Yes | - | Sender name |
| `from_email` | text | Yes | - | Sender email |
| `reply_to_email` | text | Yes | - | Reply-to email |
| `status` | text | Yes | 'pending' | Status: 'pending', 'sent', 'failed' |
| `attempts` | integer | Yes | 0 | Send attempt count |
| `last_error` | text | Yes | - | Last error message |
| `processed_at` | timestamptz | Yes | - | When email was processed |
| `created_at` | timestamptz | Yes | now() | Record creation timestamp |

---

#### `email_events`
Tracking events for sent emails (opens, clicks, etc.).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | No | gen_random_uuid() | Primary key |
| `campaign_id` | uuid | Yes | - | FK to campaigns |
| `contact_id` | uuid | Yes | - | FK to contacts |
| `email` | text | No | - | Recipient email |
| `event_type` | text | No | - | Type: 'sent', 'delivered', 'opened', 'clicked', 'unsubscribed' |
| `link_url` | text | Yes | - | Clicked URL (for click events) |
| `ip_address` | text | Yes | - | IP address |
| `user_agent` | text | Yes | - | User agent string |
| `is_bot` | boolean | Yes | false | Whether detected as bot |
| `created_at` | timestamptz | No | now() | Event timestamp |

---

## Features

### CRM Module

#### Contact Management
- **3-Column Detail View**: Left sidebar (contact info), center (communication hub), right (summary panel)
- **Inline Editing**: Edit contact fields directly in the sidebar
- **Contact Types**: Lead, Author, Bad
- **Dual Assignment**: Assign both ASC (Author Success Coach) and AE (Account Executive)
- **Phone Normalization**: Automatic formatting to (555) 123-4567
- **Address Autocomplete**: Google Places API integration

#### Contact Lists & Filtering
- **All Contacts Tab**: View all contacts in the system
- **My Contacts Tab**: View contacts assigned to the logged-in user
- **Pagination**: Handle large contact lists efficiently

#### Communication Hub
- **Email Composer**: Rich text editor with automatic greeting and signature
  - Time-based greetings: "Good morning/afternoon/evening [First Name],"
  - Auto-signature with: Imprint logo, user name, title, website, phone
- **Call Logging**: Log calls with duration, outcome, and notes
- **Communication Timeline**: View all emails and calls chronologically
- **2-Way Outlook Sync**: Connect personal Outlook account for email sync

#### Activity Tracking
- **CRM Activity Log**: Tracks contact creation, updates, note additions, link changes
- **Marketing Activity**: Shows campaign emails received (opens, clicks)
- **Field Change History**: Records old/new values for updates

#### Websites & Social Links
- Supported types: Author Website, Amazon, Facebook, Twitter, Instagram, Goodreads, Other
- Add/remove links dynamically

---

### Marketing Module

#### Campaign Builder
- **Mailchimp-Style Checklist**: To, From, Subject, Send Time, Content sections
- **Block-Based Email Editor**: Visual drag-and-drop editing
- **AI Email Generation**: Chat-based AI to generate email content
- **Imprint Selection**: Auto-populates from email based on imprint

#### Block Types
- Header (with logo)
- Heading (H1, H2, H3)
- Text (paragraph with formatting)
- Image (with alt text and link)
- Button (with customizable colors)
- Divider (customizable style and color)
- Spacer (adjustable height)
- Columns (multi-column layouts)
- Footer (with unsubscribe link)

#### Campaign Sending
- **All Contacts Option**: Send to entire contact database
- **List-Based Sending**: Send to specific contact lists
- **Reply-To Email**: Configurable reply-to address
- **VPS Email Worker**: External worker for high-volume sending via Resend

#### Email Tracking
- Open tracking (pixel)
- Click tracking (link wrapping)
- Unsubscribe handling
- Bot detection

---

### Imprint Management

#### Brand Configuration
- **Colors**: Primary, secondary, accent, background, text
- **Typography**: Heading and body Google Fonts
- **Assets**: Logo, dark logo, icon, header image, footer image
- **Email Settings**: From name, from email, reply-to email
- **Brand Voice**: Description for AI email generation

---

### User Management

#### Authentication
- Email/password authentication
- Auto-confirm email signups (development mode)
- First user becomes admin automatically

#### Profiles
- Full name
- Title (for email signatures)
- Phone (for email signatures)
- Avatar upload

#### Email Connections
- Outlook OAuth integration
- Multi-tenant Azure app (works with any Microsoft account)
- Automatic token refresh

---

## Architecture

### Frontend Structure
```
src/
├── components/
│   ├── campaigns/       # Campaign builder components
│   ├── contacts/        # CRM contact components
│   ├── imprints/        # Imprint management components
│   ├── layout/          # App layout (sidebar, dashboard)
│   └── ui/              # shadcn/ui components
├── contexts/            # React contexts (Auth)
├── hooks/               # Custom React hooks
├── integrations/        # Supabase client
├── lib/                 # Utility functions
├── pages/               # Route pages
└── types/               # TypeScript types
```

### Edge Functions
```
supabase/functions/
├── generate-email/          # AI email generation
├── generate-image/          # AI image generation
├── get-pending-emails/      # Fetch emails for worker
├── outlook-oauth-start/     # Initiate Outlook OAuth
├── outlook-oauth-callback/  # Handle OAuth callback
├── places-autocomplete/     # Google Places API proxy
├── send-campaign/           # Queue campaign emails
├── send-email-outlook/      # Send via Microsoft Graph
├── sync-inbox-emails/       # Sync inbox from Outlook
├── track-click/             # Track email link clicks
├── track-pixel/             # Track email opens
├── unsubscribe/             # Handle unsubscribes
├── update-email-status/     # Update queue status
└── check-campaign-completion/ # Check if campaign finished
```

---

## Integrations

### Microsoft Graph (Outlook)
- OAuth 2.0 with multi-tenant Azure app
- Send emails on behalf of connected users
- 2-way inbox sync (future)

### Resend
- Bulk campaign email sending
- Used by VPS worker for high-volume sends

### Google Places API
- Address autocomplete for contacts

### Lovable AI Gateway
- AI email content generation
- Supports streaming responses

---

## Database Functions

### `has_role(_user_id uuid, _role app_role)`
Security definer function to check if a user has a specific role. Used in RLS policies.

### `handle_new_user()`
Trigger function that runs on new user signup:
- Creates profile record
- Assigns 'admin' role to first user, 'member' to others

### `update_updated_at_column()`
Trigger function to automatically update `updated_at` timestamps.

---

## Storage Buckets

### `email-assets`
- **Public**: Yes
- **Purpose**: Store images uploaded in campaign emails

### `imprint-assets`
- **Public**: Yes
- **Purpose**: Store imprint logos and brand assets

---

## Environment Variables / Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `LOVABLE_API_KEY` | Lovable AI Gateway API key |
| `RESEND_API_KEY` | Resend email service API key |
| `AZURE_CLIENT_ID` | Microsoft Azure app client ID |
| `AZURE_CLIENT_SECRET` | Microsoft Azure app client secret |
| `GOOGLE_PLACES_API_KEY` | Google Places API key |
| `WORKER_API_KEY` | API key for VPS email worker |

---

## Enums

### `app_role`
- `admin` - Full access to all features
- `member` - Standard user access

### `campaign_status`
- `draft` - Campaign being edited
- `scheduled` - Scheduled for future send
- `sending` - Currently sending
- `sent` - Sending complete
- `failed` - Sending failed

---

*Documentation generated: December 2024*
