/**
 * MemorableDay — shared client/server wire types.
 * No server-only imports here so both the API routes and client
 * components can depend on this module safely.
 */
import type { MomentStatus } from "@/lib/mock-data";
import type { SceneDoc, SongPick } from "@/lib/md-blocks";

/** Client-facing moment — the mock-data `Moment` plus real DB extras. */
export interface ClientMoment {
  id: string;
  title: string;
  recipient: string;
  status: MomentStatus;
  date: string;
  cover: number;
  scenes: number;
  views: number;
  completion: string | null;
  progress: number | null;
  tags: string[];
  loves: number;
  blocks: number;
  source: "seed" | "user";
  shareSlug: string | null;
  /** Authored experience document (null for pre-block moments) */
  sceneData: SceneDoc[] | null;
  /** Experience soundtrack pick (null when unset) */
  track: SongPick | null;
}

/** Payload for POST /api/md/moments/[id]/send */
export interface SendMomentPayload {
  id: string;
  title?: string;
  recipient?: string;
  cover?: number;
  scenes?: number;
  blocks?: number;
  /** Full authored scene document (blocks with content) */
  sceneData?: SceneDoc[];
  /** Soundtrack song pick */
  track?: SongPick | null;
  /** ISO date — presence switches the send to a schedule */
  scheduledFor?: string;
  /** Display label for scheduled sends ("Wed, Oct 22 · 9:00 AM") */
  label?: string;
}
