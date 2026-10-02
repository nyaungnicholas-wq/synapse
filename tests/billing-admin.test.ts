import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { activateMockPremium, cancelMockPremium, handleStripeEvent, mapStripeStatus } from "@/lib/billing";
import { getSpacePlan, userIsPremium } from "@/lib/entitlements";
import { confirmMockCheckoutAction, upgradeAction } from "@/actions/account";
import { deletePromptAction, saveActivityAction, savePromptAction, setPromptStatusAction, setUserStatusAction } from "@/actions/admin";
import { createCategory, createSpace, createUser, expectRedirect, form, resetDb, seedPlans, signIn } from "./helpers";
import type Stripe from "stripe";

vi.mock("next/cache", async () => (await import("./helpers")).nextCacheMock);
vi.mock("next/navigation", async () => (await import("./helpers")).nextNavigationMock);
vi.mock("next/headers", async () => (await import("./helpers")).nextHeadersMock);
vi.mock("@/lib/session", async (importOriginal) => (await import("./helpers")).sessionMock(await importOriginal()));

describe("billing: mock premium lifecycle", () => {
  beforeEach(async () => { await resetDb(); await seedPlans(); });

  it("activateMockPremium creates ACTIVE PREMIUM subscription with MOCK provider and ~30 day period end", async () => {
    const user = await createUser();
    await activateMockPremium(user.id);
    const sub = await db.subscription.findUnique({ where: { userId: user.id } });
    expect(sub).not.toBeNull();
    expect(sub!.planCode).toBe("PREMIUM");
    expect(sub!.status).toBe("ACTIVE");
    expect(sub!.provider).toBe("MOCK");
    expect(sub!.currentPeriodEnd).toBeInstanceOf(Date);
    const days = (sub!.currentPeriodEnd!.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    expect(days).toBeGreaterThan(29);
    expect(days).toBeLessThan(31);
  });

  it("userIsPremium becomes true after activateMockPremium", async () => {
    const user = await createUser();
    expect(await userIsPremium(user.id)).toBe(false);
    await activateMockPremium(user.id);
    expect(await userIsPremium(user.id)).toBe(true);
  });

  it("getSpacePlan returns PREMIUM for space shared with free partner when one user is premium", async () => {
    const premiumUser = await createUser();
    const freeUser = await createUser();
    await activateMockPremium(premiumUser.id);
    const space = await createSpace(premiumUser, freeUser);
    const plan = await getSpacePlan(space.id);
    expect(plan.code).toBe("PREMIUM");
  });

  it("cancelMockPremium makes userIsPremium false and getSpacePlan FREE", async () => {
    const user = await createUser();
    await activateMockPremium(user.id);
    expect(await userIsPremium(user.id)).toBe(true);
    await cancelMockPremium(user.id);
    expect(await userIsPremium(user.id)).toBe(false);
    const space = await createSpace(user);
    const plan = await getSpacePlan(space.id);
    expect(plan.code).toBe("FREE");
  });
});

describe("billing: account actions", () => {
  beforeEach(async () => { await resetDb(); await seedPlans(); });

  it("confirmMockCheckoutAction redirects to /billing?status=success and user becomes premium", async () => {
    const user = await createUser();
    signIn(user);
    const url = await expectRedirect(() => confirmMockCheckoutAction());
    expect(url).toBe("/billing?status=success");
    expect(await userIsPremium(user.id)).toBe(true);
  });

  it("upgradeAction redirects free user to /billing/mock-checkout", async () => {
    const user = await createUser();
    signIn(user);
    const url = await expectRedirect(() => upgradeAction());
    expect(url).toBe("/billing/mock-checkout");
  });
});

describe("billing: mapStripeStatus", () => {
  it("maps active->ACTIVE, trialing->TRIALING, past_due->PAST_DUE, unpaid->PAST_DUE, canceled->CANCELED, incomplete_expired->CANCELED", () => {
    expect(mapStripeStatus("active")).toBe("ACTIVE");
    expect(mapStripeStatus("trialing")).toBe("TRIALING");
    expect(mapStripeStatus("past_due")).toBe("PAST_DUE");
    expect(mapStripeStatus("unpaid")).toBe("PAST_DUE");
    expect(mapStripeStatus("canceled")).toBe("CANCELED");
    expect(mapStripeStatus("incomplete_expired")).toBe("CANCELED");
  });
});

describe("billing: handleStripeEvent", () => {
  beforeEach(async () => { await resetDb(); await seedPlans(); });

  it("customer.subscription.updated upserts STRIPE subscription with ACTIVE status", async () => {
    const user = await createUser();
    const periodEnd = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000);
    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          status: "active",
          customer: "cus_1",
          cancel_at_period_end: false,
          metadata: { userId: user.id },
          items: { data: [{ current_period_end: periodEnd }] },
        },
      },
    } as unknown as Stripe.Event;
    await handleStripeEvent(event);
    const sub = await db.subscription.findUnique({ where: { userId: user.id } });
    expect(sub).not.toBeNull();
    expect(sub!.provider).toBe("STRIPE");
    expect(sub!.stripeSubscriptionId).toBe("sub_123");
    expect(sub!.status).toBe("ACTIVE");
  });

  it("replaying the same event leaves exactly one subscription row", async () => {
    const user = await createUser();
    const periodEnd = Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000);
    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          status: "active",
          customer: "cus_1",
          cancel_at_period_end: false,
          metadata: { userId: user.id },
          items: { data: [{ current_period_end: periodEnd }] },
        },
      },
    } as unknown as Stripe.Event;
    await handleStripeEvent(event);
    await handleStripeEvent(event);
    const count = await db.subscription.count({ where: { userId: user.id } });
    expect(count).toBe(1);
  });

  it("customer.subscription.deleted with status canceled makes userIsPremium false", async () => {
    const user = await createUser();
    await activateMockPremium(user.id);
    expect(await userIsPremium(user.id)).toBe(true);
    const event = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
          status: "canceled",
          customer: "cus_1",
          cancel_at_period_end: true,
          metadata: { userId: user.id },
          items: { data: [] },
        },
      },
    } as unknown as Stripe.Event;
    await handleStripeEvent(event);
    expect(await userIsPremium(user.id)).toBe(false);
  });

  it("event with non-existent metadata.userId creates nothing", async () => {
    const event = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_999",
          status: "active",
          customer: "cus_999",
          cancel_at_period_end: false,
          metadata: { userId: "non-existent-id" },
          items: { data: [{ current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000) }] },
        },
      },
    } as unknown as Stripe.Event;
    await handleStripeEvent(event);
    const count = await db.subscription.count({ where: { stripeSubscriptionId: "sub_999" } });
    expect(count).toBe(0);
  });
});

describe("admin: permission boundary", () => {
  beforeEach(async () => { await resetDb(); await seedPlans(); });

  it("normal USER calling savePromptAction rejects with /unauthorized and nothing changes", async () => {
    const user = await createUser();
    const category = await createCategory("PROMPT");
    signIn(user);
    const url = await expectRedirect(() => savePromptAction({}, form({ categoryId: category.id, text: "Test?", audience: "ANYONE", status: "PUBLISHED" })));
    expect(url).toBe("/unauthorized");
    const count = await db.prompt.count();
    expect(count).toBe(0);
  });

  it("normal USER calling setUserStatusAction rejects with /unauthorized and nothing changes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const user = await createUser();
    signIn(user);
    const url = await expectRedirect(() => setUserStatusAction(form({ userId: admin.id, status: "SUSPENDED" })));
    expect(url).toBe("/unauthorized");
    const target = await db.user.findUnique({ where: { id: admin.id } });
    expect(target!.status).toBe("ACTIVE");
  });

  it("normal USER calling deletePromptAction rejects with /unauthorized and nothing changes", async () => {
    const user = await createUser();
    const category = await createCategory("PROMPT");
    const prompt = await db.prompt.create({ data: { categoryId: category.id, text: "Test?", status: "PUBLISHED" } });
    signIn(user);
    const url = await expectRedirect(() => deletePromptAction(form({ id: prompt.id })));
    expect(url).toBe("/unauthorized");
    const still = await db.prompt.findUnique({ where: { id: prompt.id } });
    expect(still).not.toBeNull();
  });
});

describe("admin: ADMIN actions", () => {
  beforeEach(async () => { await resetDb(); await seedPlans(); });

  it("ADMIN savePromptAction with valid PROMPT category creates prompt and redirects to /admin/prompts?notice=saved", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory("PROMPT");
    signIn(admin);
    const url = await expectRedirect(() => savePromptAction({}, form({ categoryId: category.id, text: "New prompt?", audience: "ANYONE", status: "PUBLISHED" })));
    expect(url).toBe("/admin/prompts?notice=saved");
    const count = await db.prompt.count({ where: { categoryId: category.id } });
    expect(count).toBe(1);
  });

  it("ADMIN savePromptAction with ACTIVITY category id returns fieldErrors.categoryId", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const activityCat = await createCategory("ACTIVITY");
    signIn(admin);
    const result = await savePromptAction({}, form({ categoryId: activityCat.id, text: "Test?", audience: "ANYONE", status: "PUBLISHED" }));
    expect(result.fieldErrors?.categoryId).toBeDefined();
  });

  it("ADMIN setPromptStatusAction toggles prompt to DRAFT", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory("PROMPT");
    const prompt = await db.prompt.create({ data: { categoryId: category.id, text: "Test?", status: "PUBLISHED" } });
    signIn(admin);
    await setPromptStatusAction(form({ id: prompt.id, status: "DRAFT" }));
    const updated = await db.prompt.findUnique({ where: { id: prompt.id } });
    expect(updated!.status).toBe("DRAFT");
  });

  it("ADMIN setUserStatusAction SUSPENDED on another user sets status SUSPENDED and deletes sessions", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const target = await createUser();
    await db.session.create({ data: { userId: target.id, tokenHash: "hash", expiresAt: new Date(Date.now() + 86400000) } });
    signIn(admin);
    await setUserStatusAction(form({ userId: target.id, status: "SUSPENDED" }));
    const updated = await db.user.findUnique({ where: { id: target.id } });
    expect(updated!.status).toBe("SUSPENDED");
    const sessions = await db.session.count({ where: { userId: target.id } });
    expect(sessions).toBe(0);
  });

  it("ADMIN setUserStatusAction on themself redirects with error=self and nothing changes", async () => {
    const admin = await createUser({ role: "ADMIN" });
    signIn(admin);
    const url = await expectRedirect(() => setUserStatusAction(form({ userId: admin.id, status: "SUSPENDED" })));
    expect(url).toBe("/admin/users?error=self");
    const updated = await db.user.findUnique({ where: { id: admin.id } });
    expect(updated!.status).toBe("ACTIVE");
  });

  it("ADMIN saveActivityAction with two steps creates activity with 2 ordered steps", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory("ACTIVITY");
    signIn(admin);
    const url = await expectRedirect(() => saveActivityAction({}, form({
      slug: "test-activity",
      title: "Test Activity",
      summary: "Summary",
      description: "Description",
      categoryId: category.id,
      estimatedMinutes: "20",
      difficulty: "EASY",
      reflectionQuestion: "What did you learn?",
      status: "PUBLISHED",
      stepTitle: ["Step A", "Step B"],
      stepBody: ["Do A", "Do B"],
      stepFor: ["BOTH", "OLDER"],
    })));
    expect(url).toBe("/admin/activities?notice=saved");
    const activity = await db.activity.findFirst({ where: { slug: "test-activity" }, include: { steps: { orderBy: { order: "asc" } } } });
    expect(activity).not.toBeNull();
    expect(activity!.steps).toHaveLength(2);
    expect(activity!.steps[0].title).toBe("Step A");
    expect(activity!.steps[0].stepFor).toBe("BOTH");
    expect(activity!.steps[1].title).toBe("Step B");
    expect(activity!.steps[1].stepFor).toBe("OLDER");
  });

  it("ADMIN saveActivityAction again with same id and three steps leaves exactly 3 steps", async () => {
    const admin = await createUser({ role: "ADMIN" });
    const category = await createCategory("ACTIVITY");
    signIn(admin);
    await expectRedirect(() => saveActivityAction({}, form({
      slug: "test-activity-2",
      title: "Test Activity 2",
      summary: "Summary",
      description: "Description",
      categoryId: category.id,
      estimatedMinutes: "20",
      difficulty: "EASY",
      reflectionQuestion: "What did you learn?",
      status: "PUBLISHED",
      stepTitle: ["Step 1", "Step 2"],
      stepBody: ["Do 1", "Do 2"],
      stepFor: ["BOTH", "BOTH"],
    })));
    const activity = await db.activity.findFirst({ where: { slug: "test-activity-2" } });
    expect(activity).not.toBeNull();
    await expectRedirect(() => saveActivityAction({}, form({
      id: activity!.id,
      slug: "test-activity-2",
      title: "Test Activity 2",
      summary: "Summary",
      description: "Description",
      categoryId: category.id,
      estimatedMinutes: "20",
      difficulty: "EASY",
      reflectionQuestion: "What did you learn?",
      status: "PUBLISHED",
      stepTitle: ["Step 1", "Step 2", "Step 3"],
      stepBody: ["Do 1", "Do 2", "Do 3"],
      stepFor: ["BOTH", "BOTH", "YOUNGER"],
    })));
    const updated = await db.activity.findUnique({ where: { id: activity!.id }, include: { steps: { orderBy: { order: "asc" } } } });
    expect(updated!.steps).toHaveLength(3);
  });
});