# Database Schema Reference

> Complete data dictionary for Author Services Platform
>
> **Last Updated:** 2025-01-05  
> **Database:** Supabase PostgreSQL (Lovable Cloud)  
> **Schema:** `public`

---

## Table of Contents

1. [Enums](#enums)
2. [Core Tables](#core-tables)
   - [profiles](#profiles)
   - [user_roles](#user_roles)
3. [Company & Brands](#company--brands)
   - [company](#company)
   - [imprints](#imprints)
4. [Staff & Users](#staff--users)
   - [staff](#staff)
   - [user_email_connections](#user_email_connections)
5. [CRM Tables](#crm-tables)
   - [contacts](#contacts)
   - [contact_links](#contact_links)
   - [contact_activity](#contact_activity)
   - [contact_communications](#contact_communications)
   - [contact_notes](#contact_notes)
   - [contact_tasks](#contact_tasks)
   - [lists](#lists)
   - [contact_lists](#contact_lists)
   - [tags](#tags)
   - [contact_tags](#contact_tags)
6. [Sales Tables](#sales-tables)
   - [deals](#deals)
   - [books](#books)
   - [products](#products)
   - [package_items](#package_items)
   - [commission_tiers](#commission_tiers)
7. [Marketing Tables](#marketing-tables)
   - [templates](#templates)
   - [campaigns](#campaigns)
   - [campaign_lists](#campaign_lists)
   - [email_events](#email_events)
8. [Import System](#import-system)
   - [import_jobs](#import_jobs)
9. [Development Tables](#development-tables)
   - [dev_documents](#dev_documents)
   - [dev_document_versions](#dev_document_versions)
   - [dev_items](#dev_items)
   - [dev_meetings](#dev_meetings)
   - [dev_meeting_links](#dev_meeting_links)
10. [Storage Buckets](#storage-buckets)
11. [Functions](#functions)
12. [Triggers](#triggers)

---

## Enums

### app_role
User role types for access control.

| Value | Description |
|-------|-------------|
| `super_admin` | System owner, full access including commission tier management and deal deletion |
| `admin` | Full system access, can delete records, manage roles, manage staff |
| `asc` | Author Success Coach - primary contact/deal manager |
| `ae` | Account Executive - sales representative |
| `marketing` | Marketing team - campaign and contact access |
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

### deal_stage
Sales pipeline stages for deals.

| Value | Description |
|-------|-------------|
| `new` | New lead, not yet contacted |
| `outreach` | Initial outreach in progress |
| `contacted` | Successfully made contact |
| `qualified` | Qualified as potential customer |
| `nurturing` | Long-term follow-up |
| `proposal_sent` | Proposal/quote sent |
| `won` | Deal closed successfully |
| `lost` | Deal lost to competitor/declined |
| `not_interested` | Lead declined services |

### lead_source
Origin of contact/lead.

| Value | Description |
|-------|-------------|
| `website_landing_page` | Lead from marketing landing page |
| `manual_entry` | Manually entered by staff |
| `marketing_partner` | Referred by marketing partner |
| `import` | Imported from CSV file |

### product_category
Product catalog categorization.

| Value | Description |
|-------|-------------|
| `format` | Book format (hardcover, paperback, ebook) |
| `bundle` | Bundle of formats |
| `package` | Publishing package |
| `service` | Individual service |
| `add_on` | Add-on service/product |

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
| `phone` | text | YES | NULL | Phone number |
| `title` | text | YES | NULL | Job title |
| `active` | boolean | NO | `true` | Active/inactive flag |
| `created_at` | timestamptz | YES | `now()` | Record creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT: All authenticated users can view all profiles
- UPDATE: Users can only update their own profile
- INSERT: Authenticated users can create placeholder profiles (active=false); handled by `handle_new_user()` trigger
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
- SELECT: Users can view their own roles; Admins/super_admins can view all
- ALL: Only admins/super_admins can manage roles

**Security Note:** Roles stored separately to prevent privilege escalation attacks.

---

## Company & Brands

### company
Parent company configuration (singleton record).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Company name |
| `slug` | text | NO | - | URL-safe identifier |
| `tagline` | text | YES | NULL | Company tagline |
| `phone` | text | YES | NULL | Main phone number |
| `legal_address` | text | YES | NULL | Legal/mailing address |
| `website_url` | text | YES | NULL | Company website |
| `primary_color` | text | YES | `'#1a1a2e'` | Primary brand color |
| `secondary_color` | text | YES | `'#16213e'` | Secondary brand color |
| `accent_color` | text | YES | `'#0f3460'` | Accent color |
| `background_color` | text | YES | `'#ffffff'` | Background color |
| `text_color` | text | YES | `'#333333'` | Text color |
| `heading_font` | text | YES | `'Roboto'` | Heading font (Google Fonts) |
| `body_font` | text | YES | `'Open Sans'` | Body font (Google Fonts) |
| `logo_url` | text | YES | NULL | Light mode logo |
| `logo_dark_url` | text | YES | NULL | Dark mode logo |
| `icon_url` | text | YES | NULL | App icon |
| `favicon_url` | text | YES | NULL | Browser favicon |
| `header_image_url` | text | YES | NULL | Email header image (light) |
| `header_image_dark_url` | text | YES | NULL | Email header image (dark) |
| `footer_image_url` | text | YES | NULL | Email footer image |
| `brand_voice` | text | YES | NULL | AI context for tone |
| `from_name` | text | YES | NULL | Default email sender name |
| `from_email` | text | YES | NULL | Default email sender address |
| `reply_to_email` | text | YES | NULL | Default reply-to address |
| `footer_copyright_template` | text | YES | `'© {year} {company_name}...'` | Copyright template |
| `footer_reason_template` | text | YES | `'You received this...'` | Email footer reason |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT: All authenticated users
- UPDATE: Admins and super_admins only
- INSERT: Blocked (singleton)
- DELETE: Blocked (singleton)

**Note:** This is a singleton table - only one company record exists.

---

### imprints
Publishing imprints/brands with full branding configuration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `company_id` | uuid | YES | NULL | Parent company reference |
| `name` | text | NO | - | Imprint name |
| `slug` | text | NO | - | URL-safe identifier (unique) |
| `tagline` | text | YES | NULL | Brand tagline |
| `website_url` | text | YES | NULL | Brand website |
| `from_name` | text | NO | - | Email sender name |
| `from_email` | text | NO | - | Email sender address |
| `reply_to_email` | text | YES | NULL | Reply-to address |
| `brand_voice` | text | YES | NULL | AI context for tone |
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
| `header_image_url` | text | YES | NULL | Email header image (light) |
| `header_image_dark_url` | text | YES | NULL | Email header image (dark) |
| `footer_image_url` | text | YES | NULL | Email footer image |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**Foreign Keys:**
- `company_id` → `company(id)` ON DELETE SET NULL

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Authenticated users (creator check)
- UPDATE: All authenticated users
- DELETE: Admins only

---

## Staff & Users

### staff
Staff directory (separate from user profiles for non-portal staff).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `full_name` | text | NO | - | Staff member name |
| `email` | text | NO | - | Email address |
| `phone` | text | YES | NULL | Phone number |
| `title` | text | YES | `'Author Success Coach'` | Job title |
| `department` | text | YES | `'sales'` | Department |
| `active` | boolean | YES | `true` | Active status |
| `user_id` | uuid | YES | NULL | Linked profile (if has portal access) |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**Foreign Keys:**
- `user_id` → `profiles(id)` ON DELETE SET NULL

**RLS Policies:**
- SELECT: All authenticated users
- INSERT/UPDATE/DELETE: Admins and super_admins only

**Note:** Staff records exist independently from profiles. A staff member may or may not have portal access (user_id link).

---

### user_email_connections
OAuth email connections for personal email integration.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `user_id` | uuid | NO | - | Profile owner |
| `provider` | text | NO | `'outlook'` | OAuth provider |
| `email` | text | NO | - | Connected email address |
| `access_token` | text | NO | - | OAuth access token |
| `refresh_token` | text | YES | NULL | OAuth refresh token |
| `token_expires_at` | timestamptz | YES | NULL | Token expiration |
| `last_inbox_sync_at` | timestamptz | YES | NULL | Last inbox sync |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |

**Foreign Keys:**
- `user_id` → `profiles(id)` ON DELETE CASCADE

**RLS Policies:**
- ALL: Users can only manage their own connections

**Providers:** Currently supports `outlook` (Microsoft 365) via OAuth 2.0

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
| `search_name` | text | YES | NULL | Computed searchable name |
| `phone` | text | YES | NULL | Phone number (formatted) |
| `phone_normalized` | text | YES | NULL | E.164 formatted phone |
| `address` | text | YES | NULL | Mailing address |
| `timezone` | text | YES | NULL | Contact's timezone |
| `contact_type` | text | YES | `'lead'` | Type: lead, author, bad |
| `status` | text | YES | `'active'` | Status: active, unsubscribed, bounced, complained |
| `lead_source` | lead_source | YES | `'manual_entry'` | Origin of contact |
| `lead_source_detail` | text | YES | NULL | Additional source info |
| `imprint_id` | uuid | YES | NULL | Associated imprint/brand |
| `notes` | text | YES | NULL | Free-form notes |
| `assigned_asc` | uuid | YES | NULL | Author Success Coach (user) |
| `assigned_ae` | uuid | YES | NULL | Account Executive (user) |
| `staff_asc_id` | uuid | YES | NULL | Author Success Coach (staff) |
| `staff_ae_id` | uuid | YES | NULL | Account Executive (staff) |
| `assigned_asc_text` | text | YES | NULL | Legacy ASC text assignment |
| `assigned_ae_text` | text | YES | NULL | Legacy AE text assignment |
| `created_by` | uuid | YES | NULL | User who created the contact |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**Foreign Keys:**
- `imprint_id` → `imprints(id)` ON DELETE SET NULL
- `assigned_asc` → `auth.users(id)` ON DELETE SET NULL
- `assigned_ae` → `auth.users(id)` ON DELETE SET NULL
- `staff_asc_id` → `staff(id)` ON DELETE SET NULL
- `staff_ae_id` → `staff(id)` ON DELETE SET NULL
- `created_by` → `auth.users(id)` ON DELETE SET NULL

**Indexes:**
- `idx_contacts_email` on `email`
- `idx_contacts_status` on `status`
- `idx_contacts_created_at` on `created_at`
- `idx_contacts_assigned_asc` on `assigned_asc`

**RLS Policies:**
- SELECT: Users can view own or assigned contacts; admins/super_admins/marketing can view all
- UPDATE: All authenticated users
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

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Authenticated users (with `created_by` check) + system insert
- UPDATE/DELETE: Not allowed

---

### contact_communications
Email and call history for contacts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `contact_id` | uuid | NO | - | Related contact |
| `deal_id` | uuid | YES | NULL | Related deal (if applicable) |
| `type` | text | NO | - | Communication type: email, call |
| `direction` | text | NO | - | Direction: inbound, outbound |
| `subject` | text | YES | NULL | Email subject |
| `body` | text | YES | NULL | Email body or call notes |
| `notes` | text | YES | NULL | Additional notes |
| `status` | text | YES | `'sent'` | Status: sent, draft, failed |
| `outcome` | text | YES | NULL | Call outcome |
| `duration_seconds` | integer | YES | NULL | Call duration |
| `external_id` | text | YES | NULL | External message ID (e.g., Outlook) |
| `created_by` | uuid | YES | NULL | User who created |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |

**Foreign Keys:**
- `contact_id` → `contacts(id)` ON DELETE CASCADE
- `deal_id` → `deals(id)` ON DELETE SET NULL
- `created_by` → `profiles(id)` ON DELETE SET NULL

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Authenticated users (creator check)
- UPDATE: Users can update their own
- DELETE: Admins only

---

### contact_notes
Dedicated notes table for contacts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `contact_id` | uuid | NO | - | Related contact |
| `deal_id` | uuid | YES | NULL | Related deal (if applicable) |
| `content` | text | NO | - | Note content |
| `created_by` | uuid | YES | NULL | User who created |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |

**Foreign Keys:**
- `contact_id` → `contacts(id)` ON DELETE CASCADE
- `deal_id` → `deals(id)` ON DELETE SET NULL
- `created_by` → `profiles(id)` ON DELETE SET NULL

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Authenticated users (creator check)
- UPDATE: Users can update their own
- DELETE: Admins only

---

### contact_tasks
Task management for contacts.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `contact_id` | uuid | NO | - | Related contact |
| `deal_id` | uuid | YES | NULL | Related deal (if applicable) |
| `title` | text | NO | - | Task title |
| `description` | text | YES | NULL | Task description |
| `priority` | text | YES | `'medium'` | Priority: low, medium, high |
| `due_date` | timestamptz | YES | NULL | Due date |
| `completed` | boolean | NO | `false` | Completion status |
| `completed_at` | timestamptz | YES | NULL | Completion timestamp |
| `created_by` | uuid | YES | NULL | User who created |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |

**Foreign Keys:**
- `contact_id` → `contacts(id)` ON DELETE CASCADE
- `deal_id` → `deals(id)` ON DELETE SET NULL
- `created_by` → `profiles(id)` ON DELETE SET NULL

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Authenticated users (creator check)
- UPDATE: All authenticated users
- DELETE: Admins only

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

## Sales Tables

### deals
Sales pipeline tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `contact_id` | uuid | NO | - | Related contact |
| `name` | text | YES | NULL | Deal name |
| `stage` | deal_stage | NO | `'new'` | Pipeline stage |
| `total_value` | numeric | YES | `0` | Total deal value |
| `commission_amount` | numeric | YES | `0` | Calculated commission |
| `commission_locked` | boolean | NO | `false` | Lock commission from recalc |
| `outreach_count` | integer | NO | `0` | Number of outreach attempts |
| `book_title` | text | YES | NULL | Book title |
| `book_description` | text | YES | NULL | Book description |
| `writing_status` | text | YES | NULL | Writing status |
| `goals` | text | YES | NULL | Author goals |
| `notes` | text | YES | NULL | Deal notes |
| `assigned_asc` | uuid | YES | NULL | Assigned ASC (user) |
| `closed_at` | timestamptz | YES | NULL | Close date |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |

**Foreign Keys:**
- `contact_id` → `contacts(id)` ON DELETE CASCADE
- `assigned_asc` → `profiles(id)` ON DELETE SET NULL
- `created_by` → `profiles(id)` ON DELETE SET NULL

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: ASC/admins/super_admins (creator check)
- UPDATE: Assigned ASC or admins/super_admins
- DELETE: Super_admins only

---

### books
Book tracking for authors.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `contact_id` | uuid | NO | - | Author contact |
| `title` | text | NO | - | Book title |
| `status` | text | YES | `'draft'` | Publication status |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**Foreign Keys:**
- `contact_id` → `contacts(id)` ON DELETE CASCADE
- `created_by` → `profiles(id)` ON DELETE SET NULL

**RLS Policies:**
- SELECT/UPDATE: All authenticated users
- INSERT: Authenticated users (creator check)
- DELETE: Admins only

---

### products
Product catalog.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `name` | text | NO | - | Product name |
| `sku` | text | NO | - | Stock keeping unit |
| `description` | text | YES | NULL | Product description |
| `category` | product_category | NO | `'service'` | Product category |
| `cost_price` | numeric | YES | NULL | Internal cost |
| `min_price` | numeric | YES | NULL | Minimum sell price |
| `retail_price` | numeric | YES | NULL | Standard retail price |
| `active` | boolean | NO | `true` | Active status |
| `is_package` | boolean | NO | `false` | Is this a package |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT: All authenticated users
- INSERT/UPDATE: Admins and super_admins
- DELETE: Super_admins only

---

### package_items
Package contents (junction table for products).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `package_id` | uuid | NO | - | Package product |
| `item_id` | uuid | NO | - | Component product |
| `quantity` | integer | NO | `1` | Quantity of item |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |

**Foreign Keys:**
- `package_id` → `products(id)` ON DELETE CASCADE
- `item_id` → `products(id)` ON DELETE CASCADE

**RLS Policies:**
- SELECT: All authenticated users
- ALL: Admins and super_admins

---

### commission_tiers
Tiered commission structure.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `min_amount` | numeric | NO | - | Tier minimum threshold |
| `max_amount` | numeric | YES | NULL | Tier maximum threshold (NULL = unlimited) |
| `percentage` | numeric | NO | - | Commission percentage |
| `milestone_bonus` | numeric | YES | `0` | Bonus at tier entry |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |

**RLS Policies:**
- SELECT: All authenticated users
- ALL: Super_admins only

---

## Marketing Tables

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
| `route_replies_to_asc` | boolean | YES | `false` | Route replies to assigned ASC |
| `template_id` | uuid | YES | NULL | Source template |
| `html_content` | text | NO | - | Rendered HTML content |
| `blocks_json` | jsonb | YES | NULL | Structured block content |
| `status` | campaign_status | YES | `'draft'` | Current status |
| `scheduled_at` | timestamptz | YES | NULL | Scheduled send time |
| `scheduled_imprint_ids` | uuid[] | YES | NULL | Target imprints |
| `scheduled_additional_recipients` | text[] | YES | NULL | Additional email addresses |
| `sent_at` | timestamptz | YES | NULL | Actual send time |
| `total_recipients` | integer | YES | `0` | Number of recipients |
| `delivered_count` | integer | YES | `0` | Delivered count |
| `bounce_count` | integer | YES | `0` | Bounce count |
| `complaint_count` | integer | YES | `0` | Complaint count |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |
| `updated_at` | timestamptz | YES | `now()` | Last update timestamp |

**Foreign Keys:**
- `template_id` → `templates(id)` ON DELETE SET NULL

**Indexes:**
- `idx_campaigns_status` on `status`

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Authenticated users (creator check)
- UPDATE: All authenticated users
- DELETE: Creator or admins/super_admins

---

### campaign_lists
Junction table: campaigns ↔ lists (recipient selection).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `campaign_id` | uuid | NO | - | Campaign reference |
| `list_id` | uuid | NO | - | List reference |

**Primary Key:** `(campaign_id, list_id)`

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
- UPDATE/DELETE: Not allowed

---

## Import System

### import_jobs
CSV import job tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `file_name` | text | NO | - | Original file name |
| `file_path` | text | YES | NULL | Storage path |
| `file_data` | text | YES | NULL | Base64 file data |
| `status` | text | NO | `'pending'` | Job status |
| `column_mapping` | jsonb | YES | NULL | Field mapping config |
| `total_rows` | integer | YES | `0` | Total rows to process |
| `processed_rows` | integer | YES | `0` | Rows processed |
| `successful_rows` | integer | YES | `0` | Successful imports |
| `failed_rows` | integer | YES | `0` | Failed imports |
| `errors` | jsonb | YES | `'[]'` | Error details |
| `warnings` | jsonb | YES | `'[]'` | Warning details |
| `created_by` | uuid | YES | NULL | Creator |
| `started_at` | timestamptz | YES | NULL | Start timestamp |
| `completed_at` | timestamptz | YES | NULL | Completion timestamp |
| `created_at` | timestamptz | YES | `now()` | Creation timestamp |

**Status Values:** `pending`, `processing`, `completed`, `failed`

**RLS Policies:**
- SELECT/UPDATE/DELETE: Users can manage their own jobs
- INSERT: Authenticated users (creator check)
- ALL: Service role for processing

---

## Development Tables

> These tables are for internal project management and are only accessible to admins.

### dev_documents
Development documentation projects.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `title` | text | NO | - | Document title |
| `slug` | text | NO | - | URL-safe identifier |
| `summary` | text | YES | NULL | Brief summary |
| `status` | text | NO | `'active'` | Document status |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |

**RLS Policies:**
- SELECT: All authenticated users
- INSERT/UPDATE/DELETE: Admins and super_admins only

---

### dev_document_versions
Document version history.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `document_id` | uuid | NO | - | Parent document |
| `version_number` | integer | NO | - | Version number |
| `content_md` | text | NO | - | Markdown content |
| `change_summary` | text | YES | NULL | Change description |
| `is_published` | boolean | NO | `true` | Published status |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |

**Foreign Keys:**
- `document_id` → `dev_documents(id)` ON DELETE CASCADE

**RLS Policies:**
- SELECT: All authenticated users
- INSERT: Admins and super_admins only
- UPDATE/DELETE: Not allowed

---

### dev_items
Development items (tickets, features, risks, decisions, releases).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `document_id` | uuid | NO | - | Parent document |
| `item_type` | text | NO | - | Type: ticket, feature, risk, decision, release |
| `title` | text | NO | - | Item title |
| `body_md` | text | YES | NULL | Markdown content |
| `status` | text | YES | NULL | Item status |
| `severity` | text | YES | NULL | Severity level |
| `priority` | integer | YES | `0` | Priority (higher = more urgent) |
| `phase` | text | YES | NULL | Development phase |
| `owner_name` | text | YES | NULL | Owner name (text) |
| `owner_user_id` | uuid | YES | NULL | Owner (user reference) |
| `due_date` | date | YES | NULL | Due date |
| `tags` | text[] | YES | NULL | Tags array |
| `related_type` | text | YES | NULL | Related entity type |
| `related_id` | text | YES | NULL | Related entity ID |
| `is_archived` | boolean | NO | `false` | Archived status |
| `archived_at` | timestamptz | YES | NULL | Archive timestamp |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |

**Item Types:** `ticket`, `feature`, `risk`, `decision`, `release`

**Foreign Keys:**
- `document_id` → `dev_documents(id)` ON DELETE CASCADE
- `owner_user_id` → `profiles(id)` ON DELETE SET NULL

**RLS Policies:**
- SELECT: All authenticated users
- INSERT/UPDATE/DELETE: Admins and super_admins only

---

### dev_meetings
Meeting notes.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `document_id` | uuid | NO | - | Parent document |
| `title` | text | NO | - | Meeting title |
| `meeting_date` | timestamptz | YES | NULL | Meeting date/time |
| `attendees` | text[] | YES | NULL | Attendee names |
| `notes_md` | text | YES | NULL | Meeting notes (markdown) |
| `outcomes_md` | text | YES | NULL | Outcomes (markdown) |
| `action_items_md` | text | YES | NULL | Action items (markdown) |
| `created_by` | uuid | YES | NULL | Creator |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |
| `updated_at` | timestamptz | NO | `now()` | Last update timestamp |

**Foreign Keys:**
- `document_id` → `dev_documents(id)` ON DELETE CASCADE

**RLS Policies:**
- SELECT: All authenticated users
- INSERT/UPDATE/DELETE: Admins and super_admins only

---

### dev_meeting_links
Links meetings to items discussed.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | uuid | NO | `gen_random_uuid()` | Primary key |
| `meeting_id` | uuid | NO | - | Meeting reference |
| `item_id` | uuid | NO | - | Dev item reference |
| `created_at` | timestamptz | NO | `now()` | Creation timestamp |

**Foreign Keys:**
- `meeting_id` → `dev_meetings(id)` ON DELETE CASCADE
- `item_id` → `dev_items(id)` ON DELETE CASCADE

**RLS Policies:**
- SELECT: All authenticated users
- ALL: Admins and super_admins only

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
- INSERT/UPDATE/DELETE: Authenticated users

### import-files
**Public:** No  
**Purpose:** Temporary CSV file storage during imports

**Policies:**
- ALL: Users can manage their own files; service role full access

---

## Functions

### calculate_commission(sale_amount, cumulative_sales) → TABLE
Calculates commission based on tiered structure.

```sql
calculate_commission(
  sale_amount NUMERIC,
  cumulative_sales NUMERIC
) RETURNS TABLE (
  commission NUMERIC,
  tier_percentage NUMERIC,
  milestone_bonus NUMERIC
)
```

**Logic:**
1. Looks up tier based on cumulative_sales
2. Calculates commission as `sale_amount * tier_percentage / 100`
3. Returns commission amount, tier percentage, and any milestone bonus

### has_role(uuid, app_role) → boolean
Security definer function to check user roles without RLS recursion.

```sql
has_role(_user_id UUID, _role app_role) RETURNS BOOLEAN
```

### handle_new_user() → trigger
Creates profile and assigns role on user signup.
- First user becomes admin
- Respects `invited_role` from user metadata
- Defaults to 'member' role

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
| `update_company_updated_at` | `company` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_staff_updated_at` | `staff` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_deals_updated_at` | `deals` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_products_updated_at` | `products` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_dev_documents_updated_at` | `dev_documents` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_dev_items_updated_at` | `dev_items` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_dev_meetings_updated_at` | `dev_meetings` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_contact_notes_updated_at` | `contact_notes` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_contact_tasks_updated_at` | `contact_tasks` | BEFORE UPDATE | `update_updated_at_column()` |
| `update_user_email_connections_updated_at` | `user_email_connections` | BEFORE UPDATE | `update_updated_at_column()` |