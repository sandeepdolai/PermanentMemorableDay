/**
 * MemorableDay — typed browser API client.
 * All calls are relative-path (same-origin) against the Next.js route handlers.
 */
import type { ClientMoment, SendMomentPayload } from "@/lib/md-types";
import type { SceneDoc, SongPick, SongResult } from "@/lib/md-blocks";
import type { AppNotification } from "@/lib/mock-data";

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!res.ok || data.ok === false) throw new Error(data.error || `Request failed: ${res.status}`);
  return data;
}

export interface BootstrapState {
  moments: ClientMoment[];
  notifications: AppNotification[];
  savedIds: string[];
  user?: { name: string; email: string; plan: string; credits: number };
}

/** One-shot hydrate (+ one-time localStorage migration). */
export function apiBootstrap(migrate?: {
  drafts?: unknown[];
  savedIds?: string[];
  archivedIds?: string[];
}): Promise<BootstrapState> {
  return req("/api/md/bootstrap", { method: "POST", body: JSON.stringify({ migrate }) });
}

/** Upsert a moment by client-supplied id (builder saves, Undo restores, duplicates). */
export function apiUpsertMoment(payload: {
  id: string;
  title?: string;
  recipient?: string;
  status?: string;
  cover?: number;
  scenes?: number;
  blocks?: number;
  progress?: number | null;
  dateLabel?: string;
  sceneData?: SceneDoc[] | null;
  track?: SongPick | null;
}): Promise<{ moment: ClientMoment }> {
  return req("/api/md/moments", { method: "POST", body: JSON.stringify(payload) });
}

export function apiPatchMoment(
  id: string,
  payload: { title?: string; recipient?: string; cover?: number; scenes?: number; blocks?: number; progress?: number | null; dateLabel?: string; archived?: boolean; sceneData?: SceneDoc[] | null; track?: SongPick | null }
): Promise<{ moment: ClientMoment }> {
  return req(`/api/md/moments/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function apiDeleteMoment(id: string): Promise<{ deleted: string }> {
  return req(`/api/md/moments/${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Send / schedule a moment — creates the share link + activity notification server-side. */
export function apiSendMoment(payload: SendMomentPayload): Promise<{ moment: ClientMoment }> {
  return req(`/api/md/moments/${encodeURIComponent(payload.id)}/send`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Recipient open tracking — returns null when the moment isn't trackable. */
export async function apiTrackView(id: string): Promise<ClientMoment | null> {
  try {
    const data = await req<{ tracked: boolean; moment?: ClientMoment }>(
      `/api/md/moments/${encodeURIComponent(id)}/view`,
      { method: "POST" }
    );
    return data.tracked && data.moment ? data.moment : null;
  } catch {
    return null;
  }
}

/** Recipient love tracking — returns the updated moment or null. */
export async function apiTrackLove(id: string): Promise<ClientMoment | null> {
  try {
    const data = await req<{ tracked: boolean; moment?: ClientMoment }>(
      `/api/md/moments/${encodeURIComponent(id)}/love`,
      { method: "POST" }
    );
    return data.tracked && data.moment ? data.moment : null;
  } catch {
    return null;
  }
}

export function apiListNotifications(): Promise<{ notifications: AppNotification[] }> {
  return req("/api/md/notifications");
}

export function apiUpsertNotification(n: AppNotification): Promise<{ notification: AppNotification }> {
  return req("/api/md/notifications", {
    method: "POST",
    body: JSON.stringify({
      id: n.id,
      kind: n.kind,
      title: n.title,
      body: n.body,
      timeLabel: n.time,
      group: n.group,
      unread: n.unread,
      momentId: n.moment?.id ?? null,
    }),
  });
}

export function apiMarkNotificationRead(id: string, unread = false): Promise<{ updated: string }> {
  return req(`/api/md/notifications/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify({ unread }),
  });
}

export function apiDismissNotification(id: string): Promise<{ deleted: string }> {
  return req(`/api/md/notifications/${encodeURIComponent(id)}`, { method: "DELETE" });
}

export function apiMarkAllNotificationsRead(): Promise<{ marked: number }> {
  return req("/api/md/notifications/read-all", { method: "POST" });
}

export function apiPutSavedTemplates(ids: string[]): Promise<{ savedIds: string[] }> {
  return req("/api/md/saved", { method: "PUT", body: JSON.stringify({ ids }) });
}

/** Spend (negative) or refill (positive) AI credits — returns the fresh user. */
export function apiAdjustCredits(creditsDelta: number): Promise<{ user: { name: string; email: string; plan: string; credits: number } }> {
  return req("/api/md/user", { method: "PATCH", body: JSON.stringify({ creditsDelta }) });
}

/* ------------------------------------------------------------------ */
/* Media + music                                                       */
/* ------------------------------------------------------------------ */

/** Uploads a photo/video/audio file — REAL request with progress, no mocks.
 *  Rejects with the server's error message when validation fails. */
export function apiUploadFile(file: File, onProgress?: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/md/upload");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((e.loaded / e.total) * 100)));
      }
    };
    xhr.onerror = () => reject(new Error("Network error — upload didn't reach the server"));
    xhr.ontimeout = () => reject(new Error("Upload timed out — try again"));
    xhr.onload = () => {
      const data = (xhr.response ?? {}) as { ok?: boolean; url?: string; error?: string };
      if (xhr.status >= 200 && xhr.status < 300 && data.ok && data.url) {
        if (onProgress) onProgress(100);
        resolve(data.url);
        return;
      }
      reject(new Error(data.error || `Upload failed (${xhr.status})`));
    };
    xhr.send(form);
  });
}

/** Searches the song catalog (iTunes today, Spotify when configured). */
export async function apiSearchMusic(q: string): Promise<SongResult[]> {
  const data = await req<{ songs: SongResult[] }>(
    `/api/md/music/search?q=${encodeURIComponent(q)}`
  );
  return data.songs;
}

/* ------------------------------------------------------------------ */
/* 3D gift boxes (Sketchfab library)                                   */
/* ------------------------------------------------------------------ */

export interface Gift3dModel {
  id: string;
  name: string;
  author: string;
  thumb: string;
  embedUrl: string;
  viewerUrl: string;
  views: number;
  likes: number;
  animated: boolean;
  downloadable: boolean;
}

/** Searches the live Sketchfab model library for 3D gift boxes. */
export async function apiSearchGift3d(
  q: string,
  cursor = 0
): Promise<{ models: Gift3dModel[]; nextCursor: number | null }> {
  const data = await req<{ models: Gift3dModel[]; nextCursor: number | null }>(
    `/api/md/gift3d?q=${encodeURIComponent(q)}&cursor=${cursor}`
  );
  return data;
}
