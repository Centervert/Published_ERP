
# Publish with a Partner - Landing Page Implementation Plan

## Overview

This plan covers the creation of a public-facing giveaway landing page with a multi-step questionnaire, document upload, traffic source tracking, and analytics. The page will be accessible at `/Publish_with_Partner_Giveaway` and will integrate with the existing Author Services branding.

---

## Database Schema

### New Tables

**1. `giveaway_entries`** - Stores all questionnaire submissions

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| created_at | timestamp | Entry timestamp |
| name | text | Full name |
| email | text | Email address |
| phone | text | Phone (normalized) |
| city | text | City |
| state | text | State (2-letter code) |
| referrer_name | text | Who referred them (optional) |
| referrer_email | text | Referrer's email (optional) |
| genres | text[] | Array of selected genres |
| marketing_services_used | text[] | Array of marketing services |
| primary_marketing_reason | text | Short answer |
| has_published_before | boolean | Yes/No |
| writing_stage | text | How close to finishing |
| marketing_confidence | text | Confidence level |
| manuscript_file_path | text | Storage path to uploaded file |
| manuscript_file_name | text | Original file name |
| traffic_source | text | instagram, facebook, email, website, blog, podcast |
| utm_source | text | Raw UTM source param |
| utm_medium | text | Raw UTM medium param |
| utm_campaign | text | Raw UTM campaign param |
| referral_code | text | Unique code for referral tracking |
| entry_count | integer | Default 1, +1 per referral (max 6) |
| ip_address | text | For duplicate detection |
| user_agent | text | Browser info |

**2. `giveaway_page_views`** - Tracks page visits for analytics

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| created_at | timestamp | View timestamp |
| traffic_source | text | Detected or passed source |
| utm_source | text | Raw UTM param |
| utm_medium | text | Raw UTM param |
| utm_campaign | text | Raw UTM param |
| ip_address | text | Visitor IP |
| user_agent | text | Browser info |
| session_id | text | UUID generated per session |
| questionnaire_started | boolean | Did they start? |
| questionnaire_completed | boolean | Did they finish? |
| questionnaire_progress | integer | 0-100% |
| time_on_page_seconds | integer | Tracked via JS |

**3. `giveaway_analytics`** - Aggregated metrics (populated by DB function)

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| date | date | Aggregation date |
| traffic_source | text | Source channel |
| page_views | integer | Total views |
| cta_clicks | integer | "Enter to Win" clicks |
| questionnaire_starts | integer | Started questionnaire |
| questionnaire_completions | integer | Completed + submitted |
| conversion_rate | numeric | completions / views * 100 |
| avg_time_on_page | integer | Average seconds |

**Storage Bucket:** `giveaway-manuscripts` (private bucket for uploaded documents)

---

## Frontend Components

### File Structure

```text
src/
  pages/
    PublishWithPartnerGiveaway.tsx          # Main landing page
    GiveawaySuccess.tsx                      # Thank you/confirmation page
  components/
    giveaway/
      GiveawayHero.tsx                       # Hero banner with CTA
      GiveawayQuestionnaire.tsx              # Multi-step questionnaire
      QuestionnaireStep.tsx                  # Individual step component
      GiveawayEligibility.tsx                # Eligibility rules section
      GiveawayHowToEnter.tsx                 # How to enter section
      GiveawayFileUpload.tsx                 # PDF/DOCX/RTF upload
      GiveawayProgress.tsx                   # Progress indicator
  hooks/
    useGiveawaySubmission.ts                 # Handle form submission + file upload
    useGiveawayAnalytics.ts                  # Track page views and events
  lib/
    constants.ts                             # US states list, genre options, etc.
```

### Page Flow

```text
1. Landing Page (/Publish_with_Partner_Giveaway)
   - Hero section with H1, H2, "Enter to Win" button
   - How to Enter section
   - Eligibility section
   - When "Enter to Win" clicked -> shows questionnaire modal/panel

2. Questionnaire (same page, modal or scroll-to section)
   - Step 1: Demographics (Name, Email, Phone, City/State)
   - Step 2: Referral info (optional)
   - Step 3: Genre selection (multi-select)
   - Step 4: Marketing services used (multi-select)
   - Step 5: Marketing reason (short answer)
   - Step 6: Published before? (Yes/No)
   - Step 7: Writing stage (single select)
   - Step 8: Marketing confidence (single select)
   - Step 9: File upload (PDF/DOCX/RTF)
   - Submit

3. Success Page (/giveaway-success)
   - Congratulations message
   - Social media links
   - Referral code display
   - CTA to browse website
```

### Analytics Tracking

The page will capture and track:

1. **On Page Load:**
   - Parse `?source=instagram|facebook|email|blog|podcast` or UTM params
   - Generate session ID (stored in sessionStorage)
   - Log page view to `giveaway_page_views`
   - Start time-on-page timer

2. **On CTA Click:**
   - Update page view record with `questionnaire_started = true`

3. **On Step Progression:**
   - Update `questionnaire_progress` percentage

4. **On Submit:**
   - Update page view with `questionnaire_completed = true`
   - Calculate and store `time_on_page_seconds`
   - Insert entry to `giveaway_entries`

5. **On Page Unload:**
   - Beacon final time-on-page if not submitted

---

## Backend (Edge Function)

**`submit-giveaway-entry`** - Handles form submission

- Validates all required fields with Zod
- Uploads manuscript to `giveaway-manuscripts` bucket
- Generates unique referral code
- Inserts entry to `giveaway_entries`
- Updates `giveaway_page_views` with completion
- Returns success response with referral code

---

## Traffic Source Links

For each channel, use query parameters:

| Channel | URL |
|---------|-----|
| Instagram | `/Publish_with_Partner_Giveaway?source=instagram` |
| Facebook | `/Publish_with_Partner_Giveaway?source=facebook` |
| Email | `/Publish_with_Partner_Giveaway?source=email` |
| Blog | `/Publish_with_Partner_Giveaway?source=blog` |
| Podcast | `/Publish_with_Partner_Giveaway?source=podcast` |
| Website | `/Publish_with_Partner_Giveaway?source=website` |

Alternative UTM format also supported:
`?utm_source=instagram&utm_medium=social&utm_campaign=giveaway2024`

---

## Questionnaire Field Configuration

### Demographics (Step 1)
- Name: text input (required)
- Email: email input (required, validated)
- Phone: tel input with formatting (required)
- City: text input (optional)
- State: dropdown with 50 US states (required)

### Referral (Step 2)
- Referrer Name: text input (optional)
- Referrer Email: email input (optional)

### Genre (Step 3) - Multi-select checkboxes
- Children's Stories
- Memoir
- Biography/Autobiography
- How-To/Educational
- Self-Help
- Travel
- Fantasy
- Romance
- True-Crime
- Other (with text input)

### Marketing Services Used (Step 4) - Multi-select
- Social Media (Instagram, Facebook, X, Pinterest, TikTok)
- Direct Emails
- Publicity Services/Personal Publicist
- Website Services
- Paid Advertisements
- Podcast
- Promotional items (bookmarks, themed merchandise)

### Marketing Reason (Step 5) - Textarea
- "What is your primary reason for marketing your book?"

### Published Before (Step 6) - Radio buttons
- Yes
- No

### Writing Stage (Step 7) - Radio buttons
- I have completed my final draft
- I have completed a rough draft
- I have a few chapters
- I have an outline

### Marketing Confidence (Step 8) - Radio buttons
- Completely confident
- Fairly confident
- Somewhat confident
- Slightly confident
- Not confident

### File Upload (Step 9)
- Accepted: .pdf, .docx, .rtf
- Max size: 25MB
- Required field
- Shows upload progress

---

## Design Specifications

### Hero Section
- Full-width background image (top 30% of viewport)
- Dark overlay for text readability
- Uses company branding colors (primary: #171927, accent: #FFA76C)
- Fonts: Playfair Display (headings), DM Sans (body)

### H1 (Title)
"Publish with a Partner: The Comprehensive Publishing Experience Giveaway"

### H2 (Sub-header)
"Claim your chance to publish for free* including a comprehensive eBook package, personalized website, and curated coaching sessions on a topic of your choice."

### CTA Button
- Text: "Enter to Win"
- Style: Solid accent color (#FFA76C), dark text
- Hover: Slight scale and brightness increase

---

## Meta Tags (for index.html or dynamic)

```html
<!-- For /Publish_with_Partner_Giveaway route -->
<title>Publish with a Partner | Publishing Package Giveaway</title>
<meta name="description" content="New to publishing? Partner with our experts: enter to win a chance to turn your idea into a real eBook + author website, with free guidance sessions." />
<meta property="og:title" content="Publish with a Partner | Publishing Package Giveaway" />
<meta property="og:description" content="Enter to win a free comprehensive eBook package, personalized website, and curated coaching sessions." />
```

---

## Implementation Sequence

1. **Database Migration**
   - Create `giveaway_entries`, `giveaway_page_views`, `giveaway_analytics` tables
   - Create `giveaway-manuscripts` storage bucket
   - Set up RLS policies (public insert, authenticated read for admins)

2. **Constants & Utilities**
   - Add US states list to `src/lib/constants.ts`
   - Add genre and marketing options constants

3. **Edge Function**
   - Create `submit-giveaway-entry` function
   - Handle file upload, validation, and entry creation

4. **Frontend Components**
   - Build questionnaire components
   - Build landing page layout
   - Build success page

5. **Analytics Hook**
   - Track page views, progress, time on page
   - Use `navigator.sendBeacon` for reliable unload tracking

6. **Routing**
   - Add routes to App.tsx (public, no auth required)

7. **Admin Dashboard (Optional future)**
   - View entries, export data, see analytics

---

## Technical Considerations

### Security
- RLS policies allow public INSERT but require admin role for SELECT/UPDATE/DELETE
- File uploads validated server-side for type and size
- Rate limiting on submissions (same IP cannot submit more than once per month)
- Email validation to prevent spam

### Duplicate Prevention
- Check for existing entry with same email in current month
- Use IP + user agent fingerprinting as secondary check

### File Handling
- Files uploaded directly to storage, path saved in DB
- 25MB limit enforced client and server side
- Accepted types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/rtf

### Mobile Responsiveness
- Questionnaire uses single-column layout on mobile
- Progress bar visible at all times
- Touch-friendly checkbox and radio inputs

