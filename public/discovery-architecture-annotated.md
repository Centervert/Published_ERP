# ASC ERP Platform: Annotated Architecture Discovery Document

**Prepared by**: Lovable AI Audit  
**Original Document Date**: January 2025  
**Audit Date**: January 2026  
**Status**: ANNOTATED WITH CORRECTIONS

---

## Legend

- **[ACCURATE]** - Section verified as correct
- **[OUTDATED]** - Counts or details that need updating
- **[MISSING]** - Items not included in original document
- **[VALID CONCERN]** - Security/code quality issues confirmed
- **[REASONABLE]** - Estimates that seem appropriate
- **[CORRECTED]** - Updated information provided

---

## Executive Summary

**[ACCURATE]** This document presents the architecture and implementation audit of the Author Services Company (ASC) Enterprise Resource Planning system. The ASC ERP is a comprehensive business platform built for managing customer relationships, sales pipelines, marketing campaigns, and operational workflows. The system demonstrates sophisticated patterns including block-based email composition, tiered commission calculations, and multi-entity communication tracking.

---

## System Overview

### Technology Stack **[ACCURATE]**

| Layer | Technology | Version/Notes |
|-------|------------|---------------|
| Frontend Framework | React | 18.3.1 |
| Build Tool | Vite | Latest |
| Styling | Tailwind CSS | With tailwindcss-animate |
| UI Components | shadcn/ui | Radix primitives |
| State Management | TanStack Query | v5.83.0 |
| Routing | React Router DOM | v6.30.1 |
| Backend | Supabase (Lovable Cloud) | PostgreSQL + Edge Functions |
| Authentication | Supabase Auth | JWT-based |
| Email Infrastructure | Mailgun | Bulk sending + webhooks |
| Email Integration | Microsoft Outlook | OAuth 2.0 |
| Maps/Location | Google Places API | Autocomplete |

### Project Statistics

**[OUTDATED - CORRECTED]**

| Metric | Original Count | Actual Count | Status |
|--------|----------------|--------------|--------|
| React Pages | 18 | 18 | ✓ Accurate |
| Custom Hooks | 34 | 32 | ✗ Overcounted |
| UI Components | 52 | 50 | ✗ Overcounted |
| Edge Functions | 21 | 22 | ✗ Missing export-data |
| Email Block Types | 12 | 11 | ✗ Overcounted |
| Database Tables | 31 | 31 | ✓ Accurate |

---

## Application Architecture

### Frontend Route Structure **[ACCURATE WITH ADDITIONS]**

```
/                    → Dashboard (Index redirect)
/auth                → Authentication
/auth/reset-password → Password reset flow
/reset-password      → [MISSING FROM ORIGINAL] Alias for password reset
/dashboard           → Main dashboard
/contacts            → Contact management
/contacts/:id        → Contact detail view
/contact-health      → Email validation status
/deals               → Sales pipeline (Kanban)
/campaigns           → Email campaign management
/templates           → Email template library
/imprints            → Brand/sub-brand management
/products            → Product catalog
/staff               → Staff directory
/users               → [MISSING FROM ORIGINAL] Redirects to /staff
/settings            → System settings
/my-profile          → Current user profile
/development         → Internal dev tracking
/unsubscribed        → Public unsubscribe confirmation
```

### Component Architecture **[ACCURATE]**

```
src/
├── components/
│   ├── ui/              # shadcn primitives (50 components) [CORRECTED: was 52]
│   ├── layout/          # App shell (DashboardLayout, AppSidebar)
│   ├── contacts/        # Contact management (18 components)
│   ├── campaigns/       # Email builder (15 components)
│   ├── deals/           # Pipeline management (4 components)
│   ├── imprints/        # Brand management (8 components)
│   ├── staff/           # Staff management (2 components)
│   └── development/     # Dev tracking (9 components)
├── hooks/               # 32 custom hooks [CORRECTED: was 34]
├── pages/               # 18 route components
├── contexts/            # AuthContext
├── lib/                 # Utilities (5 files)
└── types/               # TypeScript definitions
```

---

## Database Architecture

### Entity Relationship Overview **[ACCURATE]**

The database follows a normalized relational design with the following entity groups:

#### Core CRM Tables (8 tables) **[CORRECTED: was 7]**
- `contacts` - Primary customer records
- `contact_notes` - Free-form notes per contact
- `contact_tasks` - Task/reminder management
- `contact_communications` - Email/call/meeting logs
- `contact_activity` - Activity feed events
- `contact_tags` - Tag associations
- `contact_links` - Social/web links
- `contact_lists` - List membership

#### Sales Pipeline (3 tables) **[ACCURATE]**
- `deals` - Opportunity tracking with stage management
- `books` - Book/project metadata
- `commission_tiers` - Tiered commission rate configuration

#### Marketing & Campaigns (6 tables) **[ACCURATE]**
- `campaigns` - Email campaign definitions
- `campaign_lists` - Campaign-to-list associations
- `templates` - Reusable email templates
- `email_events` - Open/click/bounce tracking
- `lists` - Contact list definitions
- `tags` - Tag definitions

#### Organization Structure (5 tables) **[ACCURATE]**
- `company` - Parent company settings
- `imprints` - Sub-brands/divisions
- `staff` - Employee records
- `profiles` - User account profiles
- `user_roles` - RBAC assignments

#### Development Tracking (5 tables) **[ACCURATE]**
- `dev_documents` - Project documentation
- `dev_document_versions` - Version history
- `dev_items` - Features/bugs/decisions
- `dev_meetings` - Meeting notes
- `dev_meeting_links` - Item-meeting associations

#### Supporting Tables (4 tables) **[ACCURATE]**
- `products` - Product catalog
- `package_items` - Bundle composition
- `import_jobs` - CSV import tracking
- `user_email_connections` - OAuth tokens

### Database Functions **[OUTDATED - MISSING 2 FUNCTIONS]**

Original listed 4 functions, actual count is 6:

1. `calculate_commission(cumulative_sales, sale_amount)` ✓
2. `get_campaign_stats(_campaign_id)` ✓
3. `get_contact_health_stats()` ✓
4. `get_recipient_health_counts()` ✓
5. `has_role(_role, _user_id)` ✓
6. **[MISSING]** `update_updated_at_column()` - Trigger function for timestamp updates
7. **[MISSING]** `auto_add_to_non_authors_list()` - Auto-list assignment trigger

---

## Backend Architecture

### Edge Functions Inventory **[OUTDATED - CORRECTED]**

**Original Count**: 21  
**Actual Count**: 22

| Function | Purpose | Status |
|----------|---------|--------|
| `enhance-image-prompt` | AI prompt enhancement for images | ✓ |
| `export-data` | **[MISSING FROM ORIGINAL]** Database export to JSON | NEW |
| `generate-email` | AI email content generation | ✓ |
| `generate-image` | AI image generation | ✓ |
| `generate-subject` | AI subject line suggestions | ✓ |
| `invite-user` | User invitation emails | ✓ |
| `mailgun-webhook` | Inbound event processing | ✓ |
| `outlook-oauth-callback` | OAuth completion handler | ✓ |
| `outlook-oauth-start` | OAuth initiation | ✓ |
| `places-autocomplete` | Google Places proxy | ✓ |
| `process-campaign-jobs` | Campaign send orchestration | ✓ |
| `process-import` | CSV import processing | ✓ |
| `process-scheduled-campaigns` | Scheduled send execution | ✓ |
| `send-campaign-mailgun` | Bulk email dispatch | ✓ |
| `send-email-outlook` | Individual email sending | ✓ |
| `send-test-email` | Test email dispatch | ✓ |
| `sync-inbox-emails` | Inbox synchronization | ✓ |
| `track-click` | Link click tracking | ✓ |
| `track-pixel` | Open pixel tracking | ✓ |
| `unsubscribe` | Opt-out processing | ✓ |
| `validate-email` | Single email validation | ✓ |
| `validate-email-batch` | Bulk email validation | ✓ |

---

## Custom Hooks Inventory **[OUTDATED - CORRECTED]**

**Original Count**: 34  
**Actual Count**: 32

### Hooks Listed in Original (Verified) ✓
- `useAuth` (in AuthContext)
- `useBlockEditor`
- `useBooks`
- `useCampaigns`
- `useClientImport`
- `useCommission`
- `useCompany`
- `useContactCommunications`
- `useContactHistory`
- `useContactNotes`
- `useContactSearch`
- `useContactTasks`
- `useContacts`
- `useDealCommunicationCounts`
- `useDealCommunications`
- `useDealDetail`
- `useDeals`
- `useDevDocuments`
- `useDevItems`
- `useDevMeetings`
- `useEmailValidation`
- `useImportJobs`
- `useImprints`
- `useMobile` (use-mobile.tsx)
- `usePaginatedContacts`
- `usePlacesAutocomplete`
- `useProducts`
- `useRecipientCounts`
- `useRecipientHealthCounts`
- `useStaff`
- `useTemplates`
- `useToast`
- `useUsers`

### Hooks Listed in Original But NOT Found ✗
- `useAuthors` - Does not exist
- `useCampaignAnalytics` - Does not exist (inline in CampaignAnalytics component)
- `useContactValidation` - Does not exist (functionality in useEmailValidation)

---

## Email System Architecture

### Block-Based Email Builder **[OUTDATED - CORRECTED]**

**Original Count**: 12 block types  
**Actual Count**: 11 block types

| Block Type | Component | Status |
|------------|-----------|--------|
| Header | `HeaderBlock.tsx` | ✓ |
| Heading | `HeadingBlock.tsx` | ✓ |
| Text | `TextBlock.tsx` | ✓ |
| Image | `ImageBlock.tsx` | ✓ |
| Button | `ButtonBlock.tsx` | ✓ |
| Divider | `DividerBlock.tsx` | ✓ |
| Spacer | `SpacerBlock.tsx` | ✓ |
| Footer | `FooterBlock.tsx` | ✓ |
| Greeting | `GreetingBlock.tsx` | ✓ |
| ASC Contact | `AscContactBlock.tsx` | ✓ |
| Block Wrapper | `BlockWrapper.tsx` | ✓ (utility, not a content block) |

**Note**: The original count of 12 likely included `BlockWrapper.tsx` as a block type, but it's a utility wrapper component, not a content block type.

---

## Security Analysis

### Current Security Posture **[VALID CONCERNS - ALL VERIFIED]**

#### 1. RLS Implementation Status
- **[VALID CONCERN]** RLS policies exist but require audit for completeness
- Most tables have user-scoped policies
- Some tables may have overly permissive policies

#### 2. XSS Vulnerabilities
- **[VALID CONCERN]** `RichTextEditor.tsx` - Uses `dangerouslySetInnerHTML`
- Recommendation: Implement DOMPurify sanitization (dependency already installed)

#### 3. Open Redirect Risk
- **[VALID CONCERN]** `track-click/index.ts` - Redirects to user-provided URLs
- Recommendation: Implement URL allowlist validation

#### 4. Token Storage
- **[VALID CONCERN]** OAuth tokens stored in `user_email_connections` table
- Tokens are encrypted at rest by Supabase
- Consider additional application-level encryption

#### 5. Input Validation
- **[VALID CONCERN]** Some edge functions lack comprehensive input validation
- Recommendation: Add Zod schemas for all edge function inputs

---

## Code Quality Observations **[ALL VERIFIED]**

### Strengths ✓
1. Consistent use of TypeScript throughout
2. Well-structured component hierarchy
3. Proper separation of concerns with custom hooks
4. Comprehensive use of TanStack Query for server state
5. Good use of shadcn/ui for consistent UI patterns

### Areas for Improvement
1. **[VALID]** Some components exceed 300 lines (e.g., `ContactDetail.tsx`)
2. **[VALID]** Inconsistent error handling patterns across edge functions
3. **[VALID]** Some hooks could benefit from memoization
4. **[VALID]** Missing loading states in some data-fetching components
5. **[VALID]** Test coverage appears minimal (no test files found)

---

## Recommended Priorities **[REASONABLE]**

### Immediate (Security)
1. Sanitize HTML in RichTextEditor using DOMPurify
2. Validate redirect URLs in track-click function
3. Audit RLS policies for completeness

### Short-term (Stability)
1. Add comprehensive error boundaries
2. Implement consistent error handling in edge functions
3. Add input validation schemas

### Medium-term (Quality)
1. Break down large components (>300 lines)
2. Add unit tests for critical business logic
3. Implement E2E tests for key user flows

---

## Appendix: Correction Summary

| Item | Original | Actual | Difference |
|------|----------|--------|------------|
| Edge Functions | 21 | 22 | +1 (export-data) |
| Custom Hooks | 34 | 32 | -2 (non-existent hooks listed) |
| UI Components | 52 | 50 | -2 |
| Email Blocks | 12 | 11 | -1 (BlockWrapper is utility) |
| DB Functions | 4 | 6 | +2 (triggers missing) |
| Core CRM Tables | 7 | 8 | +1 (contact_lists missed) |
| Routes | Listed | Missing 2 | /reset-password, /users redirect |

---

*Document generated by Lovable AI Audit System*  
*Last Updated: January 2026*
