# OpenApply

**Free, open-source AI job search and application assistant.** Search a dozen job boards at once, have AI score
every posting against your resume, and get a tailored cover letter, resume summary and screening answers for each
one. A browser extension fills the application form, and you review it and click submit.

Everyone brings their own AI key (Claude, GPT, Gemini, OpenRouter, Groq or any OpenAI-compatible server), so the
hosted app costs nothing to run per user, and users pay their AI provider directly for what they use.

## Features

- **One search, many boards.** Remotive, Himalayas, Jobicy, Remote OK, Arbeitnow, plus the public Greenhouse, Lever
  and Ashby career boards of well-known companies. Optional free-key sources: Adzuna (local jobs in 19 countries),
  USAJOBS, and JSearch (aggregates LinkedIn, Indeed and Glassdoor listings). Results are cached and deduplicated in a
  shared jobs table.
- **Resume → profile.** Upload a PDF, DOCX or TXT resume. The AI extracts a structured, editable profile. Prompts
  forbid inventing experience.
- **Fit scoring.** A free keyword estimate on every result, plus an AI score with strengths, gaps and dealbreakers.
- **Application writer.** Cover letter, tailored summary, rewritten bullets and screening answers, all editable. Paste
  any extra form questions and get answers.
- **Autopilot.** Saved searches run daily: find new jobs, pre-filter for free, AI-score the best, and write complete
  applications for matches above your threshold. A daily cap limits spend.
- **Tracker.** A board with Saved → Ready → Applied → Interviewing → Offer / Rejected columns, plus notes.
- **Autofill extension.** Fills Greenhouse, Lever, Ashby, SmartRecruiters, Workday (page by page) and most plain
  forms, and attaches your resume. It never submits.
- **Privacy and cost controls.** API keys are encrypted with AES-256-GCM and only used server-side. Per-user usage
  tracking, an optional monthly token cap, and account deletion.

### Why it doesn't auto-submit

Job boards' terms prohibit automated submissions, most forms have CAPTCHAs, and unreviewed AI applications hurt
candidates. OpenApply automates everything up to the submit button, which takes applying down to about a minute per
job.

## Stack

Next.js 16 (App Router, server actions) · Supabase (Postgres + RLS, Auth, Storage) · Tailwind CSS 4 · Anthropic SDK
+ OpenAI-compatible providers · Docker on Railway.

```
src/app/            pages, server actions, API routes (cron, extension, health)
src/lib/jobs/       job source adapters, search + dedupe + cache
src/lib/ai/         providers (BYO key), prompts/tasks, key storage
src/lib/autopilot.ts  the daily agent
supabase/migrations/  database schema, RLS policies, storage bucket
extension/          Chrome/Edge MV3 autofill extension
scripts/            setup-supabase, deploy-railway, cron
```

## Run locally

Requirements: Node 20.9+, Docker (for the local Supabase stack).

```bash
npm install
npx supabase start            # starts Postgres/Auth/Storage locally and applies migrations
cp .env.example .env.local    # then fill in the values `supabase start` printed
npm run dev
```

For `.env.local`, use the local API URL, the anon key and the service_role key from `npx supabase status`, set
`NEXT_PUBLIC_SITE_URL=http://localhost:3000`, and generate `ENCRYPTION_KEY` and `CRON_SECRET` with the command in
`.env.example`.

## Deploy (Supabase + Railway + your domain)

1. **Supabase.** Create an access token at https://supabase.com/dashboard/account/tokens, then run:

   ```bash
   SUPABASE_ACCESS_TOKEN=sbp_xxx SITE_URL=https://jobs.yourdomain.com npm run setup:supabase
   ```

   This creates the project, pushes the migrations, sets the auth redirect URLs, and writes `.env.production`.
   **Back up `ENCRYPTION_KEY`.** If you lose or change it, every stored AI key becomes unreadable.

2. **Railway.**

   ```bash
   npx @railway/cli login
   DOMAIN=jobs.yourdomain.com npm run deploy:railway
   ```

   This creates the project and service, sets the variables, and builds the Dockerfile. Add the DNS record Railway
   prints at your registrar.

3. **Email.** Supabase's built-in email sender is rate-limited. For real users, set up custom SMTP (Resend, Postmark
   and so on) under Supabase → Authentication → Emails. Optionally, enable Google or GitHub OAuth there and set
   `NEXT_PUBLIC_GOOGLE_AUTH=true` / `NEXT_PUBLIC_GITHUB_AUTH=true`.

Autopilot runs from a built-in hourly scheduler inside the web service. If you run more than one replica, set
`AUTOPILOT_SCHEDULER=off` and run `node scripts/cron.mjs` (with `APP_URL` and `CRON_SECRET`) from a Railway cron
service instead.

## Security notes

- User AI keys are stored encrypted in `ai_settings`, which has RLS enabled and no policies, so only the service role
  can read it. Keys never reach the browser.
- Every user table is protected by row-level security. Server code that uses the service role always scopes queries
  to the authenticated user's id.
- Extension tokens are random 192-bit strings, and only their SHA-256 hash is stored.
- Custom AI base URLs can't point at private or loopback addresses unless you set `ALLOW_PRIVATE_AI_URLS=true`
  (for self-hosters running Ollama).

## Job data

Listings belong to the boards they come from. OpenApply shows the source on every job and links back to the original
posting, as the Remotive, Remote OK, Jobicy and Himalayas APIs require. Don't republish their listings to other job
aggregators.

## License

MIT
