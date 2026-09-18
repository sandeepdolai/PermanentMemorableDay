"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArchiveRestore,
  BarChart3,
  Copy,
  Eye,
  MoreHorizontal,
  Pencil,
  Send,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import type { MomentStatus } from "@/lib/mock-data";
import type { ClientMoment } from "@/lib/md-types";
import { CoverArt } from "../cover-art";
import { EmptyState, LargeTitle, SkeletonCard, StatusBadge } from "../bits";
import { useSkeleton } from "../use-skeleton";
import { useMD, type UserDraft } from "../md-context";
import { MomentMenu, RenameDialog, type MomentMenuAction } from "../moment-menu";
import { cn } from "@/lib/utils";

type Filter = "all" | MomentStatus;

type GalleryItem =
  | ({ kind: "moment" } & ClientMoment)
  | ({ kind: "user-draft" } & UserDraft);

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
  { value: "archived", label: "Archived" },
];

export function GalleryView() {
  const {
    openMoment,
    openBuilder,
    openShare,
    openStats,
    drafts: userDrafts,
    deleteDraft,
    saveDraft,
    renameDraft,
    duplicateDraft,
    toggleArchived,
    moments,
    ready,
    sendMoment,
    notify,
  } = useMD();
  const [filter, setFilter] = useState<Filter>("all");
  const loading = useSkeleton(filter) || !ready;

  // --- transient menu / dialog state ---------------------------------
  /** item + anchor element of the card whose action menu is open */
  const [menu, setMenu] = useState<{ item: GalleryItem; anchor: HTMLElement } | null>(null);
  /** draft pending rename (dialog state) */
  const [renaming, setRenaming] = useState<UserDraft | null>(null);
  /** draft pending send — the recipient dialog is open */
  const [sending, setSending] = useState<UserDraft | null>(null);
  const [sendingBusy, setSendingBusy] = useState(false);

  /** Deletes one of the user's own drafts — toast offers Undo (re-inserts it) */
  const removeDraft = (d: UserDraft) => {
    deleteDraft(d.id);
    notify(`“${d.title}” deleted`, {
      label: "Undo",
      onClick: () => {
        saveDraft(d);
        notify(`“${d.title}” restored`);
      },
    });
  };

  /** Server-synced status is the single source of truth now */
  const statusOf = (m: ClientMoment): MomentStatus => m.status;
  const isUserDraftMoment = (m: ClientMoment) => m.source === "user" && m.status === "draft";

  const items = useMemo<GalleryItem[]>(() => {
    const user: GalleryItem[] = userDrafts.map((d) => ({ kind: "user-draft", ...d }));
    const rest = moments.filter((m) => !isUserDraftMoment(m)).map((m) => ({ kind: "moment" as const, ...m }));
    if (filter === "draft") {
      return [...user, ...rest.filter((m) => m.status === "draft")];
    }
    if (filter === "archived") return rest.filter((m) => m.status === "archived");
    if (filter === "all") {
      return [...user, ...rest.filter((m) => m.status !== "archived")];
    }
    return rest.filter((m) => m.status === filter);
  }, [filter, userDrafts, moments]);

  const liveCount = userDrafts.length + moments.filter((m) => !isUserDraftMoment(m) && m.status !== "archived").length;
  const inProgress = userDrafts.length + moments.filter((m) => m.source === "seed" && m.status === "draft").length;

  /** Builds the action list for a card's ellipsis menu */
  const menuActions = (it: GalleryItem): MomentMenuAction[] => {
    if (it.kind === "user-draft") {
      return [
        { id: "rename", label: "Rename", icon: Pencil, tint: "#007AFF", onSelect: () => setRenaming(it) },
        {
          id: "send",
          label: "Send now",
          icon: Send,
          tint: "#30D158",
          onSelect: () => setSending(it),
        },
        {
          id: "duplicate",
          label: "Duplicate",
          icon: Copy,
          tint: "#64D2FF",
          onSelect: () => {
            const copy = duplicateDraft(it.id);
            if (copy) {
              notify(`“${copy.title}” created`, {
                label: "Open",
                onClick: () =>
                  openBuilder({ title: copy.title, cover: copy.cover, scenes: copy.scenes, draftId: copy.id }),
              });
            }
          },
        },
        { id: "share", label: "Share", icon: Share2, tint: "#30D158", onSelect: () => openShare({ id: it.id, title: it.title }) },
        { id: "sep", label: "", icon: Pencil, separator: true },
        {
          id: "delete",
          label: "Delete draft",
          icon: Trash2,
          tint: "#FF375F",
          destructive: true,
          onSelect: () => removeDraft(it),
        },
      ];
    }
    // Seeded moments — actions follow the effective status
    const status = statusOf(it);
    if (status === "archived") {
      return [
        ...(it.views
          ? [
              {
                id: "stats",
                label: "View insights",
                icon: BarChart3,
                tint: "#AF52DE",
                onSelect: () =>
                  openStats({
                    id: it.id,
                    title: it.title,
                    cover: it.cover,
                    recipient: it.recipient,
                    date: it.date,
                    status,
                    views: it.views,
                    completion: it.completion ?? "—",
                    scenes: it.scenes,
                    loves: it.loves,
                  }),
              } satisfies MomentMenuAction,
            ]
          : []),
        { id: "share", label: "Share", icon: Share2, tint: "#30D158", onSelect: () => openShare({ id: it.id, title: it.title, ...(it.shareSlug ? { slug: it.shareSlug } : {}) }) },
        {
          id: "unarchive",
          label: "Unarchive",
          icon: ArchiveRestore,
          tint: "#FF9F0A",
          onSelect: () => {
            toggleArchived(it.id);
            notify(`“${it.title}” restored to your Gallery`);
          },
        },
      ];
    }
    if (status === "draft") {
      return [
        {
          id: "edit",
          label: "Edit in Builder",
          icon: Pencil,
          tint: "#007AFF",
          onSelect: () => openBuilder({ title: it.title, cover: it.cover, scenes: it.scenes }),
        },
        { id: "share", label: "Share", icon: Share2, tint: "#30D158", onSelect: () => openShare({ id: it.id, title: it.title }) },
        {
          id: "archive",
          label: "Archive",
          icon: Archive,
          tint: "#8E8E93",
          onSelect: () => {
            toggleArchived(it.id);
            notify(`“${it.title}” archived`, {
              label: "Undo",
              onClick: () => {
                toggleArchived(it.id);
                notify(`“${it.title}” restored`);
              },
            });
          },
        },
      ];
    }
    // sent / viewed / scheduled
    return [
      ...(it.views
        ? [
            {
              id: "stats",
              label: "View insights",
              icon: BarChart3,
              tint: "#AF52DE",
              onSelect: () =>
                openStats({
                  id: it.id,
                  title: it.title,
                  cover: it.cover,
                  recipient: it.recipient,
                  date: it.date,
                  status,
                  views: it.views,
                  completion: it.completion ?? "—",
                  scenes: it.scenes,
                  loves: it.loves,
                }),
            } satisfies MomentMenuAction,
          ]
        : []),
      { id: "share", label: "Share", icon: Share2, tint: "#30D158", onSelect: () => openShare({ id: it.id, title: it.title, ...(it.shareSlug ? { slug: it.shareSlug } : {}) }) },
      {
        id: "archive",
        label: "Archive",
        icon: Archive,
        tint: "#8E8E93",
        onSelect: () => {
          toggleArchived(it.id);
          notify(`“${it.title}” archived`, {
            label: "Undo",
            onClick: () => {
              toggleArchived(it.id);
              notify(`“${it.title}” restored`);
            },
          });
        },
      },
    ];
  };

  return (
    <div className="px-5 pb-36 pt-[88px] md:px-8 md:pb-16 lg:px-10">
      <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5">
      <header className="flex items-end justify-between gap-3">
        <div>
          <LargeTitle>Gallery</LargeTitle>
          <p className="mt-1.5 text-[15px] text-[#AAAAAA]">
            {liveCount} moments · {inProgress} in progress
          </p>
        </div>
      </header>

      {/* Filter chips */}
      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 no-scrollbar">
        {FILTERS.map((f) => {
          const active = filter === f.value;
          return (
            <button
              key={f.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(f.value)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition-all active:scale-95",
                active
                  ? "bg-[#1D1D1F] text-white shadow-[0_8px_20px_-8px_rgba(29,29,31,0.5)]"
                  : "bg-white text-[#1D1D1F]/70 hairline card-shadow"
              )}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4" aria-hidden>
          {Array.from({ length: 4 }, (_, i) => (
            <SkeletonCard key={i} aspect="aspect-square" />
          ))}
        </div>
      ) : items.length === 0 ? (
        filter === "archived" ? (
          <EmptyState
            icon={<Archive size={26} aria-hidden />}
            title="Nothing archived"
            sub="Archive moments you're done with — they'll wait here quietly."
          />
        ) : (
          <EmptyState
            icon={<Archive size={26} aria-hidden />}
            title="Nothing here yet"
            sub="Moments you archive will live here. Finished ones can be archived from their menu."
          />
        )
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
          <AnimatePresence initial={false}>
          {items.map((it, idx) => {
            const isUser = it.kind === "user-draft";
            const status = isUser ? null : statusOf(it);
            const isDraft = isUser || (it.kind === "moment" && it.status === "draft");
            const isArchived = !isUser && status === "archived";
            const title = it.title;
            const cover = it.cover;
            const draftId = isUser ? it.id : undefined;
            const scenes = isUser ? Math.max(1, it.scenes) : it.scenes;
            const dateLine = isUser ? `${it.blocks} blocks · ${it.editedAt}` : `${it.date} · ${it.scenes} scenes`;
            return (
              <motion.div
                key={it.id}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.22 } }}
                transition={{ delay: Math.min(idx * 0.035, 0.25), duration: 0.3, ease: "easeOut" }}
                role="button"
                tabIndex={0}
                onClick={() =>
                  isArchived
                    ? openMoment({ id: it.id, title: it.title, cover: it.cover, dedication: `For ${it.recipient}` })
                    : isDraft
                      ? openBuilder({
                          title,
                          cover,
                          scenes,
                          ...(draftId ? { draftId } : {}),
                        })
                      : openMoment({ id: it.id, title: it.title, cover: it.cover, dedication: `For ${it.recipient}` })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    (e.currentTarget as HTMLDivElement).click();
                  }
                }}
                aria-label={`${title}, ${isArchived ? "archived — play moment" : isDraft ? "continue editing" : "play moment"}`}
                className={cn(
                  "card-shadow hairline lift cursor-pointer overflow-hidden rounded-[22px] bg-white text-left transition-transform active:scale-[0.97]",
                  isArchived && "opacity-75"
                )}
              >
                <CoverArt
                  variant={cover}
                  className={cn("aspect-square w-full", isArchived && "saturate-[0.45] opacity-80")}
                >
                  {isUser ? (
                    <span className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[#007AFF] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white shadow-[0_4px_12px_-2px_rgba(0,122,255,0.55)] backdrop-blur-md">
                      <Sparkles size={10} aria-hidden /> Mine
                    </span>
                  ) : it.kind === "moment" ? (
                    <StatusBadge status={statusOf(it)} className="absolute left-2.5 top-2.5 backdrop-blur-md" />
                  ) : null}
                  {!isUser && it.kind === "moment" && it.views ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openStats({
                          id: it.id,
                          title: it.title,
                          cover: it.cover,
                          recipient: it.recipient,
                          date: it.date,
                          status: statusOf(it),
                          views: it.views,
                          completion: it.completion ?? "—",
                          scenes: it.scenes,
                        });
                      }}
                      aria-label={`Insights for ${it.title} — ${it.views} views`}
                      className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-[#1D1D1F]/30 px-2 py-1 text-[10.5px] font-semibold text-white backdrop-blur-md transition-all hover:bg-[#1D1D1F]/45 active:scale-95"
                    >
                      <Eye size={11} aria-hidden /> {it.views}
                    </button>
                  ) : null}
                  {/* Card action menu trigger */}
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={`Actions for ${title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu({ item: it, anchor: e.currentTarget as HTMLElement });
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenu({ item: it, anchor: e.currentTarget as HTMLElement });
                      }
                    }}
                    className="absolute right-2.5 top-2.5 flex h-[30px] w-[30px] items-center justify-center rounded-full bg-white/85 text-[#1D1D1F]/75 shadow-[0_6px_16px_-6px_rgba(29,29,31,0.4)] backdrop-blur-md transition-all hover:bg-white hover:text-[#1D1D1F] active:scale-90"
                  >
                    <MoreHorizontal size={15} strokeWidth={2.4} aria-hidden />
                  </span>
                </CoverArt>
                <div className="p-3">
                  <p className="truncate text-[14.5px] font-bold tracking-[-0.015em] text-[#1D1D1F]">
                    {title}
                  </p>
                  <p className="mt-0.5 truncate text-[12px] text-[#AAAAAA]">{dateLine}</p>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </div>
      )}
      </div>

      {/* Card action popover (portal-rendered, anchored to the ellipsis) */}
      {menu ? <MomentMenu anchor={menu.anchor} actions={menuActions(menu.item)} onClose={() => setMenu(null)} /> : null}

      {/* Rename alert (iOS style) */}
      <RenameDialog
        open={renaming !== null}
        initialTitle={renaming?.title ?? ""}
        onCancel={() => setRenaming(null)}
        onConfirm={(title) => {
          if (renaming) {
            const old = renaming.title;
            renameDraft(renaming.id, title);
            notify(old === title ? "Name unchanged" : `Renamed to “${title}”`);
          }
          setRenaming(null);
        }}
      />

      {/* Send now — recipient alert (iOS style), real server send */}
      <RenameDialog
        open={sending !== null}
        title="Send this moment"
        description="Who is this experience for? They'll receive your link."
        placeholder="Recipient's name"
        confirmLabel="Send"
        initialTitle=""
        busy={sendingBusy}
        onCancel={() => {
          if (!sendingBusy) setSending(null);
        }}
        onConfirm={(recipient) => {
          const draft = sending;
          if (!draft) return;
          setSendingBusy(true);
          void sendMoment({
            id: draft.id,
            title: draft.title,
            cover: draft.cover,
            scenes: draft.scenes,
            blocks: draft.blocks,
            recipient,
          }).then((moment) => {
            setSendingBusy(false);
            setSending(null);
            if (moment) {
              notify(`Sent to ${recipient} — the link is live`);
              openShare({ id: moment.id, title: moment.title, ...(moment.shareSlug ? { slug: moment.shareSlug } : {}) });
            }
          });
        }}
      />
    </div>
  );
}
