# Brief & foundation stage: Phase 0 plan

**Branch:** `feature/brief-foundation`, cut from `feature/sifi-theme` at `edb664d`. That commit has the SiFi theme and the Klaket logo, and already contains all of `mvp`.

**Checkpoint tag:** `pre-brief-foundation`.

**Why not from `mvp`:** the theme and the logo are still waiting for review and are not merged into `mvp`. Merging this branch would therefore bring them in too.

## Stack (what each phase will use)
| Topic | In this repo |
|---|---|
| Front end | A static single-page app in `docs/` with no build step. Screens register with `MPH.view(...)`. The logo is `MPH.logo()` in `docs/js/brand.js` (plain JavaScript, not a React component). |
| Database and migrations | Supabase Postgres. Migrations live in `supabase/migrations/*.sql` and are applied with `npx supabase db push`. Tests are pgTAP files in `supabase/tests/`, run with `npx supabase test db`. |
| Auth and roles | Supabase Auth. Roles come from `org_members` and `production_members`, through the row-level security (RLS) helpers `is_team`, `can_edit`, `can_see_internal`, `is_client` and `org_role`. |
| Server code | Supabase Edge Functions (Deno) in `supabase/functions/`: `ai`, `integrations`, `readai-webhook`, `email-intake` and `approvals`. They run with `verify_jwt=false` and do their own auth checks. Shared code is in `_shared/`, with Deno tests. |
| Calling Claude | `_shared/claude.ts` exposes `askJSON()` with model `claude-opus-5`. Calls go only from edge functions; the key is `ANTHROPIC_API_KEY` in the function secrets. |
| Realtime | **Supabase Realtime** (`postgres_changes`), which is built in and respects RLS, so no paid service is needed. It isn't used anywhere yet; Phase 7 will be the first use. |
| Secrets | Function secrets via `supabase secrets set` (one set for staging, one for production). Per-workspace tokens go in Supabase Vault, through `integrations.secret_ref`. |
| Client privacy | Enforced by RLS: clients can't read `brief_sources`, `brief_field_suggestions`, transcripts, internal stakeholders, the outbox or approval records. Tested in `supabase/tests/*.sql`. The new tables in Phase 7 (`meeting_question_sets`, `meeting_questions`) get the same team-only policies and tests. |
| Email | Resend for both sending and receiving. `MPH_EMAIL_ALLOWLIST` is enforced outside production, in `_shared/allowlist.ts`. |

## Already built (milestones M1–M6 on `mvp`, all on this branch)
| Spec phase | Status |
|---|---|
| 2 · P0 fixes | **Done.** The schedule AI counts only accepted cast, and unapplied AI suggestions are saved as `ai_pending`. |
| 3 · Brief entity | **Mostly done.** Built: the fields, deliverables, usage rights, the versioned `draft → sent → approved / changes_requested` flow with locked sent versions, the client portal view, and the downstream wiring (storyboard ratios, deliverables list, calendar timeline, budget guardrail, budget and treatment AI reading the brief, approval moving the status to Development, the Format field migrated). **Missing:** the KPI and music-direction fields, and the locked **Concepts** gate. |
| 4 · Extraction | **Done.** Built: one service, per-field `value / confidence / source_quote / source_id`, `missing_info`, `conflicts`, the Breakdown-style review, and the rule that human-edited fields are never overwritten. **Missing:** `questionnaire` as a source type. |
| 5 · New project + Gmail intake | **Intake done**: Resend forwarding address, matching, the New requests inbox, attachments read by the existing importers, and stakeholders from the sender and CC. Gmail OAuth is behind a flag. **The New project form needs:** client contacts, project type, a pasted email or notes field, and landing on the Brief with "Next: book the kickoff meeting". |
| 6 · Stakeholders | **Done:** the `production_stakeholders` table, the rules, the People panel, and the approver chosen from stakeholders. **To check:** the review banner after each meeting. |
| 7A · Booking | **Mostly done:** a Calendar event with a Meet link, the consent notice, and the event shown on the Klaket calendar. **Missing:** the agenda and questionnaire link in the invite, and syncing RSVPs. |
| 7B / 7C · Questions, questionnaire, meeting mode | **Not built.** |
| 8 · Notetaker (now **Fireflies**) | **Fireflies webhook built 2026-10-24** (tested locally against a mock; see `docs/integrations/fireflies.md`). Earlier, on Read AI: a per-workspace token, signature check, idempotency, matching, Unassigned meetings, transcript → extraction, and attendees. **For Fireflies:** a V2 webhook with `X-Hub-Signature` (`sha256=` hex HMAC), a fast 200 and fetching the transcript in the background, retries with backoff, a polling fallback, speaker and timestamp quotes, excluding the bot, and a provider-neutral `notetaker` rename. **Also missing:** reconciling the questions, Follow-up needed with "email follow-up questions", action items → tasks (there is no tasks table yet), and the summary notification. |
| 9 · Approval by email | **Done:** the generic `approval_requests / recipients / responses` tables, a signed single-use 7-day link, the audit trail, and the allowlist. **Missing:** the send-blocking rules (approver without an email, unresolved conflict, empty must-asks with a reason to override), "any one / all approvers", and unlocking Concepts. |
| 1 · Integrations | **Code is ready; the accounts are not.** Nothing is set up on Google Cloud, Fireflies, the sending domain, the staging project or error monitoring. |

So the remaining work is mostly Phases 1, 3 (gaps), 5 (form), 7 and 8 (reconciliation), and 9 (rules and gate), plus the end-to-end run in Phase 10.

## Conflicts with the codebase, and decisions I need
1. **New project status: decided 2026-10-24.** Keep **Briefing** as the starting status. Approving the brief moves a production from Briefing to Development, and the status can still be changed by hand. The spec's "on create: status Development" doesn't apply.
2. **Phase 1 accounts and payments.** I can't create accounts, sign in with passwords, enter payment details or accept terms of service on your behalf.
   - **What I'll do:** write step-by-step guides (in `docs/integrations/README.md`), wire up and test every service once you've created it, set the non-secret configuration, and verify the webhooks.
   - **What you'll do:** create the accounts, choose the plans, add the payment method and set the API keys (as you did for Anthropic).
   - **Also needed:** the payment limits in the spec are blank (`USD ___`). Please fill them in.
3. **Our sending domain.** `approvals@<our domain>` needs a domain you own, for SPF, DKIM and DMARC. Which domain is it? Is `klaket.<tld>` registered?
4. **Staging Supabase project.** It still doesn't exist: your Supabase account has no projects, and the live project `jdeadqzpyuajjijvvqla` belongs to a different account. Phase 1 and every live test depend on it.
5. **Notetaker: Fireflies.ai replaces Read AI** (addendum, 2026-10-24). The verified API facts are in `docs/integrations/fireflies.md`.
   - **Live transcripts:** Fireflies has a **beta** Realtime API over WebSockets. Edge Functions can't hold the socket, and the key mustn't go to the browser, so meeting mode stays manual for this stage. This is the report-first point the addendum asks for.
   - **Doesn't match the addendum, so the code follows the docs:** the mutation is `addToLiveMeeting`, limited to 3 calls per 20 minutes. V2 webhooks use the fields `event` / `meeting_id` and the event `meeting.transcribed`.
6. **Error monitoring.** There's none in the repo. **Proposal:** start with Supabase's function logs plus a `notifications` alert to the producer on webhook and email failures, which costs nothing. Add Sentry's free tier only if you want an outside service.
7. **Claude model.** `askJSON()` uses `claude-opus-5`. When I touch extraction I'll check it against the current model list, and change it only if you agree.
8. **Logo component.** The spec's `<Logo />` is `MPH.logo()` here, because there's no React. Emails use the hosted PNG `docs/brand/klaket-email@2x.png`.

## Order of work
1. **Phase 1 (guides, wiring and config)**, run alongside you creating the accounts.
2. **Phase 3 gaps**: KPI, music, and the Concepts gate.
3. **Phase 5**: the New project form.
4. **Phases 7A, 7B and 7C**: questions, questionnaire, meeting mode, and realtime.
5. **Phase 8**: reconciliation, follow-ups, tasks, and the notification.
6. **Phase 9**: the send-blocking rules, the approver rule, and unlocking Concepts.
7. **Phase 10**: the end-to-end run on staging.

Each phase gets its own commits and a short report. Nothing is merged into `mvp` until you approve.
