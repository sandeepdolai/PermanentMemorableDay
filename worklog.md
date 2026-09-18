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
- **Domain:** memorableday.in (UPDATED 2026-09-18, was memorableday.online) | Primary market: United States + India (INR supported) | Tagline: "Make Every Moment Memorable."
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
  14. **Payments** — Dodo Payments (Merchant of Record) (UPDATED 2026-09-18, was Lemon Squeezy), products/prices per plan, webhook-driven entitlement sync (payment.succeeded, subscription.active, subscription.plan_changed, etc.), AI credit top-ups.
- **Pricing:** Free (Starter), Personal $9/mo, Pro $19/mo | Business $49/mo, Growth $99/mo, Agency $249/mo, Enterprise custom. Annual ~20% off.
- **Design system (UPDATED 2026-09-18):** System Blue #007AFF (primary), Jet Black #1D1D1F (text), Cool Gray #AAAAAA (muted), Off-White #F5F5F7 (background), White #FFFFFF (elevated surfaces). Inter/SF Pro (display + body — Playfair Display removed). 8px spacing grid. Lucide icons. WCAG 2.1 AA. Mobile-first. Reference UI: pill search bar "What's the theme?", theme hero cards (24px radius, soft shadows), floating pill bottom nav (Home/Create/Explore/Gallery/Profile, active = blue pill). Reference images: /home/z/my-project/docs/design-reference/.
- **Recipient experience requirements:** loads <3s on 4G, no login required, mobile-first, "Created with MemorableDay" attribution with "Create your own" CTA (viral loop), graceful expiration/404 states, password protection, replayable.
- **North Star Metric:** Memorable Moments Delivered (MMD) — experiences opened by recipients.
- **Roadmap phases:** Phase 0 Foundation (auth, DB, billing) → Phase 1 Core Product (builder, 3D, templates, sharing, personal dashboard, public website) → Phase 2 AI & Business (AI features, business dashboard, Shopify, automations, rewards, analytics) → Phase 3 Growth & Scale (referral, reminders, advanced blocks, white label, SEO content) → Phase 4 Premium & Enterprise (agency, API, SSO) → Phase 5 Platform & Ecosystem (marketplace, advanced AI/3D, mobile apps).
- **10X insights (ch. 31):** recipient experience performance is everything; build the Memory Layer; build the Relationship Graph; delay apology is the flagship business use case; optimize recipient-to-creator viral loop; occasion intelligence; simplify builder (Simple/Advanced modes); "MemorableDay Rose" as signature experience; businesses pay for outcomes (ROI data).

## Current Project State
- Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite) project initialized at /home/z/my-project.
- No application code written yet — awaiting user's explicit build instructions ("Don't Build until I said").

## Next Steps
- Wait for the user to specify what to build.

---
Task ID: 1
Agent: Z.ai Code (main orchestrator)
Task: Update the PRD per user's instructions: (1) exact color palette from uploaded image, (2) UI/UX reference page from uploaded image, (3) payment gateway Lemon Squeezy → Dodo Payments, (4) domain memorableday.online → memorableday.in. Then push to GitHub.

Work Log:
- Analyzed uploaded images with VLM: `828d26e3a34a102ae34119cc58d5222c.jpg` = color palette page with EXACT codes (#F5F5F7, #1D1D1F, #AAAAAA, #007AFF — Apple Modern palette); `file_000000001d2882118fdd4967233523ed.png` = reference UI page (mobile-first app: pill search bar "What's the theme?" with blue circular submit button, theme hero image cards w/ 24px radius + soft shadows, floating pill bottom nav Home/Create/Explore/Gallery/Profile with active state in blue).
- Verified Dodo Payments facts via web search + docs (docs.dodopayments.com): Merchant of Record, pricing 4% + $0.40 (+1.5% intl, +0.5% subs), concepts (Business/Product/Price/Customer/Subscription/Payment/Payment Link/Webhook), webhook event catalog (payment.succeeded/failed, subscription.active/cancelled/expired/paused/unpaused/plan_changed/renewed/past_due/on_hold/update_payment_method, dunning.started/recovered, refund.succeeded, dispute.opened), Standard Webhooks signature verification, hosted customer portal, UPI support, discount codes, one-time payment links.
- Applied to /home/z/my-project/docs/MemorableDay_PRD.md (the full 32-file combined PRD):
  1. Domain: 95× memorableday.online → memorableday.in (incl. app. subdomain + support@ email).
  2. Payment gateway: 55× Lemon Squeezy → Dodo Payments + filename refs 17-payments-lemon-squeezy-entitlements.md → 17-payments-dodo-payments-entitlements.md; rewrote §37.1 concepts table (Store→Business, Variant→Price, Order→Payment); §37.2 Variants→Prices; §37.3 checkout flow (payment link, metadata param, payment.succeeded + subscription.active webhooks); §37.4 full webhook event table with real Dodo events; §37.5 lifecycle flows (plan_changed, dunning.recovered, subscription.expired); §36.3 added UPI + local methods; §36.5 INR secondary currency; §37.9 one-time payment links + payment.succeeded; fee table 4% + $0.40; gift cards via discount codes; PRD index entry updated.
  3. Color system §48.2: replaced old palette (Deep Violet/Warm Rose/Golden Amber/Soft Cream/Deep Charcoal) with EXACT palette from image: System Blue #007AFF (primary), Jet Black #1D1D1F (text), Cool Gray #AAAAAA (muted), Off-White #F5F5F7 (background) + White #FFFFFF surface; added exact design tokens block; Info color aligned to #007AFF; added PRD-UX-104/105 (exact palette enforcement).
  4. UI/UX reference §48.1.1 (new section): full reference UI spec (pill search bar "What's the theme?", hero image cards, floating pill bottom nav Home/Create/Explore/Gallery/Profile, elevation style, typography style) + PRD-UX-106/107/108.
  5. Typography §48.3: Display font Playfair Display (serif) → Inter/SF Pro Display (modern sans-serif) to match Apple-modern reference.
- Copied reference images to /home/z/my-project/docs/design-reference/ (color-palette-exact-codes.jpg, ui-reference-main-page.png).
- Created full change patch: /tmp/prd_changes.patch (631 lines, 91 hunks). Backup of original: /tmp/PRD_backup_original.md.
- GitHub push BLOCKED: repo sandeepdolai/NewMemorableday is PRIVATE and the GitHub Classic Token from the previous session was truncated during session continuation (only "ghp_f6ze..." prefix retained; full token not on disk). Need user to re-share token to push.

Stage Summary:
- ALL 4 requested PRD changes are COMPLETE in the local authoritative copy: /home/z/my-project/docs/MemorableDay_PRD.md.
- Payment gateway section is now factually accurate for Dodo Payments (real event names, concepts, pricing).
- Design system now locked to the exact uploaded palette (#007AFF/#1D1D1F/#AAAAAA/#F5F5F7) with reference UI spec.
- PENDING: git push to github.com/sandeepdolai/NewMemorableday — requires the user to re-provide the GitHub token (previous one was lost in session continuation; also recommend rotating it since it was shared in chat).

---
Task ID: 1-b
Agent: Z.ai Code (main orchestrator)
Task: Push updated PRD to github.com/sandeepdolai/NewMemorableday (user re-provided GitHub token).

Work Log:
- User re-provided the GitHub Classic Token for account sandeepdolai.
- Ran /home/z/my-project/docs/push-prd-to-github.sh — cloned the repo, copied the updated PRD over "MemorableDay_docs_prd_ALL_32_FILES (1).md", added design-reference/ images, committed, and pushed to main.
- Commit: 58019c5 "Update PRD: Dodo Payments (was Lemon Squeezy), memorableday.in domain (was .online), exact color palette (#007AFF/#1D1D1F/#AAAAAA/#F5F5F7), reference UI/UX spec" (3 files changed, 247 insertions, 203 deletions).
- Verified live on GitHub via API + raw file check: Dodo Payments 56 refs, memorableday.in 96 refs, 0 Lemon Squeezy leftovers, 0 .online leftovers, #007AFF palette 8 refs, §48.1.1 Reference UI section present, design tokens present.
- Cleaned up the temporary clone (/tmp/NewMemorableday-push). Token NOT stored on disk (passed as script argument only).

Stage Summary:
- PRD update task 100% COMPLETE and pushed to GitHub (commit 58019c5 on main).
- Repo now contains: updated PRD (Dodo Payments, memorableday.in, exact palette #007AFF/#1D1D1F/#AAAAAA/#F5F5F7, §48.1.1 reference UI spec, Inter typography) + design-reference/ folder with both reference images.
- Recommended next step: user to give build instructions (PRD is finalized). Security: recommend user rotate the GitHub token since it was shared in chat.

---
Task ID: 2
Agent: Z.ai Code (main orchestrator)
Task: Build the MemorableDay website UI/UX only (user instruction: NO themed templates like Birthday/Halloween — build only the website UI/UX, using the iOS 26/27 design language with iOS system fonts).

Work Log:
- Built the complete app UI in iOS "Liquid Glass" design language with the exact locked palette (#007AFF primary, #1D1D1F text, #AAAAAA muted, #F5F5F7 background, #FFFFFF surfaces) and SF Pro system font stack (-apple-system → Inter fallback via next/font, self-hosted).
- Files created:
  - src/app/globals.css — design tokens (palette mapped into shadcn CSS vars), glass utilities (.glass-panel, .card-shadow, .float-shadow, .pill-shadow, .hairline, .no-scrollbar), iOS letter-spacing.
  - src/app/layout.tsx — Inter font + MemorableDay metadata + theme color.
  - src/lib/mock-data.ts — abstract UI preview data (moments, explore items, plans, suggestions — deliberately NO themed content).
  - src/components/memorableday/md-context.tsx — app context (tab, query, search, notify, sheets).
  - cover-art.tsx — deterministic Apple-wallpaper-style gradient covers (10 palettes).
  - bits.tsx — LargeTitle, SectionHeader, StatusBadge, LogoMark, EmptyState.
  - segmented-control.tsx — iOS segmented control w/ sliding thumb (layoutId).
  - search-bar.tsx — signature "What's the theme?" pill search + blue circular submit + suggestions dropdown + backdrop.
  - bottom-nav.tsx — floating pill nav (Home/Create/Explore/Gallery/Profile), active item = blue capsule w/ sliding animation (PRD-UX-107).
  - bottom-sheet.tsx — iOS sheet w/ grabber + drag-to-dismiss.
  - app-shell.tsx — shell: top chrome (search on Home/Explore; compact title on scroll for others — iOS large-title behavior), view transitions (AnimatePresence), dark glass toast, Create-start sheet, Pricing sheet (Dodo Payments note).
  - views/home-view.tsx — greeting, featured hero (reference layout: art left + uppercase bold headline right), stats, Continue Creating drafts w/ progress, Recent Moments list, dark promo card.
  - views/create-view.tsx — New Experience card + sheet (blank/AI-assisted), 10 PRD scene blocks grid, AI Creator promo.
  - views/explore-view.tsx — segmented (Trending/New/Editor's Picks), query filter + clear chip, 2-col cards w/ views/likes, empty state.
  - views/gallery-view.tsx — filter chips (All/Drafts/Scheduled/Sent/Archived), 2-col grid w/ status badges, empty state.
  - views/profile-view.tsx — identity card, stats, upgrade banner → pricing sheet, iOS grouped settings (toggles via shadcn Switch w/ iOS green), Sign Out.
  - src/app/page.tsx — ambient desktop background (gradient blobs) + centered 480px app column.
- Fixed 1 ESLint error (setState-in-effect for greeting → requestAnimationFrame).
- Verified end-to-end with agent-browser (390×844 mobile + 1440×900 desktop):
  - All 5 tabs switch correctly; nav pill animates; aria-current set.
  - Search "neon" → Explore with filter bar, 1 matching card; segment switch + Clear works (6 cards).
  - Create sheet: AI-assisted select → Start Creating → toast. Pricing sheet: Pro select → Continue → "Checkout preview — Pro plan via Dodo Payments" toast.
  - Gallery: All=8 cards, Archived=1 (correct), badges render.
  - Profile: toggle Email updates → toast; switches flip (aria-checked).
  - Compact title: hidden at top, visible after scroll (Gallery tab).
  - Desktop: 480px column centered, ambient blobs visible, no overflow.
  - ZERO page errors, ZERO console errors. VLM visual QA passed on Home, Explore, Pricing, Profile, Desktop screenshots.

Stage Summary:
- Website UI/UX build COMPLETE and browser-verified. iOS design language (Liquid Glass, SF Pro stack, exact #007AFF palette), reference layout implemented (pill search, floating pill bottom nav, hero cards).
- Deliberately NO themed templates (no Birthday/Halloween experiences) — abstract placeholder content only, per user instruction.
- All interactions are UI-only (mock data, toasts, sheets) — no backend yet.
- Files: src/components/memorableday/* (10 files), src/lib/mock-data.ts, updated globals.css/layout.tsx/page.tsx.
- Next-phase candidates: real backend (Prisma models, experience builder canvas, auth, Dodo Payments checkout API), recipient experience route, 3D scenes.

---
Task ID: 3
Agent: Z.ai Code (cron webDevReview — 15-minute review cycle, round 1)
Task: Scheduled review: QA the app, then continue development (fix bugs / add features / polish styling).

Work Log:
- QA pass on existing build: cycled all 5 tabs via agent-browser, 0 page errors, 0 console errors. (One false alarm: h1/nav mismatch was AnimatePresence exit animation mid-transition — resolves in ~600ms, by design.)
- NEW FEATURE — Recipient Experience Player (the product's core UI, PRD §recipient experience):
  - New file src/components/memorableday/moment-player.tsx — full-screen immersive 4-scene player:
    1. Intro scene — full-bleed CoverArt + "MemorableDay presents" + title + dedication
    2. Message scene — dark bg with radial glows + bold copy
    3. Gift reveal scene — tap-to-open CSS gift box (floating, lid + bow spring animation) + 28-particle confetti burst + heart reveal
    4. Signature scene — LogoMark + dedication + "Created with MemorableDay" + "Create your own moment" CTA (viral loop → Create tab) + Replay
  - Scene progress dots (animated elongated pill), close (X) button, Escape-to-close, "Tap to continue" pulsing hint, slide scene transitions.
  - Entry points wired: Home "Recent Moments" rows, Gallery grid cards (dedication "For {recipient}"), Explore cards (dedication "By {creator}") — context extended with openMoment(PlayerPayload).
  - Top chrome adapts to scene: dark glass on art scenes, light glass (white/80 + hairline) on light final scene (fixed VLM-detected contrast issue).
- Config fix: added allowedDevOrigins (sandbox preview proxy host) to next.config.ts to silence cross-origin dev warning and keep Preview Panel assets reliable.
- Lint: clean. QA via agent-browser: full player flow (open → advance ×2 → gift open → reveal → final → Create-CTA navigation & Replay) all verified; Gallery/Explore/Home entries all open the player; zero errors.

Stage Summary:
- App remains stable; new flagship UI (Moment Player) complete and verified end-to-end.
- Still UI-only (mock data, no backend, no themed content — abstract moments per user instruction).
- Open polish ideas for next rounds: skeleton loading states, notifications sheet (bell in chrome), animated stat count-ups, more scene block previews, share sheet UI (QR/link), settings sub-pages.
- Unresolved risks: none critical. Note: agent-browser `find text` occasionally reports a covered element for grid cards (locator quirk); ref-based clicks work — treat as tooling artifact, not app bug.
