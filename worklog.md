# MemorableDay — Project Worklog

This is the shared worklog file for all agents working on the MemorableDay project.

---

Task ID: 0
Agent: Z.ai Code (main orchestrator)
Task: Clone https://github.com/sandeepdolai/NewMemorableday.git, read the complete PRD, and prepare for build instructions (NO building yet — user explicitly said "Don't Build until I said").

Work Log:
- Cloned the repository `sandeepdolai/NewMemorableday` to /tmp/NewMemorableday using the provided GitHub classic token.
- Read the complete PRD file `MemorableDay_docs_prd_ALL_32_FILES (1).md` (9,631 lines, ~406KB, 31 chapters / 73 sections).
- Saved reference copies of the PRD into the project at `/home/z/my-project/docs/MemorableDay_PRD.md` (and the repo README).
- Did NOT write any application code — awaiting the user's build instructions.

Stage Summary:
- PRD fully read and understood. Key product facts captured below for future agents.

## PRD Quick Reference (MemorableDay)

**Product:** MemorableDay — a SaaS "Interactive Moment Experiences (IME)" platform that lets individuals and businesses create, send, and track beautiful, personalized, interactive digital experiences (moments recipients remember).
- **Domain:** memorableday.online | Primary market: United States | Tagline: "Make Every Moment Memorable."
- **Two audiences:** Personal users (birthdays, anniversaries, apologies, long-distance) and Business users (post-purchase thank-yous, shipping journeys, delay apologies, VIP milestones, win-backs).
- **Core systems:**
  1. **Experience Builder** — scenes → blocks architecture (text, image, gallery, video, audio, 3D object, countdown, CTA, reward, scratch reveal, quiz, order info, tracking button, etc.), drag-and-drop, auto-save, undo/redo, mobile preview.
  2. **3D System** — curated asset library (rose, gift box, envelope, heart, confetti, balloons, cake, stars, package...), interactive 3D objects (tap-to-open gift box, envelope, bloom rose), performance budgets (<3s load on 4G, 60fps mobile, <500KB/asset), 2D graceful fallbacks.
  3. **Interaction System** — tap/swipe/auto-advance navigation, reveal interactions (gift box, envelope, scratch, password, countdown), engagement interactions (quiz, choice/branching, balloon pop, star collection), action interactions (CTA, reward claim, share).
  4. **AI System** — message generator (3 options, tone control), experience creator (complete experience from brief), tone adjuster, scene suggester, design recommender, personalization engine ({{customer.first_name}} variables), credit system by plan.
  5. **Templates** — 50+ at launch, organized by occasion (personal) and business scenario; personal + business categories.
  6. **Scheduling** — time-zone aware, recurring, trigger-based; expiration dates.
  7. **Sharing** — unique URLs `/e/[id]` (8+ char non-guessable), OG metadata, QR codes, SMS/WhatsApp/email share.
  8. **Rewards** — coupons, store credit, gift cards, free shipping, loyalty points, downloadable gifts, custom rewards.
  9. **Business Automation** — triggers (order.created/paid/fulfilled/shipped/delayed, customer milestones, inactivity), conditions, no-code builder, email/SMS delivery, drip sequences.
  10. **E-commerce Integrations** — Shopify (top priority), WooCommerce, Stripe, Zapier, Make, webhooks, CRMs (Klaviyo, HubSpot), support tools (Gorgias).
  11. **Analytics** — delivery → engagement → completion → action → outcome funnel; open rate, completion rate, scene drop-off, CTA clicks, reward claims, revenue attribution.
  12. **Accounts/Teams/Agency/White Label** — personal vs business account types, team roles (Owner/Admin/Editor/Analyst/Viewer), multi-brand agency workspaces, white label (custom domain, remove branding).
  13. **API** — REST v1, Bearer API keys, experiences/templates/automations/customers/rewards/analytics/webhooks endpoints, rate limits by plan.
  14. **Payments** — Lemon Squeezy (Merchant of Record), products/variants per plan, webhook-driven entitlement sync, AI credit top-ups.
- **Pricing:** Free (Starter), Personal $9/mo, Pro $19/mo | Business $49/mo, Growth $99/mo, Agency $249/mo, Enterprise custom. Annual ~20% off.
- **Design system:** Deep Violet #4A1D96 (primary), Warm Rose #F43F5E (accent), Golden Amber #F59E0B (rewards), Soft Cream #FFF8F0 (bg), Deep Charcoal #1A1A2E (text). Playfair Display (display) + Inter (body). 8px spacing grid. Lucide icons. WCAG 2.1 AA. Mobile-first.
- **Recipient experience requirements:** loads <3s on 4G, no login required, mobile-first, "Created with MemorableDay" attribution with "Create your own" CTA (viral loop), graceful expiration/404 states, password protection, replayable.
- **North Star Metric:** Memorable Moments Delivered (MMD) — experiences opened by recipients.
- **Roadmap phases:** Phase 0 Foundation (auth, DB, billing) → Phase 1 Core Product (builder, 3D, templates, sharing, personal dashboard, public website) → Phase 2 AI & Business (AI features, business dashboard, Shopify, automations, rewards, analytics) → Phase 3 Growth & Scale (referral, reminders, advanced blocks, white label, SEO content) → Phase 4 Premium & Enterprise (agency, API, SSO) → Phase 5 Platform & Ecosystem (marketplace, advanced AI/3D, mobile apps).
- **10X insights (ch. 31):** recipient experience performance is everything; build the Memory Layer; build the Relationship Graph; delay apology is the flagship business use case; optimize recipient-to-creator viral loop; occasion intelligence; simplify builder (Simple/Advanced modes); "MemorableDay Rose" as signature experience; businesses pay for outcomes (ROI data).

## Current Project State
- Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite) project initialized at /home/z/my-project.
- No application code written yet — awaiting user's explicit build instructions ("Don't Build until I said").

## Next Steps
- Wait for the user to specify what to build.
