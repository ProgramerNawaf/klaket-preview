# Fireflies.ai: what the docs say (checked 2026-10-24)

Fireflies replaces Read AI, as the addendum to the brief & foundation spec asks. Everything below comes from docs.fireflies.ai and Fireflies' help guide as of today. **A real staging payload must confirm each point before code relies on it.**

## Webhooks: use Webhooks V2
Source: [Webhooks V2](https://docs.fireflies.ai/graphql-api/webhooks-v2), [Webhooks (V1)](https://docs.fireflies.ai/graphql-api/webhooks)

- **V1 can't be used:** V1 webhooks can no longer be created; the field in Settings → Developer settings is read-only.
- **Where to create one:** use the V2 page, `app.fireflies.ai/integrations/api/webhook`. Enter an HTTPS URL (public host, no redirects), an optional **signing secret** and the events to send.
- **Events:** `meeting.transcribed`, `meeting.summarized` and `meeting.bot_joined`.
  - We subscribe to `meeting.transcribed` and `meeting.summarized`.
  - `meeting.bot_joined` is useful for the notetaker status (`joined`).
  - The addendum's "Transcription completed" is the **V1** string.
- **Payload:** the notification doesn't contain the transcript. Its fields:

  | Field | Type | Notes |
  |---|---|---|
  | `event` | string | |
  | `timestamp` | ms | new on every retry |
  | `meeting_id` | string | the same as the transcript ID |
  | `client_reference_id` | string | optional |
  | `reprocessed_at` | ms | resends only |

  The addendum's `meetingId`, `eventType` and `clientReferenceId` are the **V1** names.
- **Signature:** the header `X-Hub-Signature` is sent only when a secret is set. Its value is `sha256=<hex HMAC-SHA256 of the raw body>`, and the docs say to compare it in constant time.
  - **Our rule:** a workspace without a signing secret is rejected outside local runs, which meets N1.
- **Retries:** up to 5 (30 s, 2 min, 10 min, 30 min, 2 h).
  - Retried: connection failures, 429 and 5xx.
  - Not retried: other 4xx responses.
  - **We must return 2xx within 30 s.** A slow response counts as failed and is *not* retried, which is why the spec's "respond fast, then work in the background" matters.
- **Scope:** per user, so only meetings the API-key owner organises. That's the producer's account, which fits our setup. Team-wide webhooks need the Enterprise plan and a Super Admin.
- **Dedup key:** `meeting_id`, plus `reprocessed_at` when present. A resend after the notes change is a deliberate update, not a duplicate, so it should create new suggestions only. Fields people have already accepted are never overwritten.

## Fetching the transcript (GraphQL)
Source: [transcript query](https://docs.fireflies.ai/graphql-api/query/transcript)

- **Endpoint:** `POST https://api.fireflies.ai/graphql` with `Authorization: Bearer <API key>`.
- **Query:** `transcript(id: String!)`. Fields we'll request:
  - **Basics:** `id`, `title`, `date`, `dateString`, `duration`, `organizer_email`, `host_email`, `transcript_url`
  - **Matching to our event:** `calendar_id`, `cal_id`, `calendar_type`, `meeting_link`
  - **People:**
    - `participants`
    - `meeting_attendees { displayName email name }`
    - `meeting_attendance { name join_time leave_time }`
    - `speakers { id name }`
  - **What was said:** `sentences { index speaker_name speaker_id text start_time end_time }`
  - **Summary:** `summary { overview short_summary action_items keywords outline topics_discussed }`
- **The query has no language field.** We'll learn the meeting's language from the text itself, and from what we pass to `addToLiveMeeting`.
- **Quote format:** `start_time` is in seconds, so a quote reads like "Fahad, 03:12".

## Adding the notetaker to a meeting
Source: [addToLiveMeeting](https://docs.fireflies.ai/graphql-api/mutation/add-to-live)

- **Name:** the mutation is **`addToLiveMeeting`**, not `addToLive`.
- **Arguments:**

  | Argument | Type | Notes |
  |---|---|---|
  | `meeting_link` | `String!` | |
  | `title` | String | up to 256 characters |
  | `meeting_password` | String | |
  | `duration` | Int | 15–120 minutes, default 60 |
  | `language` | String | up to 5 characters, default English |
  | `attendees` | | |

- **Returns:** `success`.
- **Rate limit:** **3 calls per 20 minutes per user.** Business and Enterprise plans pool 3 per paid seat, up to 60. A 429 comes with a `Retry-After` header.
  - **Effect on us:** the "Add Fireflies to this meeting" button must show a clear "try again in N minutes" message instead of failing silently.
- **Errors:** `too_many_requests`, `invalid_language_code`, `unsupported_platform`.

## API rate limits
Source: [Limits](https://docs.fireflies.ai/fundamentals/limits)

| Plan | Per minute | Per day |
|---|---|---|
| Free | 30 | 500 (plus a 14-day API trial at Pro limits) |
| Pro | 60 | 5,000 |
| Business | 60 per paid seat (up to 1,200) | no daily cap |
| Enterprise | 60 per paid seat (up to 2,400) | no daily cap |

Our volume is a few transcripts a day, plus polling every few minutes, so **Pro is enough.** The docs don't name a plan for webhooks or the API; confirm both on the plan page before upgrading.

## Arabic and mixed Arabic + English
Sources: [supported languages](https://guide.fireflies.ai/articles/2973706448-learn-about-fireflies-supported-languages), [language settings](https://guide.fireflies.ai/articles/5788629108-learn-about-fireflies-auto-language-detection), [Multi-Language Mode (Beta)](https://guide.fireflies.ai/articles/2585231364-transcribe-fireflies-meetings-in-multiple-languages-with-multi-language-mode-beta)

- **Arabic is supported** (code `ar`). Set it under Settings → Meeting Language.
- **Mixed-language meetings:** **Multi-Language Mode is in beta.** It detects languages as people switch, even mid-sentence.
- **Conflicting information:** an older version of the same guide listed only about 10 languages, without Arabic, and said Business/Enterprise only.
- **What to test:** do one real mixed Arabic + English test meeting on staging and record how it did. That's the spec's audience line in Arabic plus English lines.
- **Plan:** use Multi-Language Mode if our plan includes it. Otherwise set the meeting language to `ar`, and pass `language: "ar"` to `addToLiveMeeting`.

## Live transcripts
Source: [Realtime API](https://docs.fireflies.ai/realtime-api/overview)

- **It exists, but it's in beta** ("features and endpoints may change"). It uses WebSockets (Socket.IO, `wss://api.fireflies.ai`, path `/ws/realtime`), authenticated with the API token plus a `transcriptId`.
- **To find the ID** of a meeting in progress, use the "Active Meetings" query.
- **What it sends:** `transcription.broadcast` events, each carrying a `chunk_id` that's reused when a segment is updated.
- **Not documented:** which plans include it.
- **Recommendation, as the addendum asks: report first, don't build on it yet.**
  - It's beta.
  - It needs a long-lived socket. Supabase Edge Functions can't hold one; it would have to run in the producer's browser with the API key, which we must not expose, or in a small separate worker.
  - Meeting mode stays manual for this stage.

## Secrets and where they live
Fireflies is per workspace: one producer account, its API key and webhook. Like the old Read AI key, these go in **Supabase Vault** and are added in the app under Team → Integrations. The owner pastes them there, never in chat or code.

| Secret | Where it comes from | Stored as |
|---|---|---|
| Fireflies API key | Fireflies Settings → Developer settings (the owner generates it) | Vault, `integrations` row `provider = 'fireflies'` |
| Webhook signing secret | the owner chooses it on the Webhooks V2 page | Vault, same row |

**Webhook URL:** `<MPH_FUNCTIONS_URL>/notetaker-webhook/fireflies/<workspace token>`. This is a provider-neutral function that replaced `readai-webhook` on 2026-10-24.

## What's built (2026-10-24)
- **Code:**
  - `supabase/functions/notetaker-webhook`: checks the signature, records one job per meeting, replies at once, then fetches the transcript in the background.
  - Shared modules: `_shared/fireflies.ts` (API calls, mapping) and `_shared/notetaker.ts` (matching, transcript lines as "Speaker, mm:ss: …", the bot filter, backoff).
  - Migration `20261026090000`: the `notetaker_jobs` table, the `events.notetaker_*` columns, the `fireflies` provider and the 10-minute `pg_cron` poll.
- **Retries:** the backoff is 1, 2, 5, 10, 20, 30, 60 and 60 minutes, then the job fails and the producer is notified.
  - When `meeting.transcribed` arrives, the fetch waits 5 minutes for the summary; `meeting.summarized` runs it at once.
  - A resend with a newer `reprocessed_at` runs again, which adds new suggestions only.
- **Polling fallback:** the poll lists the key owner's transcripts from the last 24 hours. It picks up any that ended more than 30 minutes ago and have no job. A polled meeting that matches no production is ignored rather than sent to Unassigned, because it's probably one of the producer's other meetings.
- **In the app:**
  - Team → Integrations: the webhook URL, the API key (checked with Fireflies' `user` query), the signing secret, and the language.
  - Kickoff card on the Brief: the notetaker status, and the **"Add Fireflies to this meeting"** button. It's shown from 30 minutes before the start until the end, and it shows Fireflies' 3-per-20-minutes limit as "try again in N minutes".
- **Tests:**
  - `notetaker_test.ts`: unit tests.
  - `notetaker_webhook_test.ts`: end to end on the local stack against a mock Fireflies API. It covers N1, N2, N3, N9, N10, N11 and N12, plus bot_joined and the add button.
- **Confirmed live on 2026-10-24:**
  - Fireflies' "Send Test Event" arrived through the tunnel as `{"event":"test","timestamp":<ms>,"meeting_id":"test_00000000"}`, which matches the V2 field names.
  - A refused API key comes back with the code `auth_failed` and HTTP status 500. Klaket treats that as a bad key, not an outage.
- **Not verified with the real Fireflies yet:** the transcript fields and the meeting event names. That needs the staging project, the API key and one real meeting, whose redacted response then replaces `fireflies_sample.ts`.
