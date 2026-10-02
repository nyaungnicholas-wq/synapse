import "server-only";
import { db } from "@/lib/db";
import type { MemoryType } from "@/generated/prisma/enums";

/*
 * Read-side data for pages. Every function that takes `connectionId` assumes the caller has
 * ALREADY verified membership with requireSpace(); each query is still filtered by that
 * connectionId so an id from another space can never leak through.
 */

const authorSelect = { id: true, email: true, profile: { select: { firstName: true } } } as const;
const DAY = 24 * 60 * 60 * 1000;

function dayHash(seed: string): number {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

const today = () => new Date().toISOString().slice(0, 10);

/** "Today's conversation": same answer all day for both people, never one they already did. */
export async function getTodayPrompt(connectionId: string, premium: boolean) {
  const candidates = await db.prompt.findMany({
    where: {
      status: "PUBLISHED",
      ...(premium ? {} : { isPremium: false }),
      conversations: { none: { connectionId } },
      category: { status: "PUBLISHED" },
    },
    include: { category: true },
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
  });
  if (candidates.length === 0) return null;
  const featured = candidates.filter((p) => p.featured);
  const pool = featured.length ? featured : candidates;
  return pool[dayHash(connectionId + today()) % pool.length];
}

/** "Today's activity": this month's collection first, then featured, then anything not yet done. */
export async function getTodayActivity(connectionId: string, premium: boolean) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const candidates = await db.activity.findMany({
    where: {
      status: "PUBLISHED",
      ...(premium ? {} : { isPremium: false, NOT: { collection: { isPremium: true } } }),
      sessions: { none: { connectionId, status: "COMPLETED" } },
    },
    include: { category: true, collection: true, _count: { select: { steps: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (candidates.length === 0) return null;
  const inCollection = candidates.filter((a) => a.collection?.month.getTime() === monthStart.getTime());
  const featured = candidates.filter((a) => a.featured);
  const pool = inCollection.length ? inCollection : featured.length ? featured : candidates;
  return pool[dayHash(`${connectionId}a${today()}`) % pool.length];
}

/** Gentle progress numbers: totals, never streaks. */
export async function getProgress(connectionId: string) {
  const [conversationsCompleted, activitiesCompleted, memoriesCreated, members] = await Promise.all([
    db.conversation.count({ where: { connectionId, status: "COMPLETED" } }),
    db.activitySession.count({ where: { connectionId, status: "COMPLETED" } }),
    db.memory.count({ where: { connectionId } }),
    db.connectionMember.findMany({ where: { connectionId }, orderBy: { joinedAt: "asc" }, select: { joinedAt: true } }),
  ]);
  const connectedSince = members.length >= 2 ? members[1].joinedAt : null;
  const weeksConnected = connectedSince ? Math.floor((Date.now() - connectedSince.getTime()) / (7 * DAY)) + 1 : 0;
  return { conversationsCompleted, activitiesCompleted, memoriesCreated, weeksConnected, connectedSince };
}

export async function getInProgress(connectionId: string) {
  const [conversations, sessions] = await Promise.all([
    db.conversation.findMany({
      where: { connectionId, status: "IN_PROGRESS" },
      include: { prompt: { select: { text: true } }, _count: { select: { responses: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    db.activitySession.findMany({
      where: { connectionId, status: "IN_PROGRESS" },
      include: { activity: { select: { title: true, _count: { select: { steps: true } } } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);
  return { conversations, sessions };
}

export async function getRecentMemories(connectionId: string, take = 3) {
  return db.memory.findMany({
    where: { connectionId },
    include: { createdBy: { select: authorSelect }, category: true },
    orderBy: { createdAt: "desc" },
    take,
  });
}

export async function getSuggestedActivities(connectionId: string, premium: boolean, take = 3, excludeId?: string) {
  return db.activity.findMany({
    where: {
      status: "PUBLISHED",
      ...(premium ? {} : { isPremium: false, NOT: { collection: { isPremium: true } } }),
      sessions: { none: { connectionId } },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: { category: true },
    orderBy: [{ featured: "desc" }, { estimatedMinutes: "asc" }],
    take,
  });
}

/** This month's collection and anything announced for later months. */
export async function getCollections() {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const collections = await db.collection.findMany({
    where: { status: "PUBLISHED", month: { gte: monthStart } },
    include: { activities: { where: { status: "PUBLISHED" }, select: { id: true, title: true, slug: true } } },
    orderBy: { month: "asc" },
  });
  return {
    current: collections.find((c) => c.month.getTime() === monthStart.getTime()) ?? null,
    upcoming: collections.filter((c) => c.month > monthStart),
  };
}

export async function getUnreadNotifications(userId: string) {
  return db.notification.findMany({ where: { userId, readAt: null }, orderBy: { createdAt: "desc" }, take: 6 });
}

export async function getPendingInvitations(userId: string) {
  return db.invitation.findMany({
    where: { inviterId: userId, status: "PENDING", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

// ---------- talk ----------

export async function listPromptCategories() {
  return db.category.findMany({
    where: { kind: "PROMPT", status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { prompts: { where: { status: "PUBLISHED" } } } } },
  });
}

/** A random prompt for the generator. `exclude` holds ids the person skipped this visit. */
export async function pickPrompt(opts: { connectionId: string; categorySlug?: string; exclude: string[]; premium: boolean }) {
  const where = {
    status: "PUBLISHED" as const,
    category: { status: "PUBLISHED" as const, ...(opts.categorySlug ? { slug: opts.categorySlug } : {}) },
    ...(opts.premium ? {} : { isPremium: false }),
    conversations: { none: { connectionId: opts.connectionId } },
    id: { notIn: opts.exclude },
  };
  const ids = await db.prompt.findMany({ where, select: { id: true } });
  if (ids.length === 0) return null;
  const pick = ids[Math.floor(Math.random() * ids.length)];
  return db.prompt.findUnique({ where: { id: pick.id }, include: { category: true } });
}

/** A specific prompt to keep on screen, only if this space could still start it. */
export async function getPinnedPrompt(connectionId: string, promptId: string, premium: boolean) {
  if (!/^[a-z0-9]{1,40}$/i.test(promptId)) return null;
  return db.prompt.findFirst({
    where: {
      id: promptId,
      status: "PUBLISHED",
      category: { status: "PUBLISHED" },
      ...(premium ? {} : { isPremium: false }),
      conversations: { none: { connectionId } },
    },
    include: { category: true },
  });
}

export async function listConversations(connectionId: string) {
  return db.conversation.findMany({
    where: { connectionId },
    include: { prompt: { include: { category: true } }, _count: { select: { responses: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listFavoritePrompts(userId: string) {
  return db.promptFavorite.findMany({
    where: { userId, prompt: { status: "PUBLISHED" } },
    include: { prompt: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function isFavorite(userId: string, promptId: string) {
  return Boolean(await db.promptFavorite.findUnique({ where: { userId_promptId: { userId, promptId } } }));
}

export async function getConversation(conversationId: string, connectionId: string) {
  return db.conversation.findFirst({
    where: { id: conversationId, connectionId },
    include: {
      prompt: { include: { category: true } },
      memory: { select: { id: true } },
      responses: { orderBy: { createdAt: "asc" }, include: { author: { select: authorSelect } } },
    },
  });
}

// ---------- activities ----------

export async function listActivityCategories() {
  return db.category.findMany({ where: { kind: "ACTIVITY", status: "PUBLISHED" }, orderBy: { sortOrder: "asc" } });
}

export async function listActivities(categorySlug?: string) {
  return db.activity.findMany({
    where: { status: "PUBLISHED", ...(categorySlug ? { category: { slug: categorySlug } } : {}) },
    include: { category: true, collection: true, _count: { select: { steps: true } } },
    orderBy: [{ featured: "desc" }, { title: "asc" }],
  });
}

/** activityId -> what this space has done with it. */
export async function activityStatusForSpace(connectionId: string) {
  const sessions = await db.activitySession.findMany({
    where: { connectionId },
    select: { id: true, activityId: true, status: true },
    orderBy: { createdAt: "desc" },
  });
  const map = new Map<string, { completed: boolean; inProgressSessionId: string | null }>();
  for (const s of sessions) {
    const entry = map.get(s.activityId) ?? { completed: false, inProgressSessionId: null };
    if (s.status === "COMPLETED") entry.completed = true;
    else entry.inProgressSessionId ??= s.id;
    map.set(s.activityId, entry);
  }
  return map;
}

export async function getActivityBySlug(slug: string) {
  return db.activity.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { category: true, collection: true, steps: { orderBy: { order: "asc" } } },
  });
}

export async function getActivitySession(sessionId: string, connectionId: string) {
  return db.activitySession.findFirst({
    where: { id: sessionId, connectionId },
    include: {
      activity: { include: { category: true, steps: { orderBy: { order: "asc" } } } },
      memory: { select: { id: true } },
      notes: { orderBy: { createdAt: "asc" }, include: { author: { select: authorSelect } } },
    },
  });
}

// ---------- memories ----------

export type MemoryFilters = { type?: MemoryType; personId?: string; categoryId?: string; activityId?: string; year?: number; favorite?: boolean };

export async function listMemories(connectionId: string, f: MemoryFilters) {
  return db.memory.findMany({
    where: {
      connectionId,
      ...(f.type ? { type: f.type } : {}),
      ...(f.personId ? { createdById: f.personId } : {}),
      ...(f.categoryId ? { categoryId: f.categoryId } : {}),
      ...(f.activityId ? { activityId: f.activityId } : {}),
      ...(f.favorite ? { favorite: true } : {}),
      ...(f.year ? { createdAt: { gte: new Date(Date.UTC(f.year, 0, 1)), lt: new Date(Date.UTC(f.year + 1, 0, 1)) } } : {}),
    },
    include: { createdBy: { select: authorSelect }, category: true, activity: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });
}

/** Options for the scrapbook filter bar, limited to what this space actually has. */
export async function memoryFilterOptions(connectionId: string) {
  const memories = await db.memory.findMany({
    where: { connectionId },
    select: {
      createdAt: true,
      category: { select: { id: true, name: true } },
      activity: { select: { id: true, title: true } },
    },
  });
  const categories = new Map<string, string>();
  const activities = new Map<string, string>();
  const years = new Set<number>();
  for (const m of memories) {
    if (m.category) categories.set(m.category.id, m.category.name);
    if (m.activity) activities.set(m.activity.id, m.activity.title);
    years.add(m.createdAt.getUTCFullYear());
  }
  return {
    categories: [...categories].map(([id, name]) => ({ id, name })),
    activities: [...activities].map(([id, title]) => ({ id, title })),
    years: [...years].sort((a, b) => b - a),
  };
}

export async function getMemory(memoryId: string, connectionId: string) {
  return db.memory.findFirst({
    where: { id: memoryId, connectionId },
    include: {
      createdBy: { select: authorSelect },
      category: true,
      activity: { select: { title: true, slug: true } },
      conversation: { select: { id: true } },
      activitySession: { select: { id: true } },
      photo: { select: { id: true } },
    },
  });
}

// ---------- billing ----------

export async function getBillingOverview(userId: string) {
  const [subscription, plans] = await Promise.all([
    db.subscription.findUnique({ where: { userId } }),
    db.plan.findMany({ where: { active: true }, orderBy: { priceCents: "asc" } }),
  ]);
  return { subscription, plans };
}
