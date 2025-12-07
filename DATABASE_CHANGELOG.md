# Database Changelog

> Enterprise-grade database migration documentation for Author Services Platform
> 
> **Last Updated:** 2025-12-07  
> **Total Migrations:** 17  
> **Database:** Supabase PostgreSQL (Lovable Cloud)

---

## Migration Index

| # | Migration ID | Date | Summary |
|---|--------------|------|---------|
| 1 | `20251205204316` | 2025-12-05 | Email tracking events table |
| 2 | `20251205204958` | 2025-12-05 | User profiles, roles, and auth system |
| 3 | `20251205205119` | 2025-12-05 | Fix update_updated_at_column search path |
| 4 | `20251205205520` | 2025-12-05 | Contact management system (lists, tags, contacts) |
| 5 | `20251205210332` | 2025-12-05 | Templates and campaigns with email queue |
| 6 | `20251205213233` | 2025-12-05 | Email queue denormalization for VPS worker |
| 7 | `20251205221317` | 2025-12-05 | Bot detection flag for email events |
| 8 | `20251205223410` | 2025-12-05 | Reply-to email for campaigns |
| 9 | `20251205223534` | 2025-12-05 | Reply-to email for email queue |
| 10 | `20251206022601` | 2025-12-06 | Imprints/brand management system |
| 11 | `20251206032910` | 2025-12-06 | Block-based email content (JSON blocks) |
| 12 | `20251207003852` | 2025-12-07 | CRM contact fields and contact links |
| 13 | `20251207005711` | 2025-12-07 | Contact activity logging system |
| 14 | `20251207012349` | 2025-12-07 | Contact assignment (assigned_to) |
| 15 | `20251207014203` | 2025-12-07 | Dual assignment (ASC/BSS) |
| 16 | `20251207015040` | 2025-12-07 | Rename BSS to AE (Account Executive) |
| 17 | `20251207021524` | 2025-12-07 | Contact activity foreign key to profiles |

---

## Detailed Migration History

### Migration #1: Email Tracking Events
**File:** `20251205204316_e4123f77-311a-4427-82ab-ccfc66f5dc80.sql`  
**Date:** 2025-12-05 20:43:16 UTC  
**Purpose:** Foundation for email analytics and tracking

**Changes:**
- Created `email_events` table for tracking email interactions
- Added columns: `id`, `campaign_id`, `contact_id`, `email`, `event_type`, `link_url`, `ip_address`, `user_agent`, `created_at`
- Event types: `sent`, `delivered`, `opened`, `clicked`, `bounced`, `unsubscribed`, `complained`
- Created performance indexes on `campaign_id`, `contact_id`, `event_type`
- Enabled RLS with authenticated read access and public insert for tracking endpoints

**Rollback:** `DROP TABLE public.email_events CASCADE;`

---

### Migration #2: User Profiles and Roles System
**File:** `20251205204958_39986c11-77df-4e2f-83bf-1e649c9b97ba.sql`  
**Date:** 2025-12-05 20:49:58 UTC  
**Purpose:** Authentication and authorization foundation

**Changes:**
- Created `app_role` enum: `admin`, `member`
- Created `profiles` table linked to `auth.users`
- Created `user_roles` table (separate for security best practices)
- Created `has_role()` security definer function to prevent RLS recursion
- Created `handle_new_user()` trigger function (first user becomes admin)
- Created `on_auth_user_created` trigger on `auth.users`
- Created `update_updated_at_column()` function
- Established RLS policies for profiles and roles

**Security Notes:**
- Roles are stored in separate table to prevent privilege escalation
- `has_role()` uses SECURITY DEFINER to bypass RLS during role checks

**Rollback:** 
```sql
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP TABLE IF EXISTS public.user_roles;
DROP TABLE IF EXISTS public.profiles;
DROP TYPE IF EXISTS public.app_role;
```

---

### Migration #3: Fix Function Search Path
**File:** `20251205205119_1d7b5214-280a-4b35-b80d-26593c68dbb4.sql`  
**Date:** 2025-12-05 20:51:19 UTC  
**Purpose:** Security fix for function search path

**Changes:**
- Updated `update_updated_at_column()` to include `SET search_path = public`

**Security Notes:** Prevents search_path injection attacks

**Rollback:** N/A (function replacement)

---

### Migration #4: Contact Management System
**File:** `20251205205520_5e8a7402-d1cb-4b46-8a39-9eefdb459bd0.sql`  
**Date:** 2025-12-05 20:55:20 UTC  
**Purpose:** Core CRM contact functionality

**Changes:**
- Created `lists` table for contact organization
- Created `tags` table with color support
- Created `contacts` table with status tracking
- Created `contact_lists` junction table (many-to-many)
- Created `contact_tags` junction table (many-to-many)
- Added foreign key from `email_events` to `contacts`
- Created performance indexes
- Established RLS policies for all tables
- Created `update_at` triggers

**Contact Statuses:** `active`, `unsubscribed`, `bounced`, `complained`

**Rollback:**
```sql
DROP TABLE IF EXISTS public.contact_tags CASCADE;
DROP TABLE IF EXISTS public.contact_lists CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.lists CASCADE;
```

---

### Migration #5: Templates and Campaigns
**File:** `20251205210332_87d75360-d55a-4a24-a264-303a16089804.sql`  
**Date:** 2025-12-05 21:03:32 UTC  
**Purpose:** Email marketing core functionality

**Changes:**
- Created `templates` table for reusable email designs
- Created `campaign_status` enum: `draft`, `scheduled`, `sending`, `sent`, `failed`
- Created `campaigns` table with full email configuration
- Created `campaign_lists` junction table
- Created `email_queue` table for batch sending
- Added foreign key from `email_events` to `campaigns`
- Created `email-assets` storage bucket (public)
- Established storage policies

**Rollback:**
```sql
DELETE FROM storage.buckets WHERE id = 'email-assets';
DROP TABLE IF EXISTS public.email_queue CASCADE;
DROP TABLE IF EXISTS public.campaign_lists CASCADE;
DROP TABLE IF EXISTS public.campaigns CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TYPE IF EXISTS public.campaign_status;
```

---

### Migration #6: Email Queue Denormalization
**File:** `20251205213233_5148d405-a425-43a0-a07b-87e86ced1344.sql`  
**Date:** 2025-12-05 21:32:33 UTC  
**Purpose:** Optimize for VPS email worker

**Changes:**
- Added to `email_queue`: `subject`, `from_name`, `from_email`, `html_content`, `contact_first_name`, `contact_last_name`

**Rationale:** Pre-render email data so VPS worker can send without complex joins

**Rollback:**
```sql
ALTER TABLE public.email_queue 
DROP COLUMN IF EXISTS subject,
DROP COLUMN IF EXISTS from_name,
DROP COLUMN IF EXISTS from_email,
DROP COLUMN IF EXISTS html_content,
DROP COLUMN IF EXISTS contact_first_name,
DROP COLUMN IF EXISTS contact_last_name;
```

---

### Migration #7: Bot Detection
**File:** `20251205221317_9ddbaaf0-b39f-4816-80d8-8ffe813e9d71.sql`  
**Date:** 2025-12-05 22:13:17 UTC  
**Purpose:** Non-destructive bot detection for email analytics

**Changes:**
- Added `is_bot` boolean column to `email_events` (default: false)

**Rationale:** Track potential bot opens/clicks for accurate analytics

**Rollback:** `ALTER TABLE public.email_events DROP COLUMN IF EXISTS is_bot;`

---

### Migration #8: Campaign Reply-To Email
**File:** `20251205223410_7db3acde-c281-4a1c-af2f-5a171c604804.sql`  
**Date:** 2025-12-05 22:34:10 UTC  
**Purpose:** Custom reply-to address support

**Changes:**
- Added `reply_to_email` column to `campaigns`

**Rollback:** `ALTER TABLE public.campaigns DROP COLUMN IF EXISTS reply_to_email;`

---

### Migration #9: Email Queue Reply-To
**File:** `20251205223534_1660ac3e-a349-44db-a144-ace0013c35c5.sql`  
**Date:** 2025-12-05 22:35:34 UTC  
**Purpose:** Pass reply-to to VPS worker

**Changes:**
- Added `reply_to_email` column to `email_queue`

**Rollback:** `ALTER TABLE public.email_queue DROP COLUMN IF EXISTS reply_to_email;`

---

### Migration #10: Imprints/Brand Management
**File:** `20251206022601_12a44b73-480b-49de-89ed-ee3322ce045c.sql`  
**Date:** 2025-12-06 02:26:01 UTC  
**Purpose:** Multi-brand/imprint support

**Changes:**
- Created `imprints` table with:
  - Email config: `from_name`, `from_email`, `reply_to_email`
  - Brand colors: `primary_color`, `secondary_color`, `accent_color`, `background_color`, `text_color`
  - Typography: `heading_font`, `body_font`
  - Assets: `logo_url`, `logo_dark_url`, `icon_url`, `header_image_url`, `footer_image_url`
  - AI context: `brand_voice`, `tagline`, `website_url`
- Created `imprint-assets` storage bucket
- Established RLS and storage policies

**Rollback:**
```sql
DELETE FROM storage.buckets WHERE id = 'imprint-assets';
DROP TABLE IF EXISTS public.imprints CASCADE;
```

---

### Migration #11: Block-Based Email Content
**File:** `20251206032910_7fb70340-023d-44d4-96ee-3cfccada707d.sql`  
**Date:** 2025-12-06 03:29:10 UTC  
**Purpose:** Structured email editing with AI and visual builder

**Changes:**
- Added `blocks_json` JSONB column to `campaigns`
- Added documentation comment

**Rationale:** Enable both AI chat and drag-and-drop editing on same data structure

**Rollback:** `ALTER TABLE public.campaigns DROP COLUMN IF EXISTS blocks_json;`

---

### Migration #12: CRM Contact Fields and Links
**File:** `20251207003852_2caa4755-09b3-451a-8ebe-9d99a2cc162b.sql`  
**Date:** 2025-12-07 00:38:52 UTC  
**Purpose:** Enhanced CRM contact data

**Changes:**
- Added to `contacts`: `phone`, `address`, `timezone`, `contact_type`, `imprint_id`, `notes`
- Created `contact_links` table for social/website links
- Supported link types: `author_website`, `amazon`, `facebook`, `twitter`, `instagram`, `linkedin`, `goodreads`, `other`

**Rollback:**
```sql
DROP TABLE IF EXISTS public.contact_links CASCADE;
ALTER TABLE public.contacts 
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS timezone,
DROP COLUMN IF EXISTS contact_type,
DROP COLUMN IF EXISTS imprint_id,
DROP COLUMN IF EXISTS notes;
```

---

### Migration #13: Contact Activity Logging
**File:** `20251207005711_cc0f1a1b-0c2e-4733-ac30-908312c3ee46.sql`  
**Date:** 2025-12-07 00:57:11 UTC  
**Purpose:** CRM audit trail and activity feed

**Changes:**
- Created `contact_activity` table
- Added metadata JSONB for storing change details
- Created indexes for performance
- Enabled realtime for live updates

**Activity Types:** `contact_created`, `contact_updated`, `note_added`, `link_added`, `link_removed`, etc.

**Rollback:** `DROP TABLE IF EXISTS public.contact_activity CASCADE;`

---

### Migration #14: Contact Assignment
**File:** `20251207012349_ec099213-9d3d-4d4a-805d-0a66c6939c99.sql`  
**Date:** 2025-12-07 01:23:49 UTC  
**Purpose:** Assign contacts to team members

**Changes:**
- Added `assigned_to` column to `contacts`
- Created index for performance

**Note:** This was superseded by Migration #15

**Rollback:** `ALTER TABLE public.contacts DROP COLUMN IF EXISTS assigned_to;`

---

### Migration #15: Dual Assignment (ASC/BSS)
**File:** `20251207014203_30ab4bb8-7719-432c-9057-7cd1aa088e14.sql`  
**Date:** 2025-12-07 01:42:03 UTC  
**Purpose:** Support dual team member assignment lifecycle

**Changes:**
- Dropped `assigned_to` column
- Added `assigned_asc` (Author Success Coach) for leads
- Added `assigned_bss` (Book Support Specialist) for authors
- Created indexes

**Rollback:**
```sql
DROP INDEX IF EXISTS idx_contacts_assigned_asc;
DROP INDEX IF EXISTS idx_contacts_assigned_bss;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS assigned_asc;
ALTER TABLE public.contacts DROP COLUMN IF EXISTS assigned_bss;
```

---

### Migration #16: Rename BSS to AE
**File:** `20251207015040_6da0cd8f-d4fb-4a69-9d22-3cb41a9f076f.sql`  
**Date:** 2025-12-07 01:50:40 UTC  
**Purpose:** Correct terminology to Account Executive

**Changes:**
- Renamed `assigned_bss` to `assigned_ae`

**Rollback:** `ALTER TABLE public.contacts RENAME COLUMN assigned_ae TO assigned_bss;`

---

### Migration #17: Contact Activity FK to Profiles
**File:** `20251207021524_8b73cf3b-9acf-4549-92dd-c877700dd36e.sql`  
**Date:** 2025-12-07 02:15:24 UTC  
**Purpose:** Enable profile name lookups in activity feed

**Changes:**
- Added foreign key constraint from `contact_activity.created_by` to `profiles.id`

**Rollback:** `ALTER TABLE public.contact_activity DROP CONSTRAINT IF EXISTS contact_activity_created_by_fkey;`

---

## Naming Convention (Going Forward)

Future migrations should use descriptive names:
```
YYYYMMDDHHMMSS_descriptive_name.sql
```

Examples:
- `20251208120000_add_lead_source_tracking.sql`
- `20251209150000_create_deals_table.sql`
- `20251210090000_add_contact_company_fields.sql`

---

## Contributing

When creating new migrations:

1. **Document the purpose** in a comment block at the top
2. **Include rollback instructions** as comments
3. **Update this changelog** immediately after migration is applied
4. **Update SCHEMA.md** if table structure changes
5. **Update docs/erd.md** if relationships change
