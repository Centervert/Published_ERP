# Database Schema Reference

> Complete data dictionary for Author Services Platform
>
> **Last Updated:** 2025-12-07  
> **Database:** Supabase PostgreSQL (Lovable Cloud)  
> **Schema:** `public`

---

## Table of Contents

1. [Enums](#enums)
2. [Core Tables](#core-tables)
   - [profiles](#profiles)
   - [user_roles](#user_roles)
3. [CRM Tables](#crm-tables)
   - [contacts](#contacts)
   - [contact_links](#contact_links)
   - [contact_activity](#contact_activity)
   - [lists](#lists)
   - [contact_lists](#contact_lists)
   - [tags](#tags)
   - [contact_tags](#contact_tags)
4. [Marketing Tables](#marketing-tables)
   - [imprints](#imprints)
   - [templates](#templates)
   - [campaigns](#campaigns)
   - [campaign_lists](#campaign_lists)
   - [email_queue](#email_queue)
   - [email_events](#email_events)
5. [Storage Buckets](#storage-buckets)
6. [Functions](#functions)
7. [Triggers](#triggers)

---

## Enums

### app_role
User role types for access control.

| Value | Description |
|-------|-------------|
| `admin` | Full system access, can delete records, manage roles |
| `member` | Standard user, read/write access to most features |

### campaign_status
Lifecycle states for email campaigns.

| Value | Description |
|-------|-------------|
| `draft` | Campaign is being edited |
| `scheduled` | Campaign is scheduled for future sending |
| `sending` | Campaign is actively being sent |
| `sent` | Campaign has been fully sent |
| `failed` | Campaign sending failed |

---

## Core Tables

### profiles
User profile information linked to Supabase Auth.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | - | Primary key, references `auth.users(id)` |
| `email` | text | NO | - | User's email address |
| `full_name` | text | YES | NULL | Display name |
| `avatar_url` | text | YES | NULL | URL to profile picture |
| `created_at` | timestamptz | YES | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT: All authenticated users can view all profiles
- UPDATE: Users can only update their own profile
- INSERT: Handled by `handle_new_user()` trigger
- DELETE: Not allowed

**Indexes:** Primary key on `id`

---

### user_roles
Role assignments for access control (separate table for security).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NO | - | References `auth.users(id)` |
| `role` | app_role | NO | `'member'` | Assigned role |
| `created_at` | timestamptz | YES | `now()` | Assignment timestamp |

**Constraints:**
- UNIQUE on `(user_id, role)` - prevents duplicate role assignments

**RLS Policies:**
- SELECT: Users can view their own roles; Admins can view all
- ALL: Only admins can manage roles

**Security Note:** Roles stored separately to prevent privilege escalation attacks.

---

## CRM Tables

### contacts
Core contact/lead records.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `email` | text | NO | - | Contact email (unique) |
| `first_name` | text | YES | NULL | First name |
| `last_name` | text | YES | NULL | Last name |
| `phone` | text | YES | NULL | Phone number (formatted) |
| `address` | text | YES | NULL | Mailing address |
| `timezone` | text | YES | NULL | Contact's timezone |
| `contact_type` | text | YES | `'lead'` | Type: lead, author, bad |
| `status` | text | YES | `'active'` | Status: active, unsubscribed, bounced, complained |
| `imprint_id` | uuid | YES | NULL | Associated imprint/brand |
| `notes` | text | YES | NULL | Free-form notes |
| `assigned_asc` | uuid | YES | NULL | Author Success Coach assignment |
| `assigned_ae` | uuid | YES | NULL | Account Executive assignment |
| `created_by` | uuid | YES | NULL | User who created the contact |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**Foreign Keys:**
- `imprint_id` → `imprints(id)` ON DELETE SET NULL
- `assigned_asc` → `auth.users(id)` ON DELETE SET NULL
- `assigned_ae` → `auth.users(id)` ON DELETE SET NULL
- `created_by` → `auth.users(id)` ON DELETE SET NULL

**Indexes:**
- `idx_contacts_email` on `email`
- `idx_contacts_status` on `status`
- `idx_contacts_created_at` on `created_at`
- `idx_contacts_assigned_asc` on `assigned_asc`
- `idx_contacts_assigned_ae` on `assigned_ae` (implicit from BSS rename)

**RLS Policies:**
- SELECT/UPDATE: All authenticated users
- INSERT: Authenticated users (must set `created_by` to own ID)
- DELETE: Admins only

---

### contact_links
Dynamic social/website links for contacts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `contact_id` | uuid | NO | - | Parent contact |
| `link_type` | text | NO | - | Type of link |
| `url` | text | NO | - | Full URL |
| `label` | text | YES | NULL | Custom label (for 'other' type) |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |

**Link Types:** `author_website`, `amazon`, `facebook`, `twitter`, `instagram`, `linkedin`, `goodreads`, `other`

**Foreign Keys:**
- `contact_id` → `contacts(id)` ON DELETE CASCADE

**RLS Policies:** Full CRUD for authenticated users

---

### contact_activity
CRM activity audit trail.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `contact_id` | uuid | NO | - | Related contact |
| `activity_type` | text | NO | - | Type of activity |
| `description` | text | NO | - | Human-readable description |
| `metadata` | jsonb | YES | NULL | Additional data (old/new values) |
| `created_by` | uuid | YES | NULL | User who performed action |
| `created_at` | timestamptz | YES | `now()` | Activity timestamp |

**Activity Types:** `contact_created`, `contact_updated`, `note_added`, `link_added`, `link_removed`, `assignment_changed`

**Foreign Keys:**
- `contact_id` → `contacts(id)` ON DELETE CASCADE
- `created_by` → `profiles(id)` ON DELETE SET NULL

**Indexes:**
- `idx_contact_activity_contact_id` on `contact_id`
- `idx_contact_activity_created_at` on `created_at DESC`

**Realtime:** Enabled for live activity feed updates

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Authenticated users (with `created_by` check) + system insert

---

### lists
Contact organization/segmentation lists.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | List name |
| `description` | text | YES | NULL | List description |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT/UPDATE: All authenticated users
- INSERT: Authenticated users (creator check)
- DELETE: Admins only

---

### contact_lists
Junction table: contacts ↔ lists (many-to-many).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `contact_id` | uuid | NO | - | Contact reference |
| `list_id` | uuid | NO | - | List reference |
| `added_at` | timestamptz | YES | `now()` | When contact was added |

**Primary Key:** `(contact_id, list_id)`

**Foreign Keys:**
- `contact_id` → `contacts(id)` ON DELETE CASCADE
- `list_id` → `lists(id)` ON DELETE CASCADE

---

### tags
Flexible categorization labels.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Tag name |
| `color` | text | YES | `'#6B7280'` | Hex color code |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |

**RLS Policies:** Same pattern as lists

---

### contact_tags
Junction table: contacts ↔ tags (many-to-many).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `contact_id` | uuid | NO | - | Contact reference |
| `tag_id` | uuid | NO | - | Tag reference |
| `added_at` | timestamptz | YES | `now()` | When tag was applied |

**Primary Key:** `(contact_id, tag_id)`

---

## Marketing Tables

### imprints
Publishing imprints/brands with full branding configuration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Imprint name |
| `slug` | text | NO | - | URL-safe identifier (unique) |
| `from_name` | text | NO | - | Email sender name |
| `from_email` | text | NO | - | Email sender address |
| `reply_to_email` | text | YES | NULL | Reply-to address |
| `primary_color` | text | YES | `'#1a1a2e'` | Brand primary color |
| `secondary_color` | text | YES | `'#16213e'` | Brand secondary color |
| `accent_color` | text | YES | `'#0f3460'` | Brand accent color |
| `background_color` | text | YES | `'#ffffff'` | Email background |
| `text_color` | text | YES | `'#333333'` | Email text color |
| `heading_font` | text | YES | `'Roboto'` | Heading font (Google Fonts) |
| `body_font` | text | YES | `'Open Sans'` | Body font (Google Fonts) |
| `logo_url` | text | YES | NULL | Light mode logo |
| `logo_dark_url` | text | YES | NULL | Dark mode logo |
| `icon_url` | text | YES | NULL | Favicon/icon |
| `header_image_url` | text | YES | NULL | Email header image |
| `footer_image_url` | text | YES | NULL | Email footer image |
| `brand_voice` | text | YES | NULL | AI context for tone |
| `tagline` | text | YES | NULL | Brand tagline |
| `website_url` | text | YES | NULL | Brand website |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

---

### templates
Reusable email templates.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Template name |
| `subject` | text | YES | NULL | Default subject line |
| `html_content` | text | NO | `''` | Raw HTML content |
| `preview_text` | text | YES | NULL | Email preview text |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

---

### campaigns
Email marketing campaigns.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Campaign name |
| `subject` | text | NO | - | Email subject line |
| `from_name` | text | NO | - | Sender display name |
| `from_email` | text | NO | - | Sender email address |
| `reply_to_email` | text | YES | NULL | Reply-to address |
| `template_id` | uuid | YES | NULL | Source template |
| `html_content` | text | NO | - | Rendered HTML content |
| `blocks_json` | jsonb | YES | NULL | Structured block content |
| `status` | campaign_status | YES | `'draft'` | Current status |
| `scheduled_at` | timestamptz | YES | NULL | Scheduled send time |
| `sent_at` | timestamptz | YES | NULL | Actual send time |
| `total_recipients` | integer | YES | `0` | Number of recipients |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**Foreign Keys:**
- `template_id` → `templates(id)` ON DELETE SET NULL

**Indexes:**
- `idx_campaigns_status` on `status`

---

### campaign_lists
Junction table: campaigns ↔ lists (recipient selection).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `campaign_id` | uuid | NO | - | Campaign reference |
| `list_id` | uuid | NO | - | List reference |

**Primary Key:** `(campaign_id, list_id)`

---

### email_queue
Batch email sending queue for VPS worker.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `campaign_id` | uuid | YES | NULL | Parent campaign |
| `contact_id` | uuid | YES | NULL | Recipient contact |
| `email` | text | NO | - | Recipient email |
| `subject` | text | YES | NULL | Email subject (denormalized) |
| `from_name` | text | YES | NULL | Sender name (denormalized) |
| `from_email` | text | YES | NULL | Sender email (denormalized) |
| `reply_to_email` | text | YES | NULL | Reply-to (denormalized) |
| `html_content` | text | YES | NULL | Full HTML (denormalized) |
| `contact_first_name` | text | YES | NULL | For personalization |
| `contact_last_name` | text | YES | NULL | For personalization |
| `status` | text | YES | `'pending'` | pending, sending, sent, failed |
| `attempts` | integer | YES | `0` | Send attempt count |
| `last_error` | text | YES | NULL | Last error message |
| `created_at` | timestamptz | YES | `now()` | Queue timestamp |
| `processed_at` | timestamptz | YES | NULL | Processing timestamp |

**Indexes:**
- `idx_email_queue_campaign` on `campaign_id`
- `idx_email_queue_status` on `status`

---

### email_events
Email tracking analytics.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `campaign_id` | uuid | YES | NULL | Related campaign |
| `contact_id` | uuid | YES | NULL | Related contact |
| `email` | text | NO | - | Recipient email |
| `event_type` | text | NO | - | Event type |
| `link_url` | text | YES | NULL | Clicked URL (for click events) |
| `ip_address` | text | YES | NULL | Client IP |
| `user_agent` | text | YES | NULL | Client user agent |
| `is_bot` | boolean | YES | `false` | Bot detection flag |
| `created_at` | timestamptz | NO | `now()` | Event timestamp |

**Event Types:** `sent`, `delivered`, `opened`, `clicked`, `bounced`, `unsubscribed`, `complained`

**Foreign Keys:**
- `campaign_id` → `campaigns(id)` ON DELETE SET NULL
- `contact_id` → `contacts(id)` ON DELETE SET NULL

**Indexes:**
- `idx_email_events_campaign` on `campaign_id`
- `idx_email_events_contact` on `contact_id`
- `idx_email_events_type` on `event_type`

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Public (for tracking endpoints)

---

## Storage Buckets

### email-assets
**Public:** Yes  
**Purpose:** Email images and attachments

**Policies:**
- SELECT: Public (anyone can view)
- INSERT/UPDATE: Authenticated users
- DELETE: Admins only

### imprint-assets
**Public:** Yes  
**Purpose:** Brand logos, headers, footers

**Policies:**
- SELECT: Public (anyone can view)
- INSERT/UPDATE: Authenticated users
- DELETE: Authenticated users

---

## Functions

### has_role(uuid, app_role) → boolean
Security definer function to check user roles without RLS recursion.

```sql
has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN
```

### handle_new_user() → trigger
Creates profile and assigns role on user signup. First user becomes admin.

### update_updated_at_column() → trigger
Updates `updated_at` timestamp on row modification.

---

## Triggers

| Trigger | Table | Event | Function |
|---------|-------|-------|----------|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` |
| `update_profiles_updated_at` | `profiles` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_lists_updated_at` | `lists` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_contacts_updated_at` | `contacts` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_templates_updated_at` | `templates` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_campaigns_updated_at` | `campaigns` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_imprints_updated_at` | `imprints` | BEFORE UPDATE | `update_updated_at_column()` |
