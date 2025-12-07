# Entity Relationship Diagram

> Visual database schema for Author Services Platform
>
> **Last Updated:** 2025-12-07

---

## Complete ERD

```mermaid
erDiagram
    %% ==========================================
    %% AUTHENTICATION & ACCESS CONTROL
    %% ==========================================
    
    auth_users {
        uuid id PK
        text email
        jsonb raw_user_meta_data
        timestamptz created_at
    }
    
    profiles {
        uuid id PK,FK
        text email
        text full_name
        text avatar_url
        timestamptz created_at
        timestamptz updated_at
    }
    
    user_roles {
        uuid id PK
        uuid user_id FK
        app_role role
        timestamptz created_at
    }
    
    auth_users ||--|| profiles : "creates"
    auth_users ||--o{ user_roles : "has"
    
    %% ==========================================
    %% CRM - CONTACTS
    %% ==========================================
    
    contacts {
        uuid id PK
        text email UK
        text first_name
        text last_name
        text phone
        text address
        text timezone
        text contact_type
        text status
        uuid imprint_id FK
        text notes
        uuid assigned_asc FK
        uuid assigned_ae FK
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    contact_links {
        uuid id PK
        uuid contact_id FK
        text link_type
        text url
        text label
        timestamptz created_at
    }
    
    contact_activity {
        uuid id PK
        uuid contact_id FK
        text activity_type
        text description
        jsonb metadata
        uuid created_by FK
        timestamptz created_at
    }
    
    contacts ||--o{ contact_links : "has"
    contacts ||--o{ contact_activity : "logs"
    profiles ||--o{ contact_activity : "created by"
    auth_users ||--o{ contacts : "assigned_asc"
    auth_users ||--o{ contacts : "assigned_ae"
    
    %% ==========================================
    %% CRM - ORGANIZATION
    %% ==========================================
    
    lists {
        uuid id PK
        text name
        text description
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    contact_lists {
        uuid contact_id PK,FK
        uuid list_id PK,FK
        timestamptz added_at
    }
    
    tags {
        uuid id PK
        text name
        text color
        uuid created_by FK
        timestamptz created_at
    }
    
    contact_tags {
        uuid contact_id PK,FK
        uuid tag_id PK,FK
        timestamptz added_at
    }
    
    contacts ||--o{ contact_lists : "belongs to"
    lists ||--o{ contact_lists : "contains"
    contacts ||--o{ contact_tags : "has"
    tags ||--o{ contact_tags : "applied to"
    
    %% ==========================================
    %% MARKETING - BRANDS
    %% ==========================================
    
    imprints {
        uuid id PK
        text name
        text slug UK
        text from_name
        text from_email
        text reply_to_email
        text primary_color
        text secondary_color
        text accent_color
        text background_color
        text text_color
        text heading_font
        text body_font
        text logo_url
        text logo_dark_url
        text icon_url
        text header_image_url
        text footer_image_url
        text brand_voice
        text tagline
        text website_url
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    imprints ||--o{ contacts : "associated with"
    
    %% ==========================================
    %% MARKETING - EMAIL CAMPAIGNS
    %% ==========================================
    
    templates {
        uuid id PK
        text name
        text subject
        text html_content
        text preview_text
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    campaigns {
        uuid id PK
        text name
        text subject
        text from_name
        text from_email
        text reply_to_email
        uuid template_id FK
        text html_content
        jsonb blocks_json
        campaign_status status
        timestamptz scheduled_at
        timestamptz sent_at
        integer total_recipients
        uuid created_by FK
        timestamptz created_at
        timestamptz updated_at
    }
    
    campaign_lists {
        uuid campaign_id PK,FK
        uuid list_id PK,FK
    }
    
    templates ||--o{ campaigns : "based on"
    campaigns ||--o{ campaign_lists : "sends to"
    lists ||--o{ campaign_lists : "receives"
    
    %% ==========================================
    %% MARKETING - EMAIL DELIVERY
    %% ==========================================
    
    email_queue {
        uuid id PK
        uuid campaign_id FK
        uuid contact_id FK
        text email
        text subject
        text from_name
        text from_email
        text reply_to_email
        text html_content
        text contact_first_name
        text contact_last_name
        text status
        integer attempts
        text last_error
        timestamptz created_at
        timestamptz processed_at
    }
    
    email_events {
        uuid id PK
        uuid campaign_id FK
        uuid contact_id FK
        text email
        text event_type
        text link_url
        text ip_address
        text user_agent
        boolean is_bot
        timestamptz created_at
    }
    
    campaigns ||--o{ email_queue : "queues"
    contacts ||--o{ email_queue : "receives"
    campaigns ||--o{ email_events : "tracks"
    contacts ||--o{ email_events : "generates"
```

---

## Module Diagrams

### Authentication & Access Control

```mermaid
erDiagram
    auth_users ||--|| profiles : "1:1 creates on signup"
    auth_users ||--o{ user_roles : "1:N role assignments"
    
    auth_users {
        uuid id PK
        text email
    }
    
    profiles {
        uuid id PK,FK
        text email
        text full_name
    }
    
    user_roles {
        uuid id PK
        uuid user_id FK
        app_role role "admin or member"
    }
```

### CRM Contacts

```mermaid
erDiagram
    contacts ||--o{ contact_links : "has links"
    contacts ||--o{ contact_activity : "has activity"
    contacts ||--o{ contact_lists : "in lists"
    contacts ||--o{ contact_tags : "has tags"
    contacts }o--|| imprints : "belongs to"
    
    contacts {
        uuid id PK
        text email
        text first_name
        text last_name
        text contact_type "lead, author, bad"
        text status "active, unsubscribed, etc"
    }
    
    contact_links {
        uuid id PK
        uuid contact_id FK
        text link_type "amazon, facebook, etc"
        text url
    }
    
    contact_activity {
        uuid id PK
        uuid contact_id FK
        text activity_type
        jsonb metadata
    }
```

### Email Campaign Flow

```mermaid
erDiagram
    imprints ||--o{ campaigns : "branding"
    templates ||--o{ campaigns : "based on"
    campaigns ||--o{ campaign_lists : "targets"
    lists ||--o{ campaign_lists : "contains"
    campaigns ||--o{ email_queue : "creates jobs"
    email_queue }o--|| contacts : "recipient"
    campaigns ||--o{ email_events : "tracks"
    
    campaigns {
        uuid id PK
        text name
        campaign_status status
        jsonb blocks_json
    }
    
    email_queue {
        uuid id PK
        text status "pending, sent, failed"
    }
    
    email_events {
        uuid id PK
        text event_type "opened, clicked, etc"
    }
```

---

## Data Flow Diagrams

### Campaign Send Flow

```mermaid
flowchart LR
    A[Campaign Created] --> B[Select Lists]
    B --> C[Queue Emails]
    C --> D[VPS Worker Picks Up]
    D --> E[Send via Resend]
    E --> F[Track Events]
    F --> G[email_events table]
```

### Contact Activity Flow

```mermaid
flowchart TD
    A[Contact Created] --> B[Log: contact_created]
    C[Contact Updated] --> D[Log: contact_updated]
    E[Link Added] --> F[Log: link_added]
    G[Campaign Sent] --> H[email_events: sent]
    H --> I[email_events: opened]
    I --> J[email_events: clicked]
    
    B --> K[contact_activity table]
    D --> K
    F --> K
    H --> L[email_events table]
    I --> L
    J --> L
```

---

## Notes

- **PK** = Primary Key
- **FK** = Foreign Key
- **UK** = Unique Key
- All UUIDs use `gen_random_uuid()` for generation
- All timestamps are `TIMESTAMPTZ` (timezone-aware)
- RLS is enabled on all tables
- `auth.users` is managed by Supabase Auth (not directly modifiable)
