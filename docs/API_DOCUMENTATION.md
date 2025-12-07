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

### Send Campaign

Queues a marketing campaign for sending to selected lists.

**Endpoint:** `POST /functions/v1/send-campaign`

**Authentication:** JWT Bearer Token

**Request Body:**
```json
{
  "campaignId": "string (required) - UUID of the campaign",
  "listIds": "array (required) - Array of list UUIDs (empty for all contacts)"
}
```

**Success Response:**
```json
{
  "success": true,
  "queued": 150,
  "message": "Emails queued for sending. VPS worker will process them."
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 500 | Campaign not found, already sent, or no contacts |

**Process:**
1. Validates campaign is in "draft" status
2. Updates campaign status to "sending"
3. Fetches contacts from selected lists (or all active contacts)
4. Renders blocks to HTML if `blocks_json` exists
5. Personalizes content with contact data
6. Adds tracking pixel and wraps links
7. Adds unsubscribe link
8. Inserts all emails into `email_queue` table

---

### Get Pending Emails

Fetches queued emails for the VPS worker to process.

**Endpoint:** `POST /functions/v1/get-pending-emails`

**Authentication:** Worker API Key (`x-worker-key` header)

**Request Body:**
```json
{
  "limit": "number (optional, default: 10) - Max emails to fetch"
}
```

**Success Response:**
```json
{
  "emails": [
    {
      "id": "uuid",
      "campaign_id": "uuid",
      "contact_id": "uuid",
      "email": "recipient@example.com",
      "subject": "string",
      "html_content": "string",
      "from_name": "string",
      "from_email": "string",
      "reply_to_email": "string | null",
      "contact_first_name": "string | null",
      "contact_last_name": "string | null",
      "status": "pending",
      "attempts": 0
    }
  ]
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 401 | Invalid worker key |
| 500 | Database error |

---

### Update Email Status

Updates the status of a queued email after processing.

**Endpoint:** `POST /functions/v1/update-email-status`

**Authentication:** Worker API Key (`x-worker-key` header)

**Request Body:**
```json
{
  "emailId": "string (required) - UUID of the email_queue record",
  "status": "string (required) - 'processing', 'sent', or 'failed'",
  "error": "string (optional) - Error message if failed",
  "logEvent": "boolean (optional) - Whether to log to email_events",
  "campaignId": "string (optional) - Required if logEvent is true",
  "contactId": "string (optional) - Required if logEvent is true",
  "email": "string (optional) - Required if logEvent is true"
}
```

**Success Response:**
```json
{
  "success": true
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 400 | Missing emailId or status |
| 401 | Invalid worker key |
| 500 | Database error |

---

### Check Campaign Completion

Checks if all emails for a campaign have been processed and marks it as complete.

**Endpoint:** `POST /functions/v1/check-campaign-completion`

**Authentication:** Worker API Key (`x-worker-key` header)

**Request Body:** None required

**Success Response:**
```json
{
  "completedCampaigns": ["uuid1", "uuid2"]
}
```

**Error Responses:**
| Status | Description |
|--------|-------------|
| 401 | Invalid worker key |
| 500 | Database error |

**Process:**
1. Finds all campaigns with status "sending"
2. Checks if any emails are still "pending" or "processing"
3. If all processed, updates campaign status to "sent" with `sent_at` timestamp

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
