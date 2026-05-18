# LeadPing

**AI-powered pre-screening widget + multi-tenant CRM platform for Turkish service businesses.**

LeadPing embeds a lightweight conversational chatbot on any website that qualifies leads through natural dialogue, scores them by urgency, and pushes the data to a sector-aware CRM — all without the visitor ever filling out a form.

---

## What It Does

A client (a lawyer, real-estate agent, insurance broker, or clinic) pastes one `<script>` tag on their website. Visitors then chat with an AI assistant that gathers contact details and context-specific information (case type, budget range, coverage needs, etc.), assigns an urgency score, and instantly surfaces the lead in the client's dashboard.

The platform operator (SUPER_ADMIN) manages tenants, assigns widgets, and monitors platform-wide analytics from a separate admin interface.

---

## Architecture

```
leadping/
├── apps/
│   ├── web/          # Next.js 14 App Router — dashboard + all API routes
│   └── widget/       # Vanilla TypeScript widget (< 20 KB, Shadow DOM)
├── packages/
│   ├── db/           # Prisma schema + shared client
│   ├── types/        # Shared TypeScript types
│   └── skills/       # AI tool plugin system (Vercel AI SDK)
```

Managed as a **Turborepo monorepo** with shared packages consumed by both apps.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| AI | Vercel AI SDK + OpenAI `gpt-4o-mini` |
| Auth | Supabase Auth |
| Database | Supabase PostgreSQL + Prisma ORM |
| Widget Build | esbuild (IIFE, ES2018, ~20 KB) |
| UI | shadcn/ui (Zinc) + Tailwind CSS |
| Email | Resend |
| SMS | Twilio |
| Monorepo | Turborepo |

---

## Key Features

### Embeddable Widget
- Single `<script data-token="...">` embed — no npm install, no React dependency
- Shadow DOM isolation so it never conflicts with the host page's styles
- Streams AI responses in real time with a typing indicator
- KVKK (Turkish GDPR) consent gate built in
- Configurable primary color, welcome message, and logo per tenant

### Lead Intelligence
- AI extracts structured lead data from free-form conversation
- Scores leads 1–10 and assigns LOW / MED / HIGH urgency automatically
- Captures **sector-specific fields** without extra prompts:
  - Legal → case type, opposing party
  - Real Estate → location, budget, property type
  - Insurance → coverage type, existing policy
  - Healthcare → symptoms, preferred appointment time
- Annotates the chat stream with structured lead data so the widget can render a lead card in real time

### Skill System
AI capabilities are modular tools (Vercel AI SDK `CoreTool`):

- **`collectLeadInfo`** (always-on): captures contact, summary, urgency, score, and sector data; persists to DB and triggers email notification
- **`calendly`** (optional): offers appointment booking inline; configured per widget with a URL

Tenants toggle and configure skills from their dashboard. At chat time, `getActiveTools()` reads the widget's `skillsConfig` and injects only the enabled tools into the AI prompt.

### Multi-Tenant CRM Dashboard
- Leads table with filters by status (NEW / CONTACTED / CONVERTED / LOST) and urgency
- Per-lead notes and manual status updates
- Conversation replay with full message history
- Weekly trends and conversion rate metrics

### Admin Platform
- Create tenants, assign widgets, set sector and plan tier (FREE / PRO / AGENCY)
- Send welcome emails to new customers via Resend
- Platform-wide lead and usage analytics

### Security & Reliability
- Domain allowlist — widget only runs on the registered domain (production)
- In-memory rate limiter: 20 messages / 60 s per session
- All API inputs validated with Zod
- Role-based route protection: `/api/admin/*` → SUPER_ADMIN, `/api/dashboard/*` → ADMIN/MEMBER, `/api/widget/*` → token-based (no user auth)

---

## Data Model (simplified)

```
Tenant ──< Profile (SUPER_ADMIN | ADMIN | MEMBER)
Tenant ──< Widget  ──< Conversation ──< Lead
                                      └─< Notification (EMAIL | WHATSAPP)
```

`Widget.skillsConfig` and `Lead.sectorData` are flexible JSON columns, keeping the schema stable as new sectors and skills are added.

---

## How a Lead Is Captured

1. Visitor opens the widget → accepts KVKK consent
2. Each message is `POST /api/widget/chat` with a session ID
3. The API authenticates the token, rate-checks the session, then calls OpenAI with the widget's system prompt and active skill tools
4. When the model calls `collectLeadInfo`, the skill handler:
   - Writes a `Lead` row and links it to the `Conversation`
   - Queues an email `Notification`
   - Sends a stream annotation (`8:`) back to the widget with the lead data
5. The widget renders a lead card and the client's dashboard shows the new lead instantly

---

## Getting Started

### Prerequisites
- Node.js ≥ 20
- A Supabase project
- OpenAI API key

### Environment Variables

Create `apps/web/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
DIRECT_URL=
OPENAI_API_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_WIDGET_URL=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

### Install & Run

```bash
npm install
npm run db:push      # sync Prisma schema to Supabase
npm run dev          # starts web + widget in parallel
```

### Build

```bash
npm run build        # builds all apps and packages via Turbo
```

The widget outputs a single `widget.js` file in `apps/widget/dist/` ready to serve from a CDN.

---

## Project Structure Highlights

```
apps/web/
├── app/
│   ├── (admin)/          # SUPER_ADMIN UI
│   ├── (dashboard)/      # Tenant UI
│   └── api/
│       ├── admin/        # Platform management endpoints
│       ├── dashboard/    # Tenant-scoped endpoints
│       └── widget/       # Public, token-authenticated endpoints
├── lib/
│   ├── db/               # Prisma query helpers
│   └── admin/            # Auth utilities

apps/widget/src/index.ts  # Complete widget (Shadow DOM, streaming, KVKK)

packages/skills/src/skills/
├── collectLeadInfo.ts    # Core lead capture tool
└── calendly.ts           # Appointment booking tool
```

---

## Roadmap

- [ ] WhatsApp notification delivery via Twilio
- [ ] More sectors (e-commerce, education)
- [ ] Webhook delivery for CRM integrations
- [ ] Usage-based billing (Stripe)
- [ ] Widget A/B testing

---

## License

Private — all rights reserved.
