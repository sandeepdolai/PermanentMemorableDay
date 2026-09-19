# MemorableDay — Make Every Moment Memorable

An iOS-inspired SaaS platform for creating, sending, and tracking **Interactive Moment Experiences (IME)** — personalized, interactive digital moments your recipients remember.

Personal or business: birthdays, anniversaries, apologies, post-purchase thank-yous, shipping journeys, VIP milestones — built scene by scene, no code.

## Highlights

- **Experience Builder** — stack scenes from 11 block types: Text, Photo, Video, Audio, Background (full-screen cover), 3D Gift, Countdown, Quiz, Reward, Button, Confetti
- **Real media uploads** — files are POSTed to a real API endpoint, validated server-side (magic-byte sniffing, size caps, renamed-file rejection), persisted to disk, and served back with correct content types + HTTP Range support
- **Instagram-Notes-style music picker** — search real songs, pick the exact snippet that plays; or upload your own audio
- **Moment player** — recipients walk scenes with reveals, gates (quiz/gift/countdown), loves and views tracked
- **Real backend** — Prisma + SQLite persistence for moments, drafts, notifications, saved templates, share links
- **Command palette (⌘K)**, undo/redo, drafts, scheduling, share links
- iOS-style design system: SF-style type, liquid glass, hairline borders, spring physics

## Tech Stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4** + shadcn/ui · **Framer Motion**
- **Prisma ORM** (SQLite) · real REST API routes under `/api/md/*`

## Getting Started

```bash
bun install
bun run db:push     # create the SQLite schema
bun run dev         # start on http://localhost:3000
```

A demo user with seeded moments and notifications is created on first request.

## Project Layout

```
prisma/            Prisma schema (SQLite)
db/                local database file (gitignored)
storage/uploads/   persistent user uploads (gitignored, served via API)
src/app/           routes + API endpoints (/api/md/*)
src/components/    memorableday/ app components (builder, player, views…)
src/lib/           shared client/server libs (md-blocks, md-storage, md-client, md-server)
```

## Upload API

| Endpoint | Description |
|---|---|
| `POST /api/md/upload` | multipart `file` field → validates (type + magic bytes + 16 MB cap) → stores under `storage/uploads/<uuid>.<ext>` → `{ ok, url, kind, bytes }` |
| `GET /api/md/files/[name]` | serves a stored upload: content-type, ETag, immutable cache, single-part `Range` support |

## License

Proprietary — © MemorableDay
