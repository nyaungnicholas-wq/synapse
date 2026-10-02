import { beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { db } from "@/lib/db";
import { safeNextPath } from "@/lib/session";
import { acceptInvitation, createInvitation, lookupInvitation } from "@/lib/invitations";
import { handleStripeEvent } from "@/lib/billing";
import { userIsPremium } from "@/lib/entitlements";
import { leaveSpaceAction } from "@/actions/connections";
import { goToStepAction, startActivityAction } from "@/actions/together";
import { createActivity, createSpace, createUser, expectRedirect, form, resetDb, seedPlans, signIn } from "./helpers";

vi.mock("next/cache", async () => (await import("./helpers")).nextCacheMock);
vi.mock("next/navigation", async () => (await import("./helpers")).nextNavigationMock);
vi.mock("next/headers", async () => (await import("./helpers")).nextHeadersMock);
vi.mock("@/lib/session", async (importOriginal) => (await import("./helpers")).sessionMock(await importOriginal()));

// Regression tests for the issues found in the fresh-context review.

describe("safeNextPath rejects every off-site form", () => {
  it.each(["/\t/evil.com", "/\n/evil.com", "/\\evil.com", "//evil.com", "/%2F/x", "https://evil.com", "javascript:alert(1)"])(
    "%j falls back or stays on-site",
    (next) => {
      const out = safeNextPath(next);
      expect(new URL(out, "http://synapse.local").origin).toBe("http://synapse.local");
      expect(out.startsWith("//")).toBe(false);
    },
  );
  it("keeps normal in-app paths with their query", () => {
    expect(safeNextPath("/spaces/abc/talk?category=music")).toBe("/spaces/abc/talk?category=music");
  });
});

describe("spaces after someone leaves", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  it("a closed space cannot take a new member, so a newcomer never sees the leaver's history", async () => {
    const a = await createUser({ name: "Ada" });
    const b = await createUser({ name: "Ben", side: "YOUNGER" });
    const c = await createUser({ name: "Cal", side: "YOUNGER" });
    const space = await createSpace(a, b);
    await db.memory.create({ data: { connectionId: space.id, createdById: a.id, type: "STORY", title: "Ada's private story" } });

    signIn(a);
    expect(await expectRedirect(() => leaveSpaceAction(form({ connectionId: space.id })))).toContain("left-space");
    const closed = await db.connection.findUniqueOrThrow({ where: { id: space.id } });
    expect(closed.closedAt).not.toBeNull();
    expect(closed.status).toBe("ACTIVE"); // Ben keeps his history

    // Ben cannot invite anyone into the closed space...
    await expect(createInvitation({ inviterId: b.id, inviterSide: "YOUNGER", connectionId: space.id })).rejects.toThrow();
    // ...and an invitation that already existed for it cannot be used.
    const stale = await db.invitation.create({
      data: { connectionId: space.id, inviterId: b.id, code: "WXYZ-2345", expiresAt: new Date(Date.now() + 86_400_000) },
    });
    expect((await lookupInvitation(stale.code))?.state).toBe("revoked");
    const result = await acceptInvitation(stale.code, c.id);
    expect(result.ok).toBe(false);
    expect(await db.connectionMember.count({ where: { connectionId: space.id, userId: c.id } })).toBe(0);
  });

  it("the same two people get their existing space instead of a second one", async () => {
    const a = await createUser({ name: "Ada" });
    const b = await createUser({ name: "Ben", side: "YOUNGER" });
    const existing = await createSpace(a, b);
    const inv = await createInvitation({ inviterId: a.id, inviterSide: "OLDER" });
    const result = await acceptInvitation(inv.code, b.id);
    expect(result).toEqual({ ok: true, connectionId: existing.id, alreadyMember: true });
    expect(await db.connection.count({ where: { status: "ACTIVE", members: { some: { userId: b.id } } } })).toBe(1);
  });
});

describe("billing webhooks out of order", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  const event = (type: string, id: string, status: string, userId: string) =>
    ({
      type,
      data: {
        object: {
          id,
          status,
          customer: "cus_1",
          cancel_at_period_end: false,
          metadata: { userId },
          items: { data: [{ current_period_end: Math.floor(Date.now() / 1000) + 30 * 86_400 }] },
        },
      },
    }) as unknown as Stripe.Event;

  it("an old subscription's cancellation does not cancel the current one", async () => {
    const u = await createUser();
    await handleStripeEvent(event("customer.subscription.updated", "sub_new", "active", u.id));
    await handleStripeEvent(event("customer.subscription.deleted", "sub_old", "canceled", u.id));
    expect(await userIsPremium(u.id)).toBe(true);
    expect((await db.subscription.findUniqueOrThrow({ where: { userId: u.id } })).stripeSubscriptionId).toBe("sub_new");
  });
});

describe("activities", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  it("pressing Next saves the note typed on that step", async () => {
    const a = await createUser();
    const space = await createSpace(a, await createUser({ side: "YOUNGER" }));
    const activity = await createActivity({ steps: 3 });
    const session = await db.activitySession.create({ data: { connectionId: space.id, activityId: activity.id, startedById: a.id } });
    signIn(a);
    await expectRedirect(() => goToStepAction(form({ sessionId: session.id, step: "2", stepOrder: "1", body: "  We both had paper rounds.  " })));
    const notes = await db.activityNote.findMany({ where: { sessionId: session.id } });
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ stepOrder: 1, body: "We both had paper rounds." });
    expect((await db.activitySession.findUniqueOrThrow({ where: { id: session.id } })).currentStep).toBe(2);
  });

  it("an activity in a Premium collection needs Premium even if the activity itself is not marked", async () => {
    const a = await createUser();
    const space = await createSpace(a, await createUser({ side: "YOUNGER" }));
    const activity = await createActivity({ isPremium: false });
    const collection = await db.collection.create({
      data: { slug: "premium-pack", title: "Pack", description: "d", month: new Date(), isPremium: true, status: "PUBLISHED" },
    });
    await db.activity.update({ where: { id: activity.id }, data: { collectionId: collection.id } });
    signIn(a);
    const url = await expectRedirect(() => startActivityAction(form({ connectionId: space.id, activityId: activity.id })));
    expect(url).toContain("blocked=premium");
    expect(await db.activitySession.count()).toBe(0);
  });
});
