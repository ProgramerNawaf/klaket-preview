# Klaket integrations (brief & foundation stage)

**Status:** draft, 2026-10-24.

**Who does what:**
- **You** create each account, choose the plan, add the company payment method, turn on 2FA, and paste the keys with `npx supabase secrets set`.
- **I** wire up and test each service, set the non-secret configuration, and fill in the "Verified" column.

**Still blank:** the payment limits (`USD ___`), the sending domain (shown below as `<domain>`), and the staging project reference (`<staging-ref>`). They get filled in when you send them.

**Ownership:** every account is company-owned. The owner and billing admin is `nawafalahmedse@gmail.com`. Plans are monthly, with billing alerts on, and API scopes are the smallest that work.

## Summary
Prices change, so confirm each one when you sign up and write the real figure here.

| Service | Purpose | Plan | Monthly cost | Owner | Verified |
|---|---|---|---|---|---|
| Supabase (staging) | Database, auth, edge functions, realtime and Vault for staging | Free or Pro | confirm at signup | nawafalahmedse@gmail.com | no: project not created yet |
| Supabase (production) | The same, for production; the live project is `jdeadqzpyuajjijvvqla`, in another account | Pro | confirm | company | no |
| Google Cloud "Klaket" (`klaket-512617`) | Calendar API: kickoff events with Meet links, and RSVPs | No charge for the Calendar API at our volume | 0 | nawafalahmedse@gmail.com | **local, 2026-10-24.** Consent screen External/Testing, 2 test users, `calendar.events` scope, client "Klaket local". A test kickoff was booked with a Meet link, the consent text and the guest `blibddesmond@gmail.com`. The staging and production clients aren't made yet. |
| Fireflies.ai (workspace "Klaket") | Records and transcribes meetings; webhook when a transcript is ready; GraphQL API for the transcript and to add the notetaker. Replaces Read AI (addendum, 2026-10-24); details in [fireflies.md](fireflies.md) | Pro is enough for our API volume; confirm webhooks and Multi-Language Mode on the plan page | confirm at signup | nawafalahmedse@gmail.com | no: the workspace exists, but no API key or webhook yet |
| Resend | Approval emails (sending) and the per-workspace intake address (receiving) | A plan that covers receiving | confirm | nawafalahmedse@gmail.com | no |
| Anthropic API | Extraction, the question guide, and the budget and treatment AI | Pay as you go, with a monthly spend limit per key | usage-based; set the limit | nawafalahmedse@gmail.com | local key works (acceptance test 3 passed) |
| Realtime | Questionnaire answers and suggestions appearing live | Built into Supabase | 0 | (Supabase) | not yet used |
| Error monitoring | Alerts on webhook and email failures | Function logs plus a `notifications` alert; Sentry free tier optional | 0 | company | no |

## Secrets and settings
Set these per project with `npx supabase secrets set NAME=value`. Staging and production always get **different** values. The names are the ones the code reads; see `supabase/functions/.env.example`.

| Name | Secret? | Staging | Production |
|---|---|---|---|
| `MPH_ENV` | no | `staging` | `production` |
| `MPH_EMAIL_ALLOWLIST` | no | `nawafalahmedse@gmail.com,blibddesmond@gmail.com` | (unused) |
| `MPH_FUNCTIONS_URL` | no | `https://<staging-ref>.supabase.co/functions/v1` | `https://<prod-ref>.supabase.co/functions/v1` |
| `MPH_APP_URL` | no | where the staging app is hosted | `https://<app domain>/` |
| `MPH_SIGNING_KEY` | yes | `openssl rand -hex 32` | a different random value |
| `ANTHROPIC_API_KEY` | yes | staging key | production key |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | yes | the staging OAuth client | the production OAuth client |
| `RESEND_API_KEY` | yes | a staging key (sending + receiving) | a production key |
| `RESEND_WEBHOOK_SECRET` | yes | from the staging webhook | from the production webhook |
| `MPH_INBOUND_DOMAIN` | no | `inbound-staging.<domain>` (or the Resend-provided domain) | `inbound.<domain>` |
| `MPH_APPROVALS_FROM` | no | `Klaket Approvals <approvals@<domain>>` | the same |

Two kinds of secret are stored per workspace in **Supabase Vault**, not in function secrets: the Fireflies API key and webhook signing secret, and Google refresh tokens. They're added in the app under Team → Integrations.

## Webhook and redirect URLs
| What | URL |
|---|---|
| Google OAuth redirect | `<MPH_FUNCTIONS_URL>/integrations/google/callback` |
| Fireflies webhook (V2, events `meeting.transcribed`, `meeting.summarized`, `meeting.bot_joined`) | `<MPH_FUNCTIONS_URL>/notetaker-webhook/fireflies/<workspace token>`; the token is shown on Team → Integrations. **Built 2026-10-24**, replacing `readai-webhook`. |
| Scheduled poll (missed webhooks, retries) | `<MPH_FUNCTIONS_URL>/notetaker-webhook/poll`. It's called every 10 minutes by `pg_cron`, with the header `x-cron-secret`. Per environment, store the Vault secrets `mph_functions_url` and `mph_cron_secret` and set `MPH_CRON_SECRET`. |
| Resend inbound (`email.received`) | `<MPH_FUNCTIONS_URL>/email-intake/resend` |
| Resend delivery events (`email.bounced`, `email.complained`) | `<MPH_FUNCTIONS_URL>/approvals/resend-events`. **To build in Phase 1:** it marks the recipient's `send_status` and alerts the producer. |

## Setup steps
### 1. Supabase staging
1. Go to supabase.com/dashboard and choose **New project**. Name it `klaket-staging`, pick a region close to Riyadh, and save the database password in your password manager.
2. Copy the Reference ID from **Project Settings → General**.
3. Run `npx supabase link --project-ref <staging-ref>`. Type the real ID, without `<` `>`.
4. Tell me it's linked. I'll check that it isn't the live project, then run `npx supabase db push`, deploy the five functions, set the non-secret settings, and run the database tests against it.

### 2. Google Cloud "Klaket"
1. Go to console.cloud.google.com and create a **New project** named `Klaket`.
2. Open **APIs & Services → Library** and enable the **Google Calendar API**.
3. Set up the **OAuth consent screen**:
   - User type: External.
   - App name: Klaket. Logo: `docs/brand/apple-touch-icon.png`.
   - Support email: nawafalahmedse@gmail.com.
   - Privacy policy and terms URLs. These pages don't exist yet; I'll add simple ones to the app if you want.
   - Scope: `.../auth/calendar.events`.
   - Test users: both test accounts.
4. Under **Credentials**, create two **OAuth client IDs**, both of type Web application: `Klaket staging` and `Klaket production`. Each gets its own redirect URL from the table above.
5. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` on each project.
6. **To verify:** Team → Integrations → Connect Google Calendar, then book a test kickoff.
7. **Watch out:** Google's consent screen shows each permission with its own checkbox. If "View and edit events on all your calendars" is left unticked, Klaket now refuses the connection and asks you to connect again (commit `05a26e0`).

### 3. Fireflies.ai
The Klaket workspace already exists, owned by `nawafalahmedse@gmail.com`. Verified facts and sources are in [fireflies.md](fireflies.md).
1. **Plan:** check that the plan includes **API access, Webhooks V2** and, ideally, **Multi-Language Mode**. Pro covers our API volume. Upgrade within the spending cap.
2. **Calendar:** under Settings → Calendar, connect the Google calendar, and set **auto-join** to the meetings you organise.
3. **Language:** under Settings → Meeting Language, turn on **Multi-Language Mode** (beta) if the plan has it. Otherwise choose **Arabic**.
4. **API key:** under Settings → Developer settings, generate the **API key**. Paste it **only** into Klaket under Team → Integrations → Fireflies (stored in Vault). Never paste it in chat or code.
5. **Webhook:**
   - Open `app.fireflies.ai/integrations/api/webhook` (Webhooks V2; V1 can't be created any more).
   - Paste the URL from Team → Integrations.
   - Set a **signing secret**: a long random value, which you also paste into Klaket.
   - Tick `meeting.transcribed`, `meeting.summarized` and `meeting.bot_joined`.
   - Save, then **Send Test Event**.
   - Do this once for staging and once for production.
6. **To verify:**
   - Run a short real meeting in mixed Arabic and English.
   - Staging logs the raw webhook, and the fetched transcript becomes the recorded test fixture, with everything except the two test emails redacted.
   - Note how long Fireflies took to finish the transcript.

### 4. Resend (sending and receiving)
1. Create the account. Under **Domains**, add `<domain>`, then add the DNS records Resend shows for **SPF** and **DKIM**.
2. Add a **DMARC** record. Start with `v=DMARC1; p=none; rua=mailto:nawafalahmedse@gmail.com` and tighten it later.
3. Under **Receiving**, set up the inbound domain or subdomain.
4. Under **Webhooks**, add `email.received` → intake and `email.bounced` / `email.complained` → delivery events, separately for staging and production. Copy each signing secret.
5. Create **API keys**, one per environment.
6. **Gmail forwarding:** in the producer's Gmail, open Settings → Forwarding → Add the workspace intake address. The confirmation email arrives in Klaket, which already detects Gmail's confirmation code.
7. **To verify:**
   - An approval email to both allowlisted accounts.
   - A blocked send to any other address.
   - A forwarded client email reaching the right production.

### 5. Anthropic API
1. In the Anthropic Console, create two keys: `klaket-staging` and `klaket-production`.
2. Set a **monthly spend limit** on each, matching the payment rules once you fill them in.
3. Set `ANTHROPIC_API_KEY` on each project yourself, with `read -s` as before. Never paste a key in chat.

### 6. Error monitoring
- **Default (free):**
  - When a webhook or email fails, the producer gets a `notifications` row.
  - The failure is logged in `webhook_receipts` and `email_outbox`.
  - Supabase function logs keep the details.
- **Optional:** Sentry free tier, which would need a DSN secret per environment.

## Rotating keys
For each key: create the new key, `supabase secrets set` it, redeploy if the provider needs it, confirm one real call works, then revoke the old key.

| Key | Where to rotate | How often |
|---|---|---|
| `MPH_SIGNING_KEY` | Changing it invalidates every open approval link and Google connect link. | yearly, or on suspicion |
| `ANTHROPIC_API_KEY` | Anthropic Console | yearly |
| `RESEND_*` | Resend dashboard | yearly |
| Google client secret | Google Cloud Credentials | yearly |
| Fireflies API key and webhook signing secret | Fireflies Settings → Developer settings and the Webhooks V2 page; then Team → Integrations | yearly |

## How to cancel
- **Fireflies:** delete the V2 webhook and revoke the API key, then cancel or downgrade the plan under Settings → Billing.
- **Resend:** delete the domains and webhooks, then downgrade the plan.
- **Google Cloud:** disable the Calendar API, delete the OAuth clients, and if needed shut the project down. There's no subscription.
- **Anthropic:** revoke the keys. Billing is by usage only.
- **Supabase staging:** pause or delete the project from its settings.
