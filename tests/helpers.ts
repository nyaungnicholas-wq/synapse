import { vi } from "vitest";
import { db } from "@/lib/db";
import type { GenerationSide } from "@/generated/prisma/enums";

/*
 * Shared test helpers. Tests hit a real Postgres test database (see tests/global-setup.ts).
 * Next.js request APIs are mocked so Server Actions can be called like plain functions.
 */

export async function resetDb() {
  await db.$executeRawUnsafe(
    `TRUNCATE TABLE "EmailOutbox","Report","Notification","Subscription","Plan","Memory","Photo","ActivityNote","ActivitySession","PromptFavorite","PromptResponse","Conversation","ActivityStep","Activity","Collection","Prompt","Category","Invitation","ConnectionMember","Connection","AuthToken","Session","Profile","User" CASCADE`,
  );
}

export async function seedPlans() {
  await db.plan.createMany({
    data: [
      { code: "FREE", name: "Free", priceCents: 0, features: [], weeklyPromptLimit: 3, weeklyActivityLimit: 1, memoryLimit: 30 },
      { code: "PREMIUM", name: "Premium", priceCents: 799, features: [] },
    ],
  });
}

let counter = 0;
const unique = () => `${Date.now().toString(36)}${(counter++).toString(36)}`;

/** An onboarded, verified user with a profile. */
export async function createUser(opts: { name?: string; side?: GenerationSide; premium?: boolean; role?: "USER" | "ADMIN" } = {}) {
  const name = opts.name ?? `User${unique()}`;
  const user = await db.user.create({
    data: {
      email: `${name.toLowerCase()}-${unique()}@test.local`,
      emailVerifiedAt: new Date(),
      role: opts.role ?? "USER",
      profile: {
        create: {
          firstName: name,
          ageRange: opts.side === "YOUNGER" ? "AGE_18_29" : "AGE_65_79",
          relationshipType: "GRANDPARENT_GRANDCHILD",
          side: opts.side ?? "OLDER",
          connectWithLabel: "my person",
          interests: [],
          goals: ["TALK_MORE_OFTEN"],
          onboardedAt: new Date(),
        },
      },
    },
    include: { profile: true },
  });
  if (opts.premium) {
    await db.subscription.create({ data: { userId: user.id, planCode: "PREMIUM", status: "ACTIVE", provider: "MOCK" } });
  }
  return user as typeof user & { profile: NonNullable<typeof user.profile> };
}

/** A Connection Space with `a` (and `b`, if given) as members. */
export async function createSpace(a: { id: string }, b?: { id: string }) {
  return db.connection.create({
    data: {
      members: {
        create: [{ userId: a.id, side: "OLDER" as const }, ...(b ? [{ userId: b.id, side: "YOUNGER" as const }] : [])],
      },
    },
  });
}

export async function createCategory(kind: "PROMPT" | "ACTIVITY" = "PROMPT") {
  return db.category.create({ data: { kind, slug: `cat-${unique()}`, name: "Category", status: "PUBLISHED" } });
}

export async function createPrompt(opts: { isPremium?: boolean; status?: "DRAFT" | "PUBLISHED"; categoryId?: string } = {}) {
  const categoryId = opts.categoryId ?? (await createCategory("PROMPT")).id;
  return db.prompt.create({
    data: { categoryId, text: `Question ${unique()}?`, status: opts.status ?? "PUBLISHED", isPremium: opts.isPremium ?? false },
  });
}

export async function createActivity(opts: { isPremium?: boolean; steps?: number } = {}) {
  const category = await createCategory("ACTIVITY");
  const steps = opts.steps ?? 3;
  return db.activity.create({
    data: {
      slug: `act-${unique()}`,
      title: "Activity",
      summary: "Summary",
      description: "Description",
      categoryId: category.id,
      estimatedMinutes: 20,
      reflectionQuestion: "What did you learn?",
      status: "PUBLISHED",
      isPremium: opts.isPremium ?? false,
      steps: { create: Array.from({ length: steps }, (_, i) => ({ order: i + 1, title: `Step ${i + 1}`, body: "Do it." })) },
    },
  });
}

export function form(fields: Record<string, string | string[] | File>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach((x) => fd.append(k, x));
    else fd.append(k, v);
  }
  return fd;
}

/** Thrown by the mocked redirect()/notFound() so tests can assert where an action went. */
export class RedirectSignal extends Error {
  constructor(public url: string) {
    super(`REDIRECT ${url}`);
  }
}

/** Runs an action that is expected to redirect and returns the destination URL. */
export async function expectRedirect(run: () => Promise<unknown>): Promise<string> {
  try {
    await run();
  } catch (e) {
    if (e instanceof RedirectSignal) return e.url;
    throw e;
  }
  throw new Error("Expected a redirect, but the action returned normally");
}

/**
 * The signed-in user for mocked session helpers. Set it with `signIn(user)` in a test.
 * Test files must declare the mocks themselves (vi.mock is hoisted per file):
 *   vi.mock("next/cache", () => nextCacheMock);
 *   vi.mock("next/navigation", () => nextNavigationMock);
 *   vi.mock("next/headers", () => nextHeadersMock);
 *   vi.mock("@/lib/session", async (orig) => sessionMock(await orig()));
 */
export const auth: { user: Awaited<ReturnType<typeof createUser>> | null } = { user: null };
export const signIn = (user: Awaited<ReturnType<typeof createUser>> | null) => {
  auth.user = user;
};

export const nextCacheMock = { revalidatePath: vi.fn(), revalidateTag: vi.fn() };
export const nextNavigationMock = {
  redirect: (url: string) => {
    throw new RedirectSignal(url);
  },
  notFound: () => {
    throw new RedirectSignal("/404");
  },
};
const jar = new Map<string, string>();
export const nextHeadersMock = {
  headers: async () => new Headers({ "x-forwarded-for": "127.0.0.1" }),
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
    has: (name: string) => jar.has(name),
  }),
};

export function sessionMock(original: Record<string, unknown>) {
  const need = () => {
    if (!auth.user) throw new RedirectSignal("/login");
    return auth.user;
  };
  return {
    ...original,
    getCurrentUser: async () => auth.user,
    requireUser: async () => need(),
    requireOnboardedUser: async () => need(),
    requireAdmin: async () => {
      const u = need();
      if (u.role !== "ADMIN") throw new RedirectSignal("/unauthorized");
      return u;
    },
  };
}
