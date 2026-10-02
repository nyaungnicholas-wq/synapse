import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import {
  resetDb,
  seedPlans,
  createUser,
  form,
  expectRedirect } from "./helpers";
import { hashPassword } from "@/lib/crypto";
import {
  signupAction,
  loginAction,
  forgotPasswordAction,
  resetPasswordAction,
} from "@/actions/auth";
import { issueAuthToken, consumeAuthToken } from "@/lib/auth-tokens";

vi.mock("next/cache", async () => (await import("./helpers")).nextCacheMock);
vi.mock("next/navigation", async () => (await import("./helpers")).nextNavigationMock);
vi.mock("next/headers", async () => (await import("./helpers")).nextHeadersMock);
vi.mock("@/lib/session", async (importOriginal) => (await import("./helpers")).sessionMock(await importOriginal()));

describe("signupAction", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  it("creates user with normalized email and sends verification", async () => {
    const email = " Rose@Example.COM ";
    const password = "123456789012";
    const url = await expectRedirect(() =>
      signupAction({}, form({ email, password, next: "" }))
    );
    expect(url).toMatch(/^\/onboarding/);

    const user = await db.user.findUnique({ where: { email: "rose@example.com" } });
    expect(user).not.toBeNull();
    expect(user?.passwordHash).toMatch(/^scrypt\$/);
    expect(user?.passwordHash).not.toContain(password);

    const outbox = await db.emailOutbox.findMany({
      where: { to: "rose@example.com" },
    });
    expect(outbox).toHaveLength(1);
    expect(outbox[0].text).toContain("/verify-email?token=");

    const sessions = await db.session.findMany({ where: { userId: user!.id } });
    expect(sessions).toHaveLength(1);
  });

  it("rejects duplicate email", async () => {
    await db.user.create({
      data: {
        email: "existing@test.local",
        passwordHash: await hashPassword("any"),
      },
    });
    const result = await signupAction(
      {},
      form({ email: "existing@test.local", password: "123456789012", next: "" })
    );
    expect(result).toEqual({
      fieldErrors: { email: ["There is already an account with this email. Log in instead, or reset your password."] },
    });
    const users = await db.user.findMany();
    expect(users).toHaveLength(1);
  });

  it("rejects short password", async () => {
    const result = await signupAction(
      {},
      form({ email: "new@test.local", password: "short", next: "" })
    );
    expect(result.fieldErrors?.password?.[0]).toMatch(/at least 10 characters/);
    const users = await db.user.findMany();
    expect(users).toHaveLength(0);
  });
});

describe("loginAction", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  it("rejects wrong password", async () => {
    const user = await createUser({});
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword("correct123") }});
    await db.session.deleteMany();
    const result = await loginAction(
      {},
      form({ email: user.email, password: "wrong", next: "" })
    );
    expect(result).toEqual({ error: "That email and password do not match. Please check them and try again." });
    const sessions = await db.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(0);
  });

  it("redirects to dashboard with correct password", async () => {
    const user = await createUser({});
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword("correct123") }});
    await db.session.deleteMany();
    const url = await expectRedirect(() =>
      loginAction({}, form({ email: user.email, password: "correct123", next: "" }))
    );
    expect(url).toBe("/dashboard");
    const sessions = await db.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(1);
  });

  it("honours next path", async () => {
    const user = await createUser({});
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword("correct123") }});
    await db.session.deleteMany();
    const url = await expectRedirect(() =>
      loginAction({}, form({ email: user.email, password: "correct123", next: "/invite/ABCD-EFGH" }))
    );
    expect(url).toBe("/invite/ABCD-EFGH");
  });

  it("blocks evil next path", async () => {
    const user = await createUser({});
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword("correct123") }});
    await db.session.deleteMany();
    const url = await expectRedirect(() =>
      loginAction({}, form({ email: user.email, password: "correct123", next: "//evil.com" }))
    );
    expect(url).toBe("/dashboard");
  });

  it("rejects suspended user", async () => {
    const user = await createUser({});
    await db.user.update({ where: { id: user.id }, data: { status: "SUSPENDED", passwordHash: await hashPassword("any") }});
    await db.session.deleteMany();
    const result = await loginAction(
      {},
      form({ email: user.email, password: "any", next: "" })
    );
    expect(result).toEqual({ error: "That email and password do not match. Please check them and try again." });
    const sessions = await db.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(0);
  });
});

describe("forgotPasswordAction", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  it("does nothing for unknown email", async () => {
    const result = await forgotPasswordAction(
      {},
      form({ email: "unknown@test.local" })
    );
    expect(result).toEqual({
      ok: true,
      message: "If there is an account for that email, we have sent a link to reset the password. It works for one hour.",
    });
    const outbox = await db.emailOutbox.count();
    expect(outbox).toBe(0);
    const tokens = await db.authToken.count();
    expect(tokens).toBe(0);
  });

  it("sends reset token for known email", async () => {
    const user = await createUser({});
    const result = await forgotPasswordAction(
      {},
      form({ email: user.email })
    );
    expect(result).toEqual({
      ok: true,
      message: "If there is an account for that email, we have sent a link to reset the password. It works for one hour.",
    });
    const outbox = await db.emailOutbox.findMany({ where: { to: user.email } });
    expect(outbox).toHaveLength(1);
    expect(outbox[0].text).toContain("/reset-password?token=");
    const tokens = await db.authToken.findMany({
      where: { userId: user.id, type: "PASSWORD_RESET", usedAt: null },
    });
    expect(tokens).toHaveLength(1);
  });
});

describe("resetPasswordAction", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  it("resets password and invalidates other sessions", async () => {
    const user = await createUser({});
    const hash = await hashPassword("oldPassword");
    await db.user.update({ where: { id: user.id }, data: { passwordHash: hash } });
    await db.session.createMany({
      data: [
        { tokenHash: "a", userId: user.id, expiresAt: new Date(Date.now() + 3600000) },
        { tokenHash: "b", userId: user.id, expiresAt: new Date(Date.now() + 7200000) },
      ],
    });
    const token = await issueAuthToken(user.id, "PASSWORD_RESET");
    const url = await expectRedirect(() =>
      resetPasswordAction(
        {},
        form({ token, password: "newPassword123", confirm: "newPassword123" })
      )
    );
    expect(url).toBe("/dashboard?notice=password-reset");

    const updated = await db.user.findUnique({ where: { id: user.id } });
    expect(updated?.passwordHash).not.toBe(hash);
    const { verifyPassword } = await import("@/lib/crypto");
    expect(await verifyPassword("newPassword123", updated!.passwordHash)).toBe(true);

    const sessions = await db.session.findMany({ where: { userId: user.id } });
    expect(sessions).toHaveLength(1);

    const second = await resetPasswordAction(
      {},
      form({ token, password: "newPassword123", confirm: "newPassword123" })
    );
    expect(second).toEqual({ error: "This reset link has expired or was already used. Please ask for a new one." });
  });

  it("rejects mismatched passwords", async () => {
    const user = await createUser({});
    const token = await issueAuthToken(user.id, "PASSWORD_RESET");
    const result = await resetPasswordAction(
      {},
      form({ token, password: "a-long-new-password", confirm: "a-different-password" })
    );
    expect(result.fieldErrors?.confirm?.[0]).toMatch(/do not match/);
  });
});

describe("consumeAuthToken", () => {
  beforeEach(async () => {
    await resetDb();
    await seedPlans();
  });

  it("returns null for wrong token type", async () => {
    const user = await createUser({});
    const token = await issueAuthToken(user.id, "EMAIL_VERIFY");
    const id = await consumeAuthToken(token, "PASSWORD_RESET");
    expect(id).toBeNull();
  });

  it("returns null after expiry", async () => {
    const user = await createUser({});
    const token = await issueAuthToken(user.id, "EMAIL_VERIFY");
    await db.authToken.updateMany({
      where: { userId: user.id, type: "EMAIL_VERIFY" },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const id = await consumeAuthToken(token, "EMAIL_VERIFY");
    expect(id).toBeNull();
  });

  it("second token invalidates first", async () => {
    const user = await createUser({});
    const token1 = await issueAuthToken(user.id, "EMAIL_VERIFY");
    const token2 = await issueAuthToken(user.id, "EMAIL_VERIFY");
    const id1 = await consumeAuthToken(token1, "EMAIL_VERIFY");
    const id2 = await consumeAuthToken(token2, "EMAIL_VERIFY");
    expect(id1).toBeNull();
    expect(id2).toBe(user.id);
  });
});