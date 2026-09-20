/**
 * /api/md/ai/compose — AI message composer (PRD AI system).
 *
 * POST { brief, tone } → { ok, messages: [string, string, string] }
 *
 * Real LLM generation via z-ai-web-dev-sdk (backend only). The brief is the
 * user's description of the moment ("who is it for, what should it feel
 * like"); the tone is one of the five PRD tones (heartfelt / playful /
 * poetic / minimal / bold). Returns exactly three distinct message options,
 * each a self-contained scene-opener of 1–3 sentences.
 */
import ZAI from "z-ai-web-dev-sdk";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The five PRD composer tones, with voice directions for the model. */
const TONE_DIRECTIONS: Record<string, string> = {
  heartfelt:
    "warm, sincere and personal — say the thing you'd only say out loud once, softly. No clichés like 'I just wanted to say'.",
  playful:
    "light, funny and a little cheeky — treat the message like a friendly tease. One light joke or playful warning is welcome.",
  poetic:
    "lyrical and image-rich — short sentences that behave like poetry. Lead with one concrete image, not an abstraction.",
  minimal:
    "spare and precise — say the most with the least. Short declarative sentences. No filler words, no preamble.",
  bold:
    "confident and declarative — big energy, zero apologies, like a headline. Address the recipient directly.",
};

const VALID_TONES = Object.keys(TONE_DIRECTIONS);

/** Pulls the first JSON array of strings out of a model reply. */
function parseMessageArray(raw: string): string[] {
  const text = raw.trim();
  // Strip a markdown code fence if the model added one.
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    const parsed = JSON.parse(unfenced);
    if (Array.isArray(parsed)) {
      const msgs = parsed
        .map((m) => (typeof m === "string" ? m.trim() : ""))
        .filter((m) => m.length > 0)
        .slice(0, 3);
      if (msgs.length === 3) return msgs;
    }
  } catch {
    // fall through to brace/bracket extraction
  }
  // Last resort: grab anything between the first [ and last ].
  const start = unfenced.indexOf("[");
  const end = unfenced.lastIndexOf("]");
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(unfenced.slice(start, end + 1));
      if (Array.isArray(parsed)) {
        const msgs = parsed
          .map((m) => (typeof m === "string" ? m.trim() : ""))
          .filter((m) => m.length > 0)
          .slice(0, 3);
        if (msgs.length === 3) return msgs;
      }
    } catch {
      /* give up below */
    }
  }
  return [];
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { brief?: string; tone?: string };
  const brief = (body.brief ?? "").trim().slice(0, 400);
  const tone = body.tone && VALID_TONES.includes(body.tone) ? body.tone : "heartfelt";

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
            "You write short openers for an interactive greeting experience — a mobile app where a sender arranges scenes (messages, photos, gifts, songs, reveals) that a recipient taps through one by one. " +
            `Write in a ${TONE_DIRECTIONS[tone]} ` +
            "Respond with ONLY a JSON array of exactly 3 strings — no numbering, no quotes around the array, no explanation. " +
            "Rules for every message: 1–3 sentences, max 320 characters; it opens the experience, so it should build a little anticipation for what follows; write it as the sender speaking to the recipient by their feeling, never insert placeholder names in brackets — if the brief names a person, address them naturally; each of the 3 must take a clearly different angle; plain text only, no emoji, no quotes at the start/end.",
        },
        {
          role: "user",
          content: `The moment: ${brief}\nTone: ${tone}\nWrite the 3 openers now as a JSON array of strings.`,
        },
      ],
      thinking: { type: "disabled" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const messages = parseMessageArray(raw);

    if (messages.length !== 3) {
      console.error("[api/md/ai/compose] unparsable reply:", raw.slice(0, 300));
      return Response.json({ ok: false, error: "The AI reply was unreadable — try again" }, { status: 502 });
    }

    return Response.json({ ok: true, messages });
  } catch (e) {
    console.error("[api/md/ai/compose]", e);
    return Response.json({ ok: false, error: "AI is busy right now — try again in a moment" }, { status: 502 });
  }
}
