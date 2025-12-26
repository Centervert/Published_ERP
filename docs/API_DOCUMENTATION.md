# Author Services Platform - API Documentation
## Edge Functions Reference

---

## Table of Contents
1. [Authentication](#authentication)
2. [AI & Content Generation](#ai--content-generation)
3. [Email Sending](#email-sending)
4. [Campaign Management](#campaign-management)
5. [Email Tracking](#email-tracking)
6. [Outlook Integration](#outlook-integration)
7. [Utilities](#utilities)

---

## Authentication

### Authentication Methods

The API supports two authentication methods:

#### 1. JWT Bearer Token (User Authentication)
Used for user-facing endpoints. Pass the Supabase session token in the Authorization header.

```
Authorization: Bearer <supabase_jwt_token>
```

#### 2. Worker API Key (Service Authentication)
Used for VPS worker and scheduled jobs. Pass the worker key in a custom header.

```
x-worker-key: <WORKER_API_KEY>
```

---

## AI & Content Generation

### Generate Email Content

Generates AI-powered email content as structured JSON blocks.

**Endpoint:** `POST /functions/v1/generate-email`

**Authentication:** JWT Bearer Token

**Request Body:**
```json
{
  "imprint": {
    "name": "string (required)",
    "tagline": "string (optional)",
    "brand_voice": "string (optional)",
    "primary_color": "string (optional, default: #2563eb)",
    "secondary_color": "string (optional)",
    "accent_color": "string (optional)",
    "background_color": "string (optional, default: #ffffff)",
    "text_color": "string (optional, default: #1f2937)",
    "heading_font": "string (optional, default: Arial)",
    "body_font": "string (optional, default: Arial)",
    "logo_url": "string (optional)",
    "header_image_url": "string (optional)",
    "footer_image_url": "string (optional)",
    "website_url": "string (optional)"
  },
  "emailType": "string (required) - e.g., 'newsletter', 'announcement', 'welcome'",
  "description": "string (required) - Brief description of the email",
  "keyPoints": "string (required) - Main points to cover",
  "callToAction": "string (required) - Desired action",
  "tone": "string (required) - e.g., 'professional', 'friendly', 'urgent'",
  "conversationHistory": "array (optional) - Previous messages for follow-up",
  "followUpMessage": "string (optional) - Follow-up prompt for modifications",
  "outputFormat": "string (optional, default: 'blocks') - 'blocks' or 'html'"
}
```

**Response:** Server-Sent Events (SSE) stream with JSON blocks

**Success Response (streamed):**
```json
{
  "blocks": [
    { "type": "header", "logoUrl": "string", "backgroundColor": "#ffffff" },
    { "type": "heading", "content": "string", "level": 1, "color": "#2563eb" },
    { "type": "text", "content": "string", "fontSize": 16, "color": "#333333" },
    { "type": "button", "text": "string", "url": "string", "backgroundColor": "#2563eb" },
    { "type": "footer", "content": "string", "showUnsubscribe": true }
  ]
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 402 | AI usage limit reached |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

### Generate Image

Generates AI images for email content and uploads to storage.

**Endpoint:** `POST /functions/v1/generate-image`

**Authentication:** JWT Bearer Token

**Request Body:**
```json
{
  "prompt": "string (required) - Image description",
  "campaignId": "string (optional) - For organizing in storage"
}
```

**Success Response:**
```json
{
  "imageUrl": "string - Public URL to the generated image",
  "description": "string - AI-generated description"
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 402 | AI usage limit reached |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Email Sending

### Send Email via Outlook

Sends a personal email through the user's connected Outlook account.

**Endpoint:** `POST /functions/v1/send-email-outlook`

**Authentication:** JWT Bearer Token (requires connected Outlook account)

**Request Body:**
```json
{
  "to": "string (required) - Recipient email address",
  "subject": "string (required) - Email subject line",
  "body": "string (required) - HTML email body",
  "contact_id": "string (required) - UUID of the contact"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Email sent successfully",
  "communication_id": "uuid - ID of the logged communication"
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 400 | Missing required fields or no Outlook connection |
| 401 | Unauthorized |
| 500 | Failed to send email |

**Notes:**
- Automatically refreshes OAuth tokens if expired
- Logs the email to `contact_communications` table
- Saves email to sender's Sent Items folder

---

## Campaign Management

### Send Campaign via Mailgun

Sends a marketing campaign directly via Mailgun batch sending.

**Endpoint:** `POST /functions/v1/send-campaign-mailgun`

**Authentication:** JWT Bearer Token OR Worker API Key (`x-worker-key` header)

**Request Body:**
```json
{
  "campaignId": "string (required) - UUID of the campaign",
  "listIds": "array (required) - Array of list UUIDs",
  "imprintIds": "array (optional) - Array of imprint UUIDs for additional contacts",
  "additionalRecipients": "array (optional) - Array of additional email addresses"
}
```

**Success Response:**
```json
{
  "success": true,
  "sent": 150
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 401 | Unauthorized - invalid or missing authentication |
| 500 | Campaign not found, already sent, no contacts, or Mailgun error |

**Process:**
1. Validates campaign is in "draft", "sending", or "scheduled" status
2. Updates campaign status to "sending"
3. Fetches contacts from selected lists and imprints (union)
4. Filters out bounced, complained, and unsubscribed contacts
5. Renders blocks to HTML with imprint styling
6. Builds recipient variables for personalization (name, greeting, ASC info)
7. Sends emails in batches to Mailgun (max 1000 per request)
8. Logs "sent" events to `email_events` table
9. Updates campaign status to "sent" or "scheduled"

**Personalization Variables:**
- `%recipient.first_name%` - Contact's first name
- `%recipient.last_name%` - Contact's last name
- `%recipient.email%` - Contact's email
- `%recipient.greeting%` - Time-based greeting (Good morning/afternoon/evening)
- `%recipient.sender_name%` - Dynamic sender name (ASC name or imprint name)
- `%recipient.asc_name%` - Author Success Coach name
- `%recipient.asc_email%` - Author Success Coach email
- `%recipient.asc_phone%` - Author Success Coach phone
- `%recipient.unsubscribe_url%` - Personalized unsubscribe link

---

### Process Scheduled Campaigns

Cron job endpoint to process scheduled campaigns that are due.

**Endpoint:** `POST /functions/v1/process-scheduled-campaigns`

**Authentication:** Worker API Key (`x-worker-key` header)

**Request Body:** None required

**Success Response:**
```json
{
  "processed": 2,
  "campaigns": [
    { "id": "uuid", "name": "Campaign Name", "status": "sent" }
  ]
}
```

---

## Email Tracking

### Track Email Open (Pixel)

Records an email open event when the tracking pixel is loaded.

**Endpoint:** `GET /functions/v1/track-pixel`

**Authentication:** None (public endpoint)

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `c` | Yes | Campaign ID |
| `t` | Yes | Contact ID |
| `e` | Yes | Recipient email (URL encoded) |

**Response:** 1x1 transparent GIF image

**Tracking Data Captured:**
- Event type: "opened"
- IP address
- User agent
- Bot detection (filters known bots, prefetch requests)

**Example URL:**
```
/functions/v1/track-pixel?c=abc123&t=def456&e=user%40example.com
```

---

### Track Email Click

Records a link click and redirects to the original URL.

**Endpoint:** `GET /functions/v1/track-click`

**Authentication:** None (public endpoint)

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `c` | Yes | Campaign ID |
| `t` | Yes | Contact ID |
| `e` | Yes | Recipient email (URL encoded) |
| `u` | Yes | Target URL (URL encoded) |

**Response:** 302 Redirect to target URL

**Tracking Data Captured:**
- Event type: "clicked"
- Link URL
- IP address
- User agent

**Example URL:**
```
/functions/v1/track-click?c=abc123&t=def456&e=user%40example.com&u=https%3A%2F%2Fexample.com
```

---

### Process Unsubscribe

Handles unsubscribe requests from email recipients.

**Endpoint:** `GET /functions/v1/unsubscribe`

**Authentication:** None (public endpoint)

**Query Parameters:**
| Parameter | Required | Description |
|-----------|----------|-------------|
| `c` | No | Campaign ID |
| `t` | Yes | Contact ID |
| `e` | Yes | Recipient email (URL encoded) |

**Response:** HTML confirmation page

**Actions Performed:**
1. Logs "unsubscribed" event to `email_events`
2. Updates contact status to "unsubscribed"

**Example URL:**
```
/functions/v1/unsubscribe?c=abc123&t=def456&e=user%40example.com
```

---

## Outlook Integration

### Start OAuth Flow

Initiates the Microsoft OAuth flow for connecting an Outlook account.

**Endpoint:** `POST /functions/v1/outlook-oauth-start`

**Authentication:** JWT Bearer Token

**Request Body:**
```json
{
  "returnUrl": "string (optional, default: '/profile') - URL to redirect after OAuth"
}
```

**Success Response:**
```json
{
  "authUrl": "string - Microsoft OAuth URL to redirect the user"
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 401 | Unauthorized |
| 500 | Azure credentials not configured |

**OAuth Scopes Requested:**
- `openid`
- `offline_access`
- `Mail.Read`
- `Mail.Send`
- `Mail.ReadWrite`
- `User.Read`

---

### OAuth Callback

Handles the OAuth callback from Microsoft after user authorization.

**Endpoint:** `GET /functions/v1/outlook-oauth-callback`

**Authentication:** None (callback from Microsoft)

**Query Parameters:**
| Parameter | Description |
|-----------|-------------|
| `code` | Authorization code from Microsoft |
| `state` | Encoded state containing userId and returnUrl |
| `error` | Error code if authorization failed |
| `error_description` | Error details |

**Response:** 302 Redirect to app

**Success Redirect:**
```
{APP_URL}{returnUrl}?oauth_success=true
```

**Error Redirect:**
```
{APP_URL}/profile?oauth_error={error_description}
```

**Process:**
1. Exchanges authorization code for tokens
2. Fetches user email from Microsoft Graph
3. Stores tokens in `user_email_connections` table
4. Redirects user back to app

---

### Sync Inbox Emails

Syncs incoming emails from connected Outlook accounts to contact communications.

**Endpoint:** `POST /functions/v1/sync-inbox-emails`

**Authentication:** JWT Bearer Token

**Request Body:**
```json
{
  "user_id": "string (optional) - Specific user to sync, or all if omitted"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Inbox sync complete",
  "synced": 5,
  "connections_processed": 1
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 500 | Sync failed |

**Process:**
1. Fetches all (or specific) email connections
2. Refreshes tokens if expired
3. Fetches inbox messages from Microsoft Graph
4. Matches sender email to known contacts
5. Inserts new emails as inbound communications
6. Updates `last_inbox_sync_at` timestamp

---

## Utilities

### Places Autocomplete

Proxies Google Places API for address autocomplete and timezone lookup.

**Endpoint:** `POST /functions/v1/places-autocomplete`

**Authentication:** JWT Bearer Token

#### Action: Autocomplete (default)

**Request Body:**
```json
{
  "action": "autocomplete",
  "input": "string (required) - Address search query",
  "sessionToken": "string (optional) - Google session token"
}
```

**Success Response:**
```json
{
  "predictions": [
    {
      "placeId": "string",
      "description": "123 Main St, City, State, USA",
      "mainText": "123 Main St",
      "secondaryText": "City, State, USA"
    }
  ]
}
```

#### Action: Get Timezone

**Request Body:**
```json
{
  "action": "getTimezone",
  "placeId": "string (required) - Google Place ID",
  "sessionToken": "string (optional) - Google session token"
}
```

**Success Response:**
```json
{
  "timezone": "America/New_York",
  "timezoneName": "Eastern Standard Time",
  "rawOffset": -18000,
  "dstOffset": 3600
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 500 | Google API error or missing API key |

---

## Error Response Format

All endpoints return errors in a consistent format:

```json
{
  "error": "Error message description"
}
```

For validation errors, the response may include additional details:

```json
{
  "error": "Missing required fields: to, subject, body, contact_id"
}
```

---

## Rate Limiting

The following endpoints have rate limiting:

| Endpoint | Limit | Error Code |
|----------|-------|------------|
| `generate-email` | Lovable AI limits | 429 |
| `generate-image` | Lovable AI limits | 429 |

When rate limited, wait and retry after a short delay.

---

## CORS Headers

All endpoints support CORS with the following headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

Worker endpoints additionally allow:

```
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type, x-worker-key
```

---

## Environment Variables / Secrets Required

| Secret | Used By | Description |
|--------|---------|-------------|
| `SUPABASE_URL` | All | Supabase project URL |
| `SUPABASE_ANON_KEY` | User auth | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | All | Supabase service role key |
| `LOVABLE_API_KEY` | AI endpoints | Lovable AI gateway key |
| `AZURE_CLIENT_ID` | Outlook OAuth | Microsoft Azure app client ID |
| `AZURE_CLIENT_SECRET` | Outlook OAuth | Microsoft Azure app client secret |
| `GOOGLE_PLACES_API_KEY` | Places | Google Places API key |
| `WORKER_API_KEY` | Worker endpoints | VPS worker authentication |
| `RESEND_API_KEY` | VPS Worker | Resend email service (used by external worker) |

---

*Documentation generated: December 2024*
