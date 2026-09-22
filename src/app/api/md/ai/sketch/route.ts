/**
 * /api/md/ai/sketch — AI Creator (describe the moment → a full experience).
 *
 * POST { brief } → { ok, title, cover, scenes }
 *
 * Real LLM generation via z-ai-web-dev-sdk (backend only). Produces a
 * complete authored document — 3 scenes of typed blocks with real copy —
 * validated against the app's block catalogue so the builder can open it
 * directly. Only blocks that render meaningfully without user-uploaded media
 * are allowed (text / gift / flower / countdown / quiz / reward / cta /
 * confetti / audio — coupon stays hidden until its later-phase relaunch),
 * and the JSON is repaired/sanitized before it ships.
 */
import ZAI from "z-ai-web-dev-sdk";
import type { BlockData, BlockDoc, SceneDoc } from "@/lib/md-blocks";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

/** Block types the sketch may emit (no media-dependent ones — no photo/video/background). */
const ALLOWED_TYPES = [
  "text",
  "gift",
  "flower",
  "countdown",
  "quiz",
  "reward",
  "cta",
  "confetti",
  "audio",
  "letter",
  "openwhen",
  "album",
  "fireworks",
] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

interface SketchBlock {
  type?: string;
  body?: unknown;
  message?: unknown;
  minutes?: unknown;
  question?: unknown;
  options?: unknown;
  answer?: unknown;
  rewardKind?: unknown;
  code?: unknown;
  label?: unknown;
  action?: unknown;
  url?: unknown;
  style?: unknown;
  flower?: unknown;
  heading?: unknown;
  stepLabel?: unknown;
  song?: unknown;
  signature?: unknown;
  items?: unknown;
}

interface SketchScene {
  blocks?: unknown;
}

interface SketchReply {
  title?: unknown;
  cover?: unknown;
  scenes?: unknown;
}

const str = (v: unknown, max = 300): string | undefined => {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  return t ? t.slice(0, max) : undefined;
};

const num = (v: unknown, min: number, max: number): number | undefined => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : undefined;
};

/**
 * Repairs a truncated JSON document: walks back from the end to the last
 * position that closes a complete value, trims a dangling comma, and appends
 * the missing closers for the still-open brackets. Returns null when no cut
 * point yields parseable JSON.
 */
function repairTruncatedJson(text: string): unknown | null {
  // String-aware open-bracket stack for a prefix of `text`.
  const scan = (s: string): { stack: string[]; inString: boolean } | null => {
    const stack: string[] = [];
    let inString = false;
    let esc = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (inString) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inString = false;
        continue;
      }
      if (c === '"') inString = true;
      else if (c === "{" || c === "[") stack.push(c);
      else if (c === "}" || c === "]") {
        const open = stack.pop();
        if (open === undefined) return null; // closers outnumber openers — unusable prefix
      }
    }
    return { stack, inString };
  };

  // Candidate cut points: positions right after a value ends.
  for (let cut = text.length - 1; cut >= 0; cut--) {
    const c = text[cut];
    if (c !== "}" && c !== "]" && c !== '"') continue;
    const prefix = text.slice(0, cut + 1);
    const state = scan(prefix);
    if (!state || state.inString || state.stack.length === 0) continue;
    // Trim a trailing comma (or whitespace then comma) — dangling separators are invalid.
    let trimmed = prefix.replace(/[\s,]+$/, "");
    const st2 = scan(trimmed);
    if (!st2 || st2.stack.length === 0) continue;
    const closers = st2.stack
      .slice()
      .reverse()
      .map((o) => (o === "{" ? "}" : "]"))
      .join("");
    try {
      return JSON.parse(trimmed + closers);
    } catch {
      // try an earlier cut point
    }
  }
  return null;
}

/** Parses the model reply, tolerating markdown fences and truncated output. */
function parseSketchReply(raw: string): SketchReply | null {
  const unfenced = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(unfenced) as SketchReply;
  } catch {
    /* try extraction / repair below */
  }
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start !== -1 && end > start) {
    try {
      return JSON.parse(unfenced.slice(start, end + 1)) as SketchReply;
    } catch {
      /* fall through to repair */
    }
  }
  const repaired = repairTruncatedJson(unfenced.slice(start !== -1 ? start : 0));
  return repaired ? (repaired as SketchReply) : null;
}

/** Turns one raw model block into a typed BlockDoc with sanitized data. */
function sanitizeBlock(raw: SketchBlock, idx: number, sceneNo: number): BlockDoc | null {
  const type = (typeof raw.type === "string" ? raw.type : "").toLowerCase() as AllowedType;
  if (!ALLOWED_TYPES.includes(type)) return null;
  const id = `bAi${sceneNo}_${idx + 1}`;
  const data: BlockData = {};

  switch (type) {
    case "text": {
      const body = str(raw.body, 280) ?? str(raw.message, 280);
      if (!body) return null;
      data.body = body;
      break;
    }
    case "gift": {
      data.message = str(raw.message, 90) ?? "A little something for you.";
      break;
    }
    case "countdown": {
      data.minutes = num(raw.minutes, 1, 30) ?? 3;
      break;
    }
    case "quiz": {
      const question = str(raw.question, 140);
      const opts = Array.isArray(raw.options)
        ? raw.options.map((o) => str(o, 60)).filter((o): o is string => !!o).slice(0, 4)
        : [];
      if (!question || opts.length < 2) return null;
      const answer = num(raw.answer, 0, opts.length - 1) ?? 0;
      data.question = question;
      data.options = opts;
      data.answer = answer;
      break;
    }
    case "reward": {
      data.rewardKind = str(raw.rewardKind, 40) ?? "Gift card";
      data.code = str(raw.code, 24) ?? "GIFT-20";
      break;
    }
    case "flower": {
      data.flower = "bouquet";
      const note = str(raw.message, 220);
      if (note) data.message = note;
      break;
    }
    case "cta": {
      data.label = str(raw.label, 40) ?? "See more";
      const url = str(raw.url, 200);
      if (url && /^https?:\/\//i.test(url)) data.url = url;
      break;
    }
    case "confetti": {
      break; // celebration — no config needed
    }
    case "audio": {
      break; // song picked later by the user in the editor
    }
    case "letter": {
      const body = str(raw.body, 600) ?? str(raw.message, 600);
      if (!body) return null;
      data.body = body;
      const sig = str(raw.signature, 40);
      if (sig) data.signature = sig;
      break;
    }
    case "openwhen": {
      const itemsRaw = Array.isArray(raw.items) ? raw.items : [];
      const items = itemsRaw
        .map((it, i) => {
          const o = (it ?? {}) as { label?: unknown; message?: unknown };
          const label = str(o.label, 60);
          const message = str(o.message, 320);
          return label && message ? { id: `ow${sceneNo}_${idx + 1}_${i + 1}`, label, message } : null;
        })
        .filter((it): it is { id: string; label: string; message: string } => it !== null)
        .slice(0, 6);
      if (items.length < 2) return null;
      data.openWhenItems = items;
      break;
    }
    case "album": {
      const title = str(raw.title, 40) ?? str(raw.albumTitle, 40);
      if (title) data.albumTitle = title;
      // The AI can't attach photos — it seeds note pages the sender fleshes
      // out with photos + voice in the editor.
      const pagesRaw = Array.isArray(raw.pages) ? raw.pages : [];
      const pages = pagesRaw
        .map((p, i) => {
          const o = (p ?? {}) as { message?: unknown };
          const message = str(o.message, 220);
          return message ? { id: `alb${sceneNo}_${idx + 1}_${i + 1}`, message } : null;
        })
        .filter((p): p is { id: string; message: string } => p !== null)
        .slice(0, 8);
      if (pages.length > 0) data.albumPages = pages;
      const ending = str(raw.ending, 200) ?? str(raw.albumEnding, 200);
      if (ending) data.albumEnding = ending;
      const sig = str(raw.signature, 40);
      if (sig) data.albumSignature = sig;
      break;
    }
    case "fireworks": {
      const msg = str(raw.message, 160);
      if (msg) data.message = msg;
      break;
    }
  }

  return { id, type, data };
}

/** Validates/repairs the whole reply into a safe SceneDoc[]. */
function sanitizeScenes(reply: SketchReply): SceneDoc[] {
  const scenesRaw = Array.isArray(reply.scenes) ? reply.scenes : [];
  const scenes: SceneDoc[] = [];
  for (const sRaw of scenesRaw.slice(0, 10)) {
    const s = (sRaw ?? {}) as SketchScene;
    const blocksRaw = Array.isArray(s.blocks) ? s.blocks : [];
    const blocks = blocksRaw
      .map((b, i) => sanitizeBlock((b ?? {}) as SketchBlock, i, scenes.length + 1))
      .filter((b): b is BlockDoc => b !== null);
    if (blocks.length > 0) scenes.push({ id: `sAi${scenes.length + 1}`, blocks });
  }
  return scenes;
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { brief?: string };
  const brief = (body.brief ?? "").trim().slice(0, 400);

  if (!brief) {
    return Response.json({ ok: false, error: "Describe the moment first" }, { status: 400 });
  }

  try {
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        {
          role: "assistant",
          content:
            "You are an experience designer for a mobile greeting app. A sender describes a moment; you design a short interactive experience the recipient taps through scene by scene. " +
            "Respond with ONLY valid compact JSON (no markdown fence, no newlines needed, no commentary) shaped exactly like: " +
            '{"title": string, "cover": number, "scenes": [{"blocks": [{"type": string, ...fields}]}]}\n\n' +
            "RULES:\n" +
            "- title: max 40 chars, no surrounding quotes, capture the occasion (e.g. \"For Priya's Birthday\").\n" +
            "- cover: integer 0–9 choosing cover art (0 birthday, 1 love, 2 celebration, 3 travel, 4 nature, 5 minimal light, 6 night sky, 7 gradient warm, 8 ocean, 9 aurora).\n" +
            "- scenes: 3 to 6, as many as the story needs (a quick hello needs 3; an anniversary journey can use 5–6). Ordered as the recipient taps through. Each scene has up to 3 blocks. Keep the whole JSON compact — short field values.\n" +
            "- Allowed block types and fields:\n" +
            '  · {"type":"text","body": string} — a message, 1–2 sentences, max 220 chars. The FIRST scene must start with a text block addressing the recipient directly.\n' +
            '  · {"type":"gift","message": string} — a wrapped gift that opens to reveal a short note, max 90 chars.\n' +
            '  · {"type":"flower","message": string} — a still 3D rose bouquet with the sender\'s note printed on an elegant card beneath it (message optional, max 220 chars; at most once, for love/gratitude/apology moments).\n' +
            '  · {"type":"countdown","minutes": number 1–30} — a timed lock building anticipation (at most once).\n' +
            '  · {"type":"quiz","question": string, "options": [string ×2–4], "answer": 0-based index} — a fun question about the sender/recipient or the occasion.\n' +
            '  · {"type":"reward","rewardKind": string like \"Coffee on me\", "code": string like \"NIGHT-OUT\"} — a redeemable treat in a golden ticket.\n' +
            '  · {"type":"cta","label": string like \"See the full album\", "url": "https://…"} — an action button (omit url if there is no real link).\n' +
            '  · {"type":"confetti"} — a celebration burst; use exactly once, as the FINAL block of the FINAL scene.\n' +
            '  · {"type":"audio"} — a song placeholder the sender picks later (at most once).\n' +
            '  · {"type":"letter","body": string, "signature": string} — a letter that types itself out live, character by character (at most once; for deep heartfelt moments; body max 500 chars).\n' +
            '  · {"type":"openwhen","items": [{"label": string like "Open when you miss me", "message": string} ×3–6]} — sealed letters the recipient opens by mood, one per envelope.\n' +
            '  · {"type":"album","title": string, "pages": [{"message": string} ×2–6], "ending": string, "signature": string} — a photo book with spreads that turn like real paper; the sender later adds photos + voice notes (at most once, for milestone moments).\n' +
            '  · {"type":"fireworks","message": string} — a night sky that bursts on every tap, the message rising after the third burst (at most once, as the closing finale).\n' +
            "- Write all copy as the sender speaking to the recipient — warm, specific to the brief, no [placeholders], no emoji.\n" +
            "- Include at least one interactive block (gift / quiz / reward / countdown / openwhen) in the middle scene.\n" +
            "- Milestone moments (anniversaries, a partner's birthday, long-distance love) should consider an album, a letter, or openwhen letters — the keepsake blocks.\n" +
            "- Finish the JSON completely. Never leave it open.",
        },
        {
          role: "user",
          content: `Design the experience for this moment: ${brief}`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const reply = parseSketchReply(raw);

    if (!reply) {
      console.error("[api/md/ai/sketch] unparsable reply:", raw.slice(0, 400));
      return Response.json({ ok: false, error: "The AI sketch was unreadable — try again" }, { status: 502 });
    }

    const scenes = sanitizeScenes(reply);
    if (scenes.length === 0) {
      console.error("[api/md/ai/sketch] no usable scenes:", JSON.stringify(reply).slice(0, 400));
      return Response.json({ ok: false, error: "The AI sketch came back empty — try again" }, { status: 502 });
    }

    const title = str(reply.title, 40) ?? "Untitled Experience";
    const cover = num(reply.cover, 0, 9) ?? 5;

    return Response.json({ ok: true, title, cover, scenes });
  } catch (e) {
    console.error("[api/md/ai/sketch]", e);
    return Response.json({ ok: false, error: "AI is busy right now — try again in a moment" }, { status: 502 });
  }
}
