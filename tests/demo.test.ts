import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { cleanupExpiredDemos, createDemoPair, demoPartnerId } from "@/lib/demo";
import { DEMO_CONVERSATIONS } from "@/lib/demo-content";
import { createInviteAction } from "@/actions/connections";
import { changePasswordAction } from "@/actions/account";
import { createActivity, createCategory, form, resetDb, seedPlans, signIn } from "./helpers";

vi.mock("next/cache", async () => (await import("./helpers")).nextCacheMock);
vi.mock("next/navigation", async () => (await import("./helpers")).nextNavigationMock);
vi.mock("next/headers", async () => (await import("./helpers")).nextHeadersMock);
vi.mock("@/lib/session", async (importOriginal) => (await import("./helpers")).sessionMock(await importOriginal()));

async function seedDemoContent() {
  for (const c of DEMO_CONVERSATIONS) {
    const category = await db.category.upsert({
      where: { kind_slug: { kind: "PROMPT", slug: c.category } },
      create: { kind: "PROMPT", slug: c.category, name: c.category, status: "PUBLISHED" },
      update: {},
    });
    await db.prompt.create({ data: { categoryId: category.id, text: c.text, status: "PUBLISHED" } });
  }
  for (const slug of ["then-vs-now", "recipe-swap"]) {
    const a = await createActivity({ steps: 3 });
    await db.activity.update({ where: { id: a.id }, data: { slug } });
  }
  await createCategory("PROMPT");
}

describe("one-click demo", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
    await seedDemoContent();
  });

  it("creates a private pair with ten weeks of history", async () => {
    const pair = await createDemoPair();
    const users = await db.user.findMany({ where: { id: { in: [pair.roseId, pair.leoId] } }, include: { profile: true } });
    expect(users.every((u) => u.isDemo && u.passwordHash === null && u.emailVerifiedAt)).toBe(true);
    expect(await db.connectionMember.count({ where: { connectionId: pair.connectionId } })).toBe(2);
    expect(await db.conversation.count({ where: { connectionId: pair.connectionId } })).toBe(6);
    expect(await db.conversation.count({ where: { connectionId: pair.connectionId, status: "IN_PROGRESS" } })).toBe(1);
    expect(await db.memory.count({ where: { connectionId: pair.connectionId } })).toBeGreaterThanOrEqual(6);
    expect(await db.activitySession.count({ where: { connectionId: pair.connectionId } })).toBe(2);
    expect(await db.notification.count({ where: { userId: pair.leoId, readAt: null } })).toBe(1);
  });

  it("two visitors get separate spaces that cannot see each other", async () => {
    const a = await createDemoPair();
    const b = await createDemoPair();
    expect(a.connectionId).not.toBe(b.connectionId);
    expect(await db.connectionMember.count({ where: { connectionId: a.connectionId, userId: b.leoId } })).toBe(0);
    expect(await demoPartnerId(a.leoId)).toBe(a.roseId);
    expect(await demoPartnerId(b.roseId)).toBe(b.leoId);
  });

  it("a real (non-demo) user has no demo partner to switch to", async () => {
    const pair = await createDemoPair();
    await db.user.update({ where: { id: pair.roseId }, data: { isDemo: false } });
    expect(await demoPartnerId(pair.roseId)).toBeNull();
  });

  it("expired demos and their spaces are deleted; fresh ones and real users stay", async () => {
    const old = await createDemoPair();
    const fresh = await createDemoPair();
    const realUser = await db.user.create({ data: { email: "real@test.local", createdAt: new Date(Date.now() - 3 * 86_400_000) } });
    await db.user.updateMany({ where: { id: { in: [old.roseId, old.leoId] } }, data: { createdAt: new Date(Date.now() - 2 * 86_400_000) } });
    expect(await cleanupExpiredDemos()).toBe(2);
    expect(await db.connection.findUnique({ where: { id: old.connectionId } })).toBeNull();
    expect(await db.memory.count({ where: { connectionId: old.connectionId } })).toBe(0);
    expect(await db.connection.findUnique({ where: { id: fresh.connectionId } })).not.toBeNull();
    expect(await db.user.findUnique({ where: { id: realUser.id } })).not.toBeNull();
  });

  it("demo accounts cannot send email invitations or set a password", async () => {
    const pair = await createDemoPair();
    const leo = await db.user.findUniqueOrThrow({ where: { id: pair.leoId }, include: { profile: true } });
    signIn(leo as Parameters<typeof signIn>[0]);
    const invite = await createInviteAction({}, form({ email: "someone@example.com" }));
    expect(invite.error).toMatch(/turned off in the demo/);
    expect(await db.emailOutbox.count()).toBe(0);
    const pw = await changePasswordAction({}, form({ password: "a-long-password", confirm: "a-long-password" }));
    expect(pw.error).toMatch(/Demo accounts/);
    expect((await db.user.findUniqueOrThrow({ where: { id: pair.leoId } })).passwordHash).toBeNull();
  });
});
